package com.student.management.iam.service.impl;

import com.student.management.exception.BadRequestException;
import com.student.management.exception.ResourceNotFoundException;
import com.student.management.iam.dto.request.*;
import com.student.management.iam.dto.response.AuthTokenResponse;
import com.student.management.iam.dto.response.OtpVerificationResponse;
import com.student.management.iam.entity.Membership;
import com.student.management.iam.repository.MembershipRepository;
import com.student.management.iam.security.entity.RefreshToken;
import com.student.management.iam.security.jwt.JwtTokenProvider;
import com.student.management.iam.security.repository.RefreshTokenRepository;
import com.student.management.iam.service.AuthService;
import com.student.management.iam.service.OtpService;
import com.student.management.iam.user.entity.User;
import com.student.management.iam.user.repository.UserRepository;
import com.student.management.platform.entity.Organization;
import com.student.management.platform.repository.OrganizationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Concrete implementation of AuthService managing credentials, token lifecycle, and secure password reset.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;
    private final OtpService otpService;
    private final MembershipRepository membershipRepository;
    private final OrganizationRepository organizationRepository;
    private final com.student.management.applications.service.ApplicationEntitlementService applicationEntitlementService;

    private record OrganizationContext(Long id, String slug, String name) {}

    private OrganizationContext resolveUserOrganization(User user) {
        boolean isSuperAdmin = Boolean.TRUE.equals(user.getIsSuperAdmin())
                || "PLATFORM_SUPER_ADMIN".equalsIgnoreCase(user.getRole())
                || "superadmin".equalsIgnoreCase(user.getUsername());

        if (isSuperAdmin) {
            return new OrganizationContext(null, null, null);
        }

        List<Membership> memberships = membershipRepository.findAllByUserId(user.getId());
        if (!memberships.isEmpty()) {
            Membership primaryMembership = memberships.get(0);
            Long orgId = primaryMembership.getOrganizationId();
            if (orgId != null) {
                Organization org = organizationRepository.findById(orgId).orElse(null);
                if (org != null) {
                    return new OrganizationContext(org.getId(), org.getSlug(), org.getName());
                }
            }
        }
        return new OrganizationContext(null, null, null);
    }

    @Override
    @Transactional
    public AuthTokenResponse login(LoginRequest request) {
        log.info("Authentication attempt for user identifier: {}", request.getUsernameOrEmail());

        User user = userRepository.findByUsernameOrEmail(request.getUsernameOrEmail(), request.getUsernameOrEmail())
                .orElseThrow(() -> new BadRequestException("Invalid username or password."));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            log.warn("Authentication failed: invalid password for user '{}'", user.getUsername());
            throw new BadRequestException("Invalid username or password.");
        }

        OrganizationContext orgCtx = resolveUserOrganization(user);
        Map<String, Object> extraClaims = new HashMap<>();
        if (orgCtx.id() != null) {
            extraClaims.put("org_id", orgCtx.id());
        }
        if (orgCtx.slug() != null) {
            extraClaims.put("org_slug", orgCtx.slug());
        }

        String accessToken = jwtTokenProvider.generateAccessToken(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole(),
                user.getIsSuperAdmin(),
                extraClaims
        );

        String refreshTokenRaw = jwtTokenProvider.generateSecureRandomToken();
        ZonedDateTime refreshExpiry = ZonedDateTime.now().plusSeconds(jwtTokenProvider.getRefreshTokenExpirationMs() / 1000);

        RefreshToken refreshTokenEntity = RefreshToken.builder()
                .userId(user.getId())
                .tokenHash(refreshTokenRaw)
                .expiresAt(refreshExpiry)
                .build();
        refreshTokenRepository.save(refreshTokenEntity);

        log.info("User '{}' authenticated successfully. Organization context: id={}, slug={}",
                user.getUsername(), orgCtx.id(), orgCtx.slug());

        var entitlement = applicationEntitlementService.getUserEntitlements(user.getId(), orgCtx.id());
        java.util.List<String> authorizedApps = entitlement.getApplications().stream()
                .filter(a -> Boolean.TRUE.equals(a.getIsAuthorized()))
                .map(com.student.management.applications.dto.ApplicationEntitlementDto::getCode)
                .collect(java.util.stream.Collectors.toList());

        return AuthTokenResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshTokenRaw)
                .tokenType("Bearer")
                .expiresInMs(jwtTokenProvider.getAccessTokenExpirationMs())
                .userId(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .isSuperAdmin(user.getIsSuperAdmin())
                .organizationId(orgCtx.id())
                .organizationSlug(orgCtx.slug())
                .organizationName(orgCtx.name())
                .authorizedApplications(authorizedApps)
                .permissions(entitlement.getEffectivePermissions())
                .build();
    }

    @Override
    @Transactional
    public AuthTokenResponse refreshToken(RefreshTokenRequest request) {
        log.info("Processing token rotation for refresh token");

        RefreshToken storedToken = refreshTokenRepository.findByTokenHash(request.getRefreshToken())
                .orElseThrow(() -> new BadRequestException("Invalid or revoked refresh token."));

        if (storedToken.isExpired()) {
            refreshTokenRepository.delete(storedToken);
            throw new BadRequestException("Refresh token has expired. Please login again.");
        }

        User user = userRepository.findById(storedToken.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User associated with refresh token not found."));

        OrganizationContext orgCtx = resolveUserOrganization(user);
        Map<String, Object> extraClaims = new HashMap<>();
        if (orgCtx.id() != null) {
            extraClaims.put("org_id", orgCtx.id());
        }
        if (orgCtx.slug() != null) {
            extraClaims.put("org_slug", orgCtx.slug());
        }

        String newAccessToken = jwtTokenProvider.generateAccessToken(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole(),
                user.getIsSuperAdmin(),
                extraClaims
        );

        // 1. Delete the old refresh token (Token Rotation)
        refreshTokenRepository.delete(storedToken);

        // 2. Issue a brand new Refresh Token
        String newRefreshTokenRaw = jwtTokenProvider.generateSecureRandomToken();
        ZonedDateTime refreshExpiry = ZonedDateTime.now().plusSeconds(jwtTokenProvider.getRefreshTokenExpirationMs() / 1000);
        RefreshToken newRefreshTokenEntity = RefreshToken.builder()
                .userId(user.getId())
                .tokenHash(newRefreshTokenRaw)
                .expiresAt(refreshExpiry)
                .build();
        refreshTokenRepository.save(newRefreshTokenEntity);

        log.info("Successfully rotated refresh token for user '{}' with organization id={}", user.getUsername(), orgCtx.id());

        var entitlement = applicationEntitlementService.getUserEntitlements(user.getId(), orgCtx.id());
        java.util.List<String> authorizedApps = entitlement.getApplications().stream()
                .filter(a -> Boolean.TRUE.equals(a.getIsAuthorized()))
                .map(com.student.management.applications.dto.ApplicationEntitlementDto::getCode)
                .collect(java.util.stream.Collectors.toList());

        return AuthTokenResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshTokenRaw)
                .tokenType("Bearer")
                .expiresInMs(jwtTokenProvider.getAccessTokenExpirationMs())
                .userId(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .isSuperAdmin(user.getIsSuperAdmin())
                .organizationId(orgCtx.id())
                .organizationSlug(orgCtx.slug())
                .organizationName(orgCtx.name())
                .authorizedApplications(authorizedApps)
                .permissions(entitlement.getEffectivePermissions())
                .build();
    }

    @Override
    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        String cleanEmail = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";
        log.info("Received forgot password request for email: {}", cleanEmail);

        User user = userRepository.findByEmailIgnoreCase(cleanEmail)
                .orElseThrow(() -> new ResourceNotFoundException("No account registered with email: " + cleanEmail));

        String purpose = (request.getPurpose() != null && !request.getPurpose().isBlank())
                ? request.getPurpose().trim()
                : "FORGOT_PASSWORD";

        otpService.generateAndSendOtp(user.getEmail(), purpose);
    }

    @Override
    @Transactional
    public OtpVerificationResponse verifyOtp(VerifyOtpRequest request) {
        String cleanEmail = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";
        String cleanOtp = request.getOtpCode() != null ? request.getOtpCode().replaceAll("\\s+", "").trim() : "";
        String purpose = (request.getPurpose() != null && !request.getPurpose().isBlank())
                ? request.getPurpose().trim()
                : "FORGOT_PASSWORD";

        log.info("Verifying OTP for password reset on email: {} with purpose: {}", cleanEmail, purpose);

        boolean isVerified = otpService.verifyOtp(cleanEmail, cleanOtp, purpose);
        if (!isVerified) {
            throw new BadRequestException("OTP verification failed.");
        }

        String resetToken = jwtTokenProvider.generatePasswordResetToken(cleanEmail);

        return OtpVerificationResponse.builder()
                .email(cleanEmail)
                .verified(true)
                .resetToken(resetToken)
                .message("OTP verified successfully. You may now reset your password.")
                .build();
    }

    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        String cleanEmail = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";
        log.info("Executing password reset for email: {}", cleanEmail);

        if (!jwtTokenProvider.validateToken(request.getResetToken())) {
            throw new BadRequestException("Invalid or expired password reset token.");
        }

        String tokenEmail = jwtTokenProvider.getUsernameFromToken(request.getResetToken());
        if (!cleanEmail.equalsIgnoreCase(tokenEmail)) {
            throw new BadRequestException("Reset token does not match the specified email address.");
        }

        User user = userRepository.findByEmailIgnoreCase(cleanEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + cleanEmail));

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        // Invalidate all active refresh tokens to force re-login across sessions
        refreshTokenRepository.deleteAllByUserId(user.getId());
        log.info("Password successfully reset for user '{}'. All active sessions invalidated.", user.getUsername());
    }

    @Override
    @Transactional
    public void logout(String refreshToken) {
        if (refreshToken != null && !refreshToken.isBlank()) {
            refreshTokenRepository.findByTokenHash(refreshToken).ifPresent(refreshTokenRepository::delete);
            log.info("Revoked refresh token upon user logout.");
        }
    }
}
