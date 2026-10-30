package com.student.management.iam.controller;

import com.student.management.iam.dto.request.*;
import com.student.management.iam.dto.response.MemberPermissionSummaryResponse;
import com.student.management.iam.dto.response.PermissionResponse;
import com.student.management.iam.dto.response.RoleResponse;
import com.student.management.iam.dto.response.SchoolGroupResponse;
import com.student.management.iam.service.RbacService;
import com.student.management.shared.context.TenantContextHolder;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller exposing REST endpoints for School Staff RBAC, departments, and permission queries.
 */
@Slf4j
@RestController
@RequestMapping("${api.prefix:/api/v1}/iam")
@RequiredArgsConstructor
public class RbacController {

    private final RbacService rbacService;

    private Long resolveEffectiveOrgId(Long requestOrgId) {
        Long contextOrgId = TenantContextHolder.getTenantId();
        org.springframework.security.core.Authentication auth =
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        boolean isSuperAdmin = false;
        if (auth != null && auth.getPrincipal() instanceof com.student.management.iam.user.entity.User user) {
            isSuperAdmin = Boolean.TRUE.equals(user.getIsSuperAdmin())
                    || "PLATFORM_SUPER_ADMIN".equalsIgnoreCase(user.getRole())
                    || "superadmin".equalsIgnoreCase(user.getUsername());
        }
        if (!isSuperAdmin && contextOrgId != null) {
            return contextOrgId;
        }
        return requestOrgId != null ? requestOrgId : contextOrgId;
    }

    @GetMapping("/permissions")
    public ResponseEntity<List<PermissionResponse>> getAllPermissions() {
        log.debug("REST request to get all permissions");
        return ResponseEntity.ok(rbacService.getAllPermissions());
    }

    @GetMapping("/roles")
    public ResponseEntity<List<RoleResponse>> getRoles(@RequestParam(required = false) Long orgId) {
        Long activeOrgId = resolveEffectiveOrgId(orgId);
        log.debug("REST request to get roles for activeOrgId: {}", activeOrgId);
        return ResponseEntity.ok(rbacService.getRoles(activeOrgId));
    }

