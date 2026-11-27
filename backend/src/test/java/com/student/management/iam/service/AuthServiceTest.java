package com.student.management.iam.service;

import com.student.management.applications.dto.ApplicationEntitlementDto;
import com.student.management.applications.dto.UserApplicationEntitlementResponse;
import com.student.management.applications.service.ApplicationEntitlementService;
import com.student.management.exception.BadRequestException;
import com.student.management.exception.ForbiddenException;
import com.student.management.iam.dto.request.LoginRequest;
import com.student.management.iam.dto.request.RefreshTokenRequest;
import com.student.management.iam.dto.response.AuthTokenResponse;
import com.student.management.iam.repository.MembershipRepository;
import com.student.management.iam.security.entity.RefreshToken;
import com.student.management.iam.security.jwt.JwtTokenProvider;
import com.student.management.iam.security.repository.RefreshTokenRepository;
import com.student.management.iam.service.impl.AuthServiceImpl;
import com.student.management.iam.user.entity.User;
import com.student.management.iam.user.repository.UserRepository;
import com.student.management.platform.repository.OrganizationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.ZonedDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private OtpService otpService;

    @Mock
    private MembershipRepository membershipRepository;

    @Mock
    private OrganizationRepository organizationRepository;

    @Mock
    private ApplicationEntitlementService applicationEntitlementService;

    @InjectMocks
    private AuthServiceImpl authService;

    private User sampleUser;

    @BeforeEach
    void setUp() {
        sampleUser = User.builder()
                .id(100L)
                .username("testteacher")
                .email("teacher@school.edu")
                .fullName("Test Teacher")
                .role("TEACHER")
                .isSuperAdmin(false)
                .build();
    }

    private void stubEntitlements() {
        UserApplicationEntitlementResponse mockEntitlement = UserApplicationEntitlementResponse.builder()
                .userId(100L)
                .userRole("TEACHER")
                .effectivePermissions(java.util.Set.of("STUDENT_VIEW"))
                .applications(List.of(
                        ApplicationEntitlementDto.builder().code("STUDENT_MANAGEMENT").isAuthorized(true).build()
                ))
                .build();
        lenient().when(applicationEntitlementService.getUserEntitlements(anyLong(), any())).thenReturn(mockEntitlement);
        lenient().when(jwtTokenProvider.generateAccessToken(anyLong(), anyString(), anyString(), anyString(), any(), any()))
                .thenReturn("mock-access-token");
        lenient().when(jwtTokenProvider.getAccessTokenExpirationMs()).thenReturn(900000L);
    }

    @Test
    @DisplayName("Gap 1 Test: Standard token rotation marks old token revoked and issues replacement")
    void refreshToken_standardRotation_success() {
        RefreshToken initialToken = RefreshToken.builder()
                .id(1L)
                .userId(100L)
                .tokenHash("initial-token-hash")
                .expiresAt(ZonedDateTime.now().plusDays(7))
                .isRevoked(false)
                .build();

        when(refreshTokenRepository.findByTokenHash("initial-token-hash")).thenReturn(Optional.of(initialToken));
        when(userRepository.findById(100L)).thenReturn(Optional.of(sampleUser));
        when(jwtTokenProvider.generateSecureRandomToken()).thenReturn("replacement-token-hash");
        when(jwtTokenProvider.getRefreshTokenExpirationMs()).thenReturn(604800000L);
        stubEntitlements();

        RefreshTokenRequest request = new RefreshTokenRequest();
        request.setRefreshToken("initial-token-hash");

        AuthTokenResponse response = authService.refreshToken(request);

        assertThat(response).isNotNull();
        assertThat(response.getAccessToken()).isEqualTo("mock-access-token");
        assertThat(response.getRefreshToken()).isEqualTo("replacement-token-hash");

        // Verify old token was marked revoked and replacement set
        assertThat(initialToken.isRevoked()).isTrue();
        assertThat(initialToken.getReplacedByToken()).isEqualTo("replacement-token-hash");
        verify(refreshTokenRepository, times(2)).save(any(RefreshToken.class));
    }

    @Test
    @DisplayName("Gap 1 Test: Multi-tab race condition within 30s grace window returns replaced token safely")
    void refreshToken_withinGracePeriod_returnsReplacementWithoutError() {
        RefreshToken revokedToken = RefreshToken.builder()
                .id(1L)
                .userId(100L)
                .tokenHash("used-token-hash")
                .expiresAt(ZonedDateTime.now().plusDays(7))
                .isRevoked(true)
                .revokedAt(ZonedDateTime.now().minusSeconds(5)) // Revoked 5 seconds ago (within 30s)
                .replacedByToken("replacement-token-hash")
                .build();

        when(refreshTokenRepository.findByTokenHash("used-token-hash")).thenReturn(Optional.of(revokedToken));
        when(userRepository.findById(100L)).thenReturn(Optional.of(sampleUser));
        stubEntitlements();

        RefreshTokenRequest request = new RefreshTokenRequest();
        request.setRefreshToken("used-token-hash");

        AuthTokenResponse response = authService.refreshToken(request);

        assertThat(response).isNotNull();
        assertThat(response.getAccessToken()).isEqualTo("mock-access-token");
        assertThat(response.getRefreshToken()).isEqualTo("replacement-token-hash");

        // Must NOT invalidate user sessions
        verify(refreshTokenRepository, never()).deleteAllByUserId(anyLong());
    }

    @Test
    @DisplayName("Gap 1 Test: Replaying revoked token after grace window triggers token theft detection and revokes all sessions")
    void refreshToken_afterGracePeriod_theftDetected_revokesAllSessions() {
        RefreshToken stolenToken = RefreshToken.builder()
                .id(1L)
                .userId(100L)
                .tokenHash("stolen-token-hash")
                .expiresAt(ZonedDateTime.now().plusDays(7))
                .isRevoked(true)
                .revokedAt(ZonedDateTime.now().minusSeconds(45)) // Revoked 45 seconds ago (outside 30s)
                .replacedByToken("replacement-token-hash")
                .build();

        when(refreshTokenRepository.findByTokenHash("stolen-token-hash")).thenReturn(Optional.of(stolenToken));

        RefreshTokenRequest request = new RefreshTokenRequest();
        request.setRefreshToken("stolen-token-hash");

        assertThatThrownBy(() -> authService.refreshToken(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Suspicious token reuse detected");

        // Verify all sessions for this user were immediately terminated
        verify(refreshTokenRepository, times(1)).deleteAllByUserId(100L);
    }

    @Test
    @DisplayName("Scope Test: Regular user attempting login with authScope PLATFORM is rejected with 403 Forbidden")
    void login_platformScope_regularUser_throwsForbiddenException() {
        LoginRequest request = LoginRequest.builder()
                .usernameOrEmail("testteacher")
                .password("password123")
                .authScope("PLATFORM")
                .build();

        when(userRepository.findByUsernameOrEmail("testteacher", "testteacher")).thenReturn(Optional.of(sampleUser));
        when(passwordEncoder.matches("password123", sampleUser.getPassword())).thenReturn(true);

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("strictly reserved for Platform Super Administrators");

        // Verify zero tokens were generated
        verify(jwtTokenProvider, never()).generateAccessToken(any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("Scope Test: SuperAdmin attempting login with authScope PLATFORM succeeds")
    void login_platformScope_superAdmin_succeeds() {
        User superAdminUser = User.builder()
                .id(1L)
                .username("superadmin")
                .email("superadmin@platform.internal")
                .fullName("Platform Super Admin")
                .role("PLATFORM_SUPER_ADMIN")
                .isSuperAdmin(true)
                .password("encoded_pass")
                .build();

        LoginRequest request = LoginRequest.builder()
                .usernameOrEmail("superadmin")
                .password("supersecret")
                .authScope("PLATFORM")
                .build();

        when(userRepository.findByUsernameOrEmail("superadmin", "superadmin")).thenReturn(Optional.of(superAdminUser));
        when(passwordEncoder.matches("supersecret", "encoded_pass")).thenReturn(true);
        when(jwtTokenProvider.generateAccessToken(anyLong(), anyString(), anyString(), anyString(), any(), any()))
                .thenReturn("super-access-token");
        when(jwtTokenProvider.generateSecureRandomToken()).thenReturn("super-refresh-token");
        when(jwtTokenProvider.getRefreshTokenExpirationMs()).thenReturn(604800000L);
        when(jwtTokenProvider.getAccessTokenExpirationMs()).thenReturn(900000L);

        UserApplicationEntitlementResponse mockEntitlement = UserApplicationEntitlementResponse.builder()
                .userId(1L)
                .userRole("PLATFORM_SUPER_ADMIN")
                .effectivePermissions(java.util.Set.of("PLATFORM_SUPER_ADMIN"))
                .applications(Collections.emptyList())
                .build();
        when(applicationEntitlementService.getUserEntitlements(eq(1L), any())).thenReturn(mockEntitlement);

        AuthTokenResponse response = authService.login(request);

        assertThat(response).isNotNull();
        assertThat(response.getAccessToken()).isEqualTo("super-access-token");
        assertThat(response.getIsSuperAdmin()).isTrue();
        verify(refreshTokenRepository, times(1)).save(any(RefreshToken.class));
    }
}
