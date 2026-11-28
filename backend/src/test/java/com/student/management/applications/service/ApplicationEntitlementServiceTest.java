package com.student.management.applications.service;

import com.student.management.applications.dto.ApplicationEntitlementDto;
import com.student.management.applications.dto.UserApplicationEntitlementResponse;
import com.student.management.applications.service.impl.ApplicationEntitlementServiceImpl;
import com.student.management.iam.dto.response.MemberPermissionSummaryResponse;
import com.student.management.iam.entity.Membership;
import com.student.management.iam.enums.MembershipStatus;
import com.student.management.iam.repository.MembershipRepository;
import com.student.management.iam.service.RbacService;
import com.student.management.iam.user.entity.User;
import com.student.management.iam.user.repository.UserRepository;
import com.student.management.platform.entity.Organization;
import com.student.management.platform.enums.OrganizationStatus;
import com.student.management.platform.repository.OrganizationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ApplicationEntitlementServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private OrganizationRepository organizationRepository;

    @Mock
    private MembershipRepository membershipRepository;

    @Mock
    private RbacService rbacService;

    @InjectMocks
    private ApplicationEntitlementServiceImpl entitlementService;

    private Organization schoolA;
    private Organization schoolB;
    private User principalUser;
    private User teacherUser;

    @BeforeEach
    void setUp() {
        schoolA = Organization.builder()
                .id(1L)
                .name("Delhi Public School")
                .slug("dps")
                .planId(1L)
                .status(OrganizationStatus.ACTIVE)
                .contactEmail("admin@dps.edu")
                .enabledApplications(new HashSet<>(Arrays.asList("STUDENT_MANAGEMENT", "IAM_GOVERNANCE", "ATTENDANCE")))
                .build();

        schoolB = Organization.builder()
                .id(2L)
                .name("St. Xavier High School")
                .slug("xaviers")
                .planId(1L)
                .status(OrganizationStatus.ACTIVE)
                .contactEmail("admin@xaviers.edu")
                .enabledApplications(new HashSet<>(Collections.singletonList("STUDENT_MANAGEMENT"))) // Attendance & Finance DISABLED
                .build();

        principalUser = User.builder()
                .id(101L)
                .username("principal_dps")
                .email("principal@dps.edu")
                .fullName("Dr. Meenakshi Sundaram")
                .role("PRINCIPAL")
                .isSuperAdmin(false)
                .build();

        teacherUser = User.builder()
                .id(102L)
                .username("teacher_rajesh")
                .email("rajesh@dps.edu")
                .fullName("Rajesh Sharma")
                .role("TEACHER")
                .isSuperAdmin(false)
                .build();
    }

    @Test
    @DisplayName("Tier 1 & 2: School Head sees all modules enabled by their school")
    void testSchoolHeadSeesAllEnabledSchoolModules() {
        when(userRepository.findById(101L)).thenReturn(Optional.of(principalUser));
        when(organizationRepository.findById(1L)).thenReturn(Optional.of(schoolA));

        Membership membership = Membership.builder()
                .id(501L)
                .userId(101L)
                .organizationId(1L)
                .status(MembershipStatus.ACTIVE)
                .build();
        when(membershipRepository.findByUserIdAndOrganizationId(101L, 1L)).thenReturn(Optional.of(membership));

        MemberPermissionSummaryResponse summary = MemberPermissionSummaryResponse.builder()
                .membershipId(501L)
                .effectivePermissions(new HashSet<>(Arrays.asList("rbac:manage", "student:read", "attendance:mark")))
                .directRoles(Collections.singletonList("PRINCIPAL"))
                .build();
        when(rbacService.getMemberPermissionSummary(501L)).thenReturn(summary);

        UserApplicationEntitlementResponse response = entitlementService.getUserEntitlements(101L, 1L);

        assertNotNull(response);
        assertEquals(1L, response.getTenantId());

        Map<String, ApplicationEntitlementDto> appMap = new HashMap<>();
        response.getApplications().forEach(a -> appMap.put(a.getCode(), a));

        // School A has STUDENT_MANAGEMENT, IAM_GOVERNANCE, ATTENDANCE enabled
        assertTrue(appMap.get("STUDENT_MANAGEMENT").getIsAuthorized(), "Student Management should be authorized for Principal");
        assertTrue(appMap.get("IAM_GOVERNANCE").getIsAuthorized(), "IAM should be authorized for Principal");
        assertTrue(appMap.get("ATTENDANCE").getIsAuthorized(), "Attendance should be authorized for Principal");

        // FEES_FINANCE was NOT in School A's enabledApplications -> Must NOT be authorized even for Principal!
        assertFalse(appMap.get("FEES_FINANCE").getIsAuthorized(), "Fees & Finance was disabled by school, must not be authorized");
    }

    @Test
    @DisplayName("Tier 2 Gating: When School Head disables a module, staff cannot see it even if they have the role permission")
    void testModuleDisabledBySchoolHeadIsExcludedForStaff() {
        // Teacher has permission 'attendance:mark'
        when(userRepository.findById(102L)).thenReturn(Optional.of(teacherUser));
        // BUT School B has ATTENDANCE disabled in enabledApplications!
        when(organizationRepository.findById(2L)).thenReturn(Optional.of(schoolB));

        Membership membership = Membership.builder()
                .id(502L)
                .userId(102L)
                .organizationId(2L)
                .status(MembershipStatus.ACTIVE)
                .build();
        when(membershipRepository.findByUserIdAndOrganizationId(102L, 2L)).thenReturn(Optional.of(membership));

        MemberPermissionSummaryResponse summary = MemberPermissionSummaryResponse.builder()
                .membershipId(502L)
                .effectivePermissions(new HashSet<>(Arrays.asList("student:read", "attendance:mark")))
                .directRoles(Collections.singletonList("TEACHER"))
                .build();
        when(rbacService.getMemberPermissionSummary(502L)).thenReturn(summary);

        UserApplicationEntitlementResponse response = entitlementService.getUserEntitlements(102L, 2L);

        Map<String, ApplicationEntitlementDto> appMap = new HashMap<>();
        response.getApplications().forEach(a -> appMap.put(a.getCode(), a));

        assertTrue(appMap.get("STUDENT_MANAGEMENT").getIsAuthorized(), "Student module is enabled for School B");
        assertFalse(appMap.get("ATTENDANCE").getIsAuthorized(), "Attendance was disabled at School B level, must be false");
        assertFalse(appMap.get("ATTENDANCE").getIsAvailable(), "Attendance is not available for School B");
    }

    @Test
    @DisplayName("Tier 3 Gating: Teacher with student:read only cannot access Finance or IAM in an enabled school")
    void testTeacherWithOnlyStudentPermissionCannotSeeFinanceOrIam() {
        when(userRepository.findById(102L)).thenReturn(Optional.of(teacherUser));
        when(organizationRepository.findById(1L)).thenReturn(Optional.of(schoolA));

        Membership membership = Membership.builder()
                .id(502L)
                .userId(102L)
                .organizationId(1L)
                .status(MembershipStatus.ACTIVE)
                .build();
        when(membershipRepository.findByUserIdAndOrganizationId(102L, 1L)).thenReturn(Optional.of(membership));

        // Teacher only has student:read (No rbac:manage, no finance:read)
        MemberPermissionSummaryResponse summary = MemberPermissionSummaryResponse.builder()
                .membershipId(502L)
                .effectivePermissions(new HashSet<>(Collections.singletonList("student:read")))
                .directRoles(Collections.singletonList("TEACHER"))
                .build();
        when(rbacService.getMemberPermissionSummary(502L)).thenReturn(summary);

        UserApplicationEntitlementResponse response = entitlementService.getUserEntitlements(102L, 1L);

        Map<String, ApplicationEntitlementDto> appMap = new HashMap<>();
        response.getApplications().forEach(a -> appMap.put(a.getCode(), a));

        assertTrue(appMap.get("STUDENT_MANAGEMENT").getIsAuthorized());
        assertFalse(appMap.get("IAM_GOVERNANCE").getIsAuthorized(), "Teacher does not have rbac:manage");
        assertFalse(appMap.get("FEES_FINANCE").getIsAuthorized(), "Teacher does not have finance:read");
    }

    @Test
    @DisplayName("Multi-Tenant Isolation: School A enabled modules never leak to School B")
    void testMultiTenantIsolationBetweenSchoolAAndSchoolB() {
        when(userRepository.findById(102L)).thenReturn(Optional.of(teacherUser));
        when(organizationRepository.findById(1L)).thenReturn(Optional.of(schoolA));
        when(organizationRepository.findById(2L)).thenReturn(Optional.of(schoolB));

        Membership memA = Membership.builder().id(501L).userId(102L).organizationId(1L).status(MembershipStatus.ACTIVE).build();
        Membership memB = Membership.builder().id(502L).userId(102L).organizationId(2L).status(MembershipStatus.ACTIVE).build();

        when(membershipRepository.findByUserIdAndOrganizationId(102L, 1L)).thenReturn(Optional.of(memA));
        when(membershipRepository.findByUserIdAndOrganizationId(102L, 2L)).thenReturn(Optional.of(memB));

        MemberPermissionSummaryResponse permAll = MemberPermissionSummaryResponse.builder()
                .membershipId(501L)
                .effectivePermissions(new HashSet<>(Arrays.asList("student:read", "attendance:mark")))
                .directRoles(Collections.singletonList("TEACHER"))
                .build();
        when(rbacService.getMemberPermissionSummary(anyLong())).thenReturn(permAll);

        // Call for School A
        UserApplicationEntitlementResponse respA = entitlementService.getUserEntitlements(102L, 1L);
        // Call for School B
        UserApplicationEntitlementResponse respB = entitlementService.getUserEntitlements(102L, 2L);

        Map<String, ApplicationEntitlementDto> mapA = new HashMap<>();
        respA.getApplications().forEach(a -> mapA.put(a.getCode(), a));

        Map<String, ApplicationEntitlementDto> mapB = new HashMap<>();
        respB.getApplications().forEach(a -> mapB.put(a.getCode(), a));

        // School A has Attendance enabled -> true
        assertTrue(mapA.get("ATTENDANCE").getIsAuthorized());
        // School B has Attendance disabled -> false (isolated!)
        assertFalse(mapB.get("ATTENDANCE").getIsAuthorized());
    }
}