    @PostMapping("/roles")
    public ResponseEntity<RoleResponse> createCustomRole(
            @RequestParam(required = false) Long orgId,
            @Valid @RequestBody CreateRoleRequest request) {
        Long activeOrgId = resolveEffectiveOrgId(orgId);
        if (activeOrgId == null) {
            throw new IllegalArgumentException("Tenant context must be specified via header X-Tenant-ID or orgId query param.");
        }
        log.info("REST request to create custom role '{}' for tenant ID: {}", request.getName(), activeOrgId);
        RoleResponse response = rbacService.createCustomRole(activeOrgId, request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/groups")
    public ResponseEntity<List<SchoolGroupResponse>> getGroups(@RequestParam(required = false) Long orgId) {
        Long activeOrgId = resolveEffectiveOrgId(orgId);
        if (activeOrgId == null) {
            throw new IllegalArgumentException("Tenant context must be specified via header X-Tenant-ID or orgId query param.");
        }
        log.debug("REST request to get school groups for tenant ID: {}", activeOrgId);
        return ResponseEntity.ok(rbacService.getGroups(activeOrgId));
    }

    @PostMapping("/groups")
    public ResponseEntity<SchoolGroupResponse> createGroup(
            @RequestParam(required = false) Long orgId,
            @Valid @RequestBody CreateGroupRequest request) {
        Long activeOrgId = resolveEffectiveOrgId(orgId);
        if (activeOrgId == null) {
            throw new IllegalArgumentException("Tenant context must be specified via header X-Tenant-ID or orgId query param.");
        }
        log.info("REST request to create school group '{}' for tenant ID: {}", request.getName(), activeOrgId);
        SchoolGroupResponse response = rbacService.createGroup(activeOrgId, request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PostMapping("/groups/{groupId}/roles")
    public ResponseEntity<Void> assignRolesToGroup(
            @PathVariable Long groupId,
            @Valid @RequestBody AssignIdsRequest request) {
        log.info("REST request to assign roles {} to group ID: {}", request.getIds(), groupId);
        rbacService.assignRolesToGroup(groupId, request.getIds());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/members/{memberId}/groups")
    public ResponseEntity<Void> assignGroupsToMember(
            @PathVariable Long memberId,
            @Valid @RequestBody AssignIdsRequest request) {
        log.info("REST request to assign groups {} to member ID: {}", request.getIds(), memberId);
        rbacService.assignGroupsToMember(memberId, request.getIds());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/members/{memberId}/roles")
    public ResponseEntity<Void> assignRolesToMember(
            @PathVariable Long memberId,
            @Valid @RequestBody AssignIdsRequest request) {
        log.info("REST request to assign direct roles {} to member ID: {}", request.getIds(), memberId);
        rbacService.assignRolesToMember(memberId, request.getIds());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/members/{memberId}/permissions")
    public ResponseEntity<MemberPermissionSummaryResponse> getMemberPermissions(@PathVariable Long memberId) {
        log.debug("REST request to get effective permissions for member ID: {}", memberId);
        return ResponseEntity.ok(rbacService.getMemberPermissionSummary(memberId));
    }

    @GetMapping({"/members", "/users"})
    public ResponseEntity<List<MemberPermissionSummaryResponse>> getMembers(
            @RequestParam(required = false) Long orgId,
            @RequestParam(required = false) com.student.management.iam.enums.MembershipStatus status) {
        Long activeOrgId = resolveEffectiveOrgId(orgId);
        if (activeOrgId == null) {
            throw new IllegalArgumentException("Tenant context must be specified via header X-Tenant-ID or orgId query param.");
        }
        log.debug("REST request to get members for tenant ID: {} with status: {}", activeOrgId, status);
        return ResponseEntity.ok(rbacService.getMembershipsByStatus(activeOrgId, status));
    }

    @PostMapping({"/members", "/users"})
    public ResponseEntity<MemberPermissionSummaryResponse> provisionStaffUser(
            @RequestParam(required = false) Long orgId,
            @Valid @RequestBody CreateStaffUserRequest request) {
        Long activeOrgId = resolveEffectiveOrgId(orgId);
        if (activeOrgId == null) {
            throw new IllegalArgumentException("Tenant context must be specified via header X-Tenant-ID or orgId query param.");
        }
        log.info("REST request to provision staff user '{}' for tenant ID: {}", request.getEmail(), activeOrgId);
        MemberPermissionSummaryResponse response = rbacService.provisionStaffUser(activeOrgId, request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PatchMapping("/members/{membershipId}/status")
    public ResponseEntity<MemberPermissionSummaryResponse> updateMembershipStatus(
            @PathVariable Long membershipId,
            @RequestParam(required = false) Long orgId,
            @Valid @RequestBody UpdateMembershipStatusRequest request) {
        Long activeOrgId = resolveEffectiveOrgId(orgId);
        if (activeOrgId == null) {
            throw new IllegalArgumentException("Tenant context must be specified via header X-Tenant-ID or orgId query param.");
        }
        log.info("REST request to update status of membership ID: {} to {} in tenant ID: {}",
                membershipId, request.getStatus(), activeOrgId);
        MemberPermissionSummaryResponse response = rbacService.updateMembershipStatus(activeOrgId, membershipId, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/members/{memberId}/approve")
    public ResponseEntity<MemberPermissionSummaryResponse> approveMember(
            @PathVariable Long memberId,
            @RequestBody(required = false) com.student.management.iam.dto.request.ApproveStaffRequest request) {
        log.info("REST request to approve member ID: {}", memberId);
        List<Long> roleIds = request != null ? request.getRoleIds() : null;
        List<Long> groupIds = request != null ? request.getGroupIds() : null;
        Long approverId = (request != null && request.getApprovedByUserId() != null) ? request.getApprovedByUserId() : 1L;
        return ResponseEntity.ok(rbacService.approveStaffMembership(memberId, approverId, roleIds, groupIds));
    }

    @PostMapping("/members/{memberId}/reject")
    public ResponseEntity<MemberPermissionSummaryResponse> rejectMember(@PathVariable Long memberId) {
        log.info("REST request to reject member ID: {}", memberId);
        return ResponseEntity.ok(rbacService.rejectStaffMembership(memberId));
    }
}
