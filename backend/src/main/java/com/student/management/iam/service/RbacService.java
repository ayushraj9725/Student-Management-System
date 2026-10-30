package com.student.management.iam.service;

import com.student.management.iam.dto.request.CreateGroupRequest;
import com.student.management.iam.dto.request.CreateRoleRequest;
import com.student.management.iam.dto.request.CreateStaffUserRequest;
import com.student.management.iam.dto.request.UpdateMembershipStatusRequest;
import com.student.management.iam.dto.response.MemberPermissionSummaryResponse;
import com.student.management.iam.dto.response.PermissionResponse;
import com.student.management.iam.dto.response.RoleResponse;
import com.student.management.iam.dto.response.SchoolGroupResponse;

import java.util.List;

/**
 * Public service interface for Role-Based Access Control, staff provisioning, departments, and effective capability resolutions.
 */
public interface RbacService {

    List<PermissionResponse> getAllPermissions();

    List<RoleResponse> getRoles(Long orgId);

    RoleResponse createCustomRole(Long orgId, CreateRoleRequest request);

    List<SchoolGroupResponse> getGroups(Long orgId);

    SchoolGroupResponse createGroup(Long orgId, CreateGroupRequest request);

    void assignRolesToGroup(Long groupId, List<Long> roleIds);

    void assignGroupsToMember(Long membershipId, List<Long> groupIds);

    void assignRolesToMember(Long membershipId, List<Long> roleIds);

    MemberPermissionSummaryResponse getMemberPermissionSummary(Long membershipId);

    List<MemberPermissionSummaryResponse> getMembershipsByStatus(Long orgId, com.student.management.iam.enums.MembershipStatus status);

    MemberPermissionSummaryResponse approveStaffMembership(Long membershipId, Long approvedByUserId, List<Long> roleIds, List<Long> groupIds);

    MemberPermissionSummaryResponse rejectStaffMembership(Long membershipId);

    MemberPermissionSummaryResponse provisionStaffUser(Long orgId, CreateStaffUserRequest request);

    MemberPermissionSummaryResponse updateMembershipStatus(Long orgId, Long membershipId, UpdateMembershipStatusRequest request);
}
