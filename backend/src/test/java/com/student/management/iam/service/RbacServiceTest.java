package com.student.management.iam.service;

import com.student.management.exception.DuplicateResourceException;
import com.student.management.exception.ResourceNotFoundException;
import com.student.management.iam.dto.request.CreateStaffUserRequest;
import com.student.management.iam.dto.request.UpdateMembershipStatusRequest;
import com.student.management.iam.dto.response.MemberPermissionSummaryResponse;
import com.student.management.iam.entity.*;
import com.student.management.iam.enums.MembershipStatus;
import com.student.management.iam.mapper.RbacMapper;
import com.student.management.iam.repository.*;
import com.student.management.iam.service.impl.RbacServiceImpl;
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

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RbacServiceTest {

    @Mock
    private PermissionRepository permissionRepository;
    @Mock
    private RoleRepository roleRepository;
    @Mock
    private RolePermissionRepository rolePermissionRepository;
    @Mock
    private SchoolGroupRepository schoolGroupRepository;
    @Mock
    private MembershipRepository membershipRepository;
    @Mock
    private MembershipGroupMappingRepository membershipGroupMappingRepository;
    @Mock
    private GroupRoleMappingRepository groupRoleMappingRepository;
    @Mock
    private MemberRoleMappingRepository memberRoleMappingRepository;
    @Mock
    private RbacMapper rbacMapper;
    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private OtpService otpService;
    @Mock
    private OrganizationRepository organizationRepository;

    @InjectMocks
    private RbacServiceImpl rbacService;

    private final Long testOrgId = 10L;

    @BeforeEach
    void setUp() {
    }

    @Test
    @DisplayName("Mode A (Instant Provisioning): Provisions user and sets ACTIVE membership with direct password")
    void testProvisionStaffUser_InstantSuccess() {
        CreateStaffUserRequest request = CreateStaffUserRequest.builder()
                .fullName("Dr. Vikram Batra")
                .email("vikram@school.edu")
                .username("vikram_b")
                .provisionMode("INSTANT")
                .password("Secr3t123!")
                .build();

        when(organizationRepository.existsById(testOrgId)).thenReturn(true);
        when(userRepository.findByEmailIgnoreCase("vikram@school.edu")).thenReturn(Optional.empty());
        when(userRepository.existsByUsername("vikram_b")).thenReturn(false);
        when(passwordEncoder.encode("Secr3t123!")).thenReturn("encoded_pass");

        User savedUser = User.builder()
                .id(101L)
                .username("vikram_b")
                .email("vikram@school.edu")
                .fullName("Dr. Vikram Batra")
                .password("encoded_pass")
                .role("STAFF")
                .build();
        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        Membership savedMembership = Membership.builder()
                .id(501L)
                .userId(101L)
                .organizationId(testOrgId)
                .status(MembershipStatus.ACTIVE)
                .build();
        when(membershipRepository.save(any(Membership.class))).thenReturn(savedMembership);
        when(membershipRepository.findById(501L)).thenReturn(Optional.of(savedMembership));
        when(userRepository.findById(101L)).thenReturn(Optional.of(savedUser));

        MemberPermissionSummaryResponse response = rbacService.provisionStaffUser(testOrgId, request);

        assertNotNull(response);
        assertEquals(501L, response.getMembershipId());
        assertEquals("Dr. Vikram Batra", response.getFullName());
        assertEquals("vikram@school.edu", response.getEmail());
        assertEquals(MembershipStatus.ACTIVE, response.getStatus());

        // Verify OTP was NOT dispatched for Instant mode
        verify(otpService, never()).generateAndSendOtp(anyString(), anyString());
    }

    @Test
    @DisplayName("Mode B (Email Invite): Dispatches OTP invitation handshake and creates membership")
    void testProvisionStaffUser_EmailInviteSuccess() {
        CreateStaffUserRequest request = CreateStaffUserRequest.builder()
                .fullName("Ananya Verma")
                .email("ananya@school.edu")
                .provisionMode("EMAIL_INVITE")
                .build();

        when(organizationRepository.existsById(testOrgId)).thenReturn(true);
        when(userRepository.findByEmailIgnoreCase("ananya@school.edu")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("random_temp_encoded");

        User savedUser = User.builder()
                .id(102L)
                .username("ananya")
                .email("ananya@school.edu")
                .fullName("Ananya Verma")
                .password("random_temp_encoded")
                .role("STAFF")
                .build();
        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        Membership savedMembership = Membership.builder()
                .id(502L)
                .userId(102L)
                .organizationId(testOrgId)
                .status(MembershipStatus.ACTIVE)
                .build();
        when(membershipRepository.save(any(Membership.class))).thenReturn(savedMembership);
        when(membershipRepository.findById(502L)).thenReturn(Optional.of(savedMembership));
        when(userRepository.findById(102L)).thenReturn(Optional.of(savedUser));

        MemberPermissionSummaryResponse response = rbacService.provisionStaffUser(testOrgId, request);

        assertNotNull(response);
        assertEquals(502L, response.getMembershipId());

        // Verify OTP WAS dispatched for Email Invite mode
        verify(otpService, times(1)).generateAndSendOtp("ananya@school.edu", "ONBOARDING_SETUP");
    }

    @Test
    @DisplayName("Duplicate prevention: Throws DuplicateResourceException if user already belongs to tenant")
    void testProvisionStaffUser_DuplicateMembership() {
        CreateStaffUserRequest request = CreateStaffUserRequest.builder()
                .fullName("Existing User")
                .email("existing@school.edu")
                .provisionMode("INSTANT")
                .password("Password123")
                .build();

        User existingUser = User.builder()
                .id(103L)
                .email("existing@school.edu")
                .build();

        when(organizationRepository.existsById(testOrgId)).thenReturn(true);
        when(userRepository.findByEmailIgnoreCase("existing@school.edu")).thenReturn(Optional.of(existingUser));
        when(membershipRepository.findByUserIdAndOrganizationId(103L, testOrgId))
                .thenReturn(Optional.of(Membership.builder().id(999L).build()));

        assertThrows(DuplicateResourceException.class, () -> rbacService.provisionStaffUser(testOrgId, request));
    }

    @Test
    @DisplayName("Anti-enumeration: updateMembershipStatus returns 404 if membership belongs to a different tenant")
    void testUpdateMembershipStatus_CrossTenantAntiEnumeration() {
        Long foreignMembershipId = 888L;
        UpdateMembershipStatusRequest request = new UpdateMembershipStatusRequest(MembershipStatus.SUSPENDED);

        // findByIdAndOrganizationId returns empty when membership is from another tenant
        when(membershipRepository.findByIdAndOrganizationId(foreignMembershipId, testOrgId))
                .thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                rbacService.updateMembershipStatus(testOrgId, foreignMembershipId, request)
        );
    }

    @Test
    @DisplayName("Status update: Successfully changes membership status from ACTIVE to SUSPENDED")
    void testUpdateMembershipStatus_Success() {
        Long memberId = 505L;
        Membership existingMembership = Membership.builder()
                .id(memberId)
                .userId(105L)
                .organizationId(testOrgId)
                .status(MembershipStatus.ACTIVE)
                .build();

        User user = User.builder().id(105L).username("testuser").fullName("Test User").email("t@school.edu").build();

        when(membershipRepository.findByIdAndOrganizationId(memberId, testOrgId))
                .thenReturn(Optional.of(existingMembership));
        when(membershipRepository.findById(memberId)).thenReturn(Optional.of(existingMembership));
        when(userRepository.findById(105L)).thenReturn(Optional.of(user));

        UpdateMembershipStatusRequest request = new UpdateMembershipStatusRequest(MembershipStatus.SUSPENDED);
        MemberPermissionSummaryResponse result = rbacService.updateMembershipStatus(testOrgId, memberId, request);

        assertNotNull(result);
        assertEquals(MembershipStatus.SUSPENDED, existingMembership.getStatus());
        verify(membershipRepository, times(1)).save(existingMembership);
    }
}

