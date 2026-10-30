package com.student.management.applications.service.impl;

import com.student.management.applications.dto.ApplicationEntitlementDto;
import com.student.management.applications.dto.UserApplicationEntitlementResponse;
import com.student.management.applications.registry.ApplicationModule;
import com.student.management.applications.service.ApplicationEntitlementService;
import com.student.management.iam.dto.response.MemberPermissionSummaryResponse;
import com.student.management.iam.entity.Membership;
import com.student.management.iam.repository.MembershipRepository;
import com.student.management.iam.service.RbacService;
import com.student.management.iam.user.entity.User;
import com.student.management.iam.user.repository.UserRepository;
import com.student.management.platform.entity.Organization;
import com.student.management.platform.repository.OrganizationRepository;
import com.student.management.shared.context.TenantContextHolder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Enterprise service evaluating Role-Based and Attribute-Based Access Control (RBAC/ABAC)
 * to dynamically resolve operable application module entitlements for users.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ApplicationEntitlementServiceImpl implements ApplicationEntitlementService {

    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final MembershipRepository membershipRepository;
    private final RbacService rbacService;

    @Override
    @Transactional(readOnly = true)
    public UserApplicationEntitlementResponse getUserEntitlements(Long userId, Long orgId) {
        log.debug("Resolving application entitlements for userId: {}, orgId: {}", userId, orgId);

        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            log.warn("User ID {} not found. Returning empty fallback entitlements.", userId);
            return createEmptyResponse(userId);
        }

        boolean isSuperAdmin = Boolean.TRUE.equals(user.getIsSuperAdmin())
                || "PLATFORM_SUPER_ADMIN".equalsIgnoreCase(user.getRole())
                || "superadmin".equalsIgnoreCase(user.getUsername());

        // 1. Platform Super Admin: strictly platform administration scope
        if (isSuperAdmin) {
            return buildSuperAdminResponse(user);
        }

        // 2. Resolve Active Organization & Tenant Context
        Organization org = resolveOrganization(user.getId(), orgId);
        Long resolvedOrgId = (org != null) ? org.getId() : null;
        String tenantSlug = (org != null) ? org.getSlug() : null;
        String tenantName = (org != null) ? org.getName() : "Institutional Workspace";

        // 3. Resolve Member Permissions & Role
        Set<String> effectivePermissions = new HashSet<>();
        List<String> roleNames = new ArrayList<>();

        if (resolvedOrgId != null) {
            Optional<Membership> membershipOpt = membershipRepository.findByUserIdAndOrganizationId(user.getId(), resolvedOrgId);
            if (membershipOpt.isPresent()) {
                try {
                    MemberPermissionSummaryResponse summary = rbacService.getMemberPermissionSummary(membershipOpt.get().getId());
                    if (summary.getEffectivePermissions() != null) {
                        effectivePermissions.addAll(summary.getEffectivePermissions());
                    }
                    if (summary.getDirectRoles() != null) {
                        roleNames.addAll(summary.getDirectRoles());
                    }
                    if (summary.getGroupInheritedRoles() != null) {
                        roleNames.addAll(summary.getGroupInheritedRoles());
                    }
                } catch (Exception ex) {
                    log.warn("Could not load member permissions summary: {}. Applying role fallback.", ex.getMessage());
                }
            }
        }

        // Add base user role
        if (user.getRole() != null) {
            roleNames.add(user.getRole().toUpperCase());
        }

        boolean isSchoolAdmin = roleNames.stream().anyMatch(r ->
                r.contains("ADMIN") || r.contains("PRINCIPAL") || r.contains("HEAD_MASTER") || r.contains("HEADMASTER")
        ) || effectivePermissions.contains("rbac:manage");

        // 4. Resolve School Application Modules
        List<ApplicationEntitlementDto> applicationList = new ArrayList<>();

        for (ApplicationModule module : ApplicationModule.values()) {
            if (module == ApplicationModule.PLATFORM_CONTROL) {
                // School users never see platform superadmin control
                continue;
            }

            boolean isAuthorized;
            if (isSchoolAdmin) {
                // School Admin / Principal has full visibility of institutional modules
                isAuthorized = true;
            } else {
                isAuthorized = checkModuleEntitlement(module, effectivePermissions, roleNames);
            }

            String computedRoute = module.getRoute();
            if (computedRoute != null && computedRoute.contains("{slug}")) {
                computedRoute = computedRoute.replace("{slug}", tenantSlug);
            }

            applicationList.add(ApplicationEntitlementDto.builder()
                    .id(module.getId())
                    .code(module.getCode())
                    .title(module.getTitle())
                    .description(module.getDescription())
                    .route(computedRoute)
                    .category(module.getCategory())
                    .iconColor(module.getIconColor())
                    .isAuthorized(isAuthorized)
                    .isAvailable(module.isAvailable())
                    .comingSoon(module.isComingSoon())
                    .requiredPermissions(module.getRequiredPermissions())
                    .build());
        }

        return UserApplicationEntitlementResponse.builder()
                .userId(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .tenantId(resolvedOrgId)
                .tenantSlug(tenantSlug)
                .tenantName(tenantName)
                .userRole(user.getRole())
                .isSuperAdmin(false)
                .effectivePermissions(effectivePermissions)
                .applications(applicationList)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public UserApplicationEntitlementResponse getUserEntitlementsBySlug(Long userId, String orgSlug) {
        Long orgId = null;
        if (orgSlug != null && !orgSlug.isBlank()) {
            orgId = organizationRepository.findBySlug(orgSlug).map(Organization::getId).orElse(null);
        }
        return getUserEntitlements(userId, orgId);
    }

    @Override
    @Transactional(readOnly = true)
    public UserApplicationEntitlementResponse getEntitlementsForCurrentCaller(Long orgId, String orgSlug) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return createEmptyResponse(null);
        }

        String username = auth.getName();
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return createEmptyResponse(null);
        }

        Long targetOrgId = orgId;
        if (targetOrgId == null && orgSlug != null && !orgSlug.isBlank()) {
            targetOrgId = organizationRepository.findBySlug(orgSlug).map(Organization::getId).orElse(null);
        }
        if (targetOrgId == null) {
            targetOrgId = TenantContextHolder.getTenantId();
        }

        return getUserEntitlements(user.getId(), targetOrgId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> getAuthorizedApplicationCodes(Long userId, Long orgId) {
        UserApplicationEntitlementResponse response = getUserEntitlements(userId, orgId);
        return response.getApplications().stream()
                .filter(a -> Boolean.TRUE.equals(a.getIsAuthorized()))
                .map(ApplicationEntitlementDto::getCode)
                .collect(Collectors.toList());
    }

    private boolean checkModuleEntitlement(ApplicationModule module, Set<String> effectivePermissions, List<String> roleNames) {
        // Attribute-based match: Any permission required by the module is present in user's effective permissions
        for (String requiredPerm : module.getRequiredPermissions()) {
            if (effectivePermissions.contains(requiredPerm)) {
                return true;
            }
        }

        // Role-based keyword match for high resilience
        String moduleCode = module.getCode();
        for (String role : roleNames) {
            String r = role.toUpperCase();
            if (moduleCode.equals("STUDENT_MANAGEMENT") && (r.contains("REGISTRAR") || r.contains("TEACHER") || r.contains("INSTRUCTOR") || r.contains("STAFF"))) {
                return true;
            }
            if (moduleCode.equals("ATTENDANCE") && (r.contains("TEACHER") || r.contains("FACULTY") || r.contains("INSTRUCTOR"))) {
                return true;
            }
            if (moduleCode.equals("EXAMINATION") && (r.contains("TEACHER") || r.contains("COUNSELOR") || r.contains("EXAM"))) {
                return true;
            }
            if (moduleCode.equals("FINANCE") && (r.contains("ACCOUNT") || r.contains("BURSAR") || r.contains("FINANCE"))) {
                return true;
            }
            if (moduleCode.equals("IAM_GOVERNANCE") && (r.contains("ADMIN") || r.contains("HEAD"))) {
                return true;
            }
        }

        // Default baseline for general staff to ensure zero broken UI:
        if (moduleCode.equals("STUDENT_MANAGEMENT")) {
            return true;
        }

        return false;
    }

    private Organization resolveOrganization(Long userId, Long orgId) {
        if (orgId != null) {
            return organizationRepository.findById(orgId).orElse(null);
        }
        Long contextOrgId = TenantContextHolder.getTenantId();
        if (contextOrgId != null) {
            return organizationRepository.findById(contextOrgId).orElse(null);
        }
        if (userId != null) {
            List<Membership> memberships = membershipRepository.findAllByUserId(userId);
            if (!memberships.isEmpty() && memberships.get(0).getOrganizationId() != null) {
                return organizationRepository.findById(memberships.get(0).getOrganizationId()).orElse(null);
            }
        }
        return null;
    }

    private UserApplicationEntitlementResponse buildSuperAdminResponse(User user) {
        ApplicationModule platformModule = ApplicationModule.PLATFORM_CONTROL;
        ApplicationEntitlementDto dto = ApplicationEntitlementDto.builder()
                .id(platformModule.getId())
                .code(platformModule.getCode())
                .title(platformModule.getTitle())
                .description(platformModule.getDescription())
                .route(platformModule.getRoute())
                .category(platformModule.getCategory())
                .iconColor(platformModule.getIconColor())
                .isAuthorized(true)
                .isAvailable(platformModule.isAvailable())
                .comingSoon(platformModule.isComingSoon())
                .requiredPermissions(platformModule.getRequiredPermissions())
                .build();

        return UserApplicationEntitlementResponse.builder()
                .userId(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .tenantId(null)
                .tenantSlug(null)
                .tenantName("Global Platform Administration")
                .userRole("PLATFORM_SUPER_ADMIN")
                .isSuperAdmin(true)
                .effectivePermissions(Collections.singleton("platform:super_admin"))
                .applications(Collections.singletonList(dto))
                .build();
    }

    private UserApplicationEntitlementResponse createEmptyResponse(Long userId) {
        return UserApplicationEntitlementResponse.builder()
                .userId(userId)
                .username("guest")
                .fullName("Guest")
                .tenantId(null)
                .tenantSlug(null)
                .tenantName("My School Care")
                .userRole("GUEST")
                .isSuperAdmin(false)
                .effectivePermissions(Collections.emptySet())
                .applications(Collections.emptyList())
                .build();
    }
}

