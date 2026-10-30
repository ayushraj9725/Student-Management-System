import { apiRequest } from './apiClient';
import {
  PermissionResponse,
  RoleResponse,
  CreateRoleRequest,
  SchoolGroupResponse,
  CreateGroupRequest,
  AssignIdsRequest,
  MemberPermissionSummaryResponse,
  CreateStaffUserRequest,
  UpdateMembershipStatusRequest,
  MembershipStatus,
} from '../types/api';

/**
 * Service for School Staff RBAC operations:
 * Roles, capability permissions, department groups, and member access resolution.
 */
export const rbacService = {
  /**
   * Fetch system capability permissions catalog.
   */
  async getAllPermissions(): Promise<PermissionResponse[]> {
    return apiRequest<PermissionResponse[]>('/iam/permissions');
  },

  /**
   * Fetch all roles available for a specific organization (system templates + custom roles).
   */
  async getRoles(orgId?: number): Promise<RoleResponse[]> {
    const query = orgId ? `?orgId=${orgId}` : '';
    return apiRequest<RoleResponse[]>(`/iam/roles${query}`);
  },

  /**
   * Create a new custom role with assigned capability permissions for an organization.
   */
  async createCustomRole(request: CreateRoleRequest, orgId?: number): Promise<RoleResponse> {
    const query = orgId ? `?orgId=${orgId}` : '';
    return apiRequest<RoleResponse>(`/iam/roles${query}`, {
      method: 'POST',
      body: JSON.stringify(request),
    }, true);
  },

  /**
   * Fetch all school groups / departments for an organization.
   */
  async getGroups(orgId?: number): Promise<SchoolGroupResponse[]> {
    const query = orgId ? `?orgId=${orgId}` : '';
    return apiRequest<SchoolGroupResponse[]>(`/iam/groups${query}`);
  },

  /**
   * Create a new school department or staff group.
   */
  async createGroup(request: CreateGroupRequest, orgId?: number): Promise<SchoolGroupResponse> {
    const query = orgId ? `?orgId=${orgId}` : '';
    return apiRequest<SchoolGroupResponse>(`/iam/groups${query}`, {
      method: 'POST',
      body: JSON.stringify(request),
    }, true);
  },

  /**
   * Assign roles to a department / school group.
   */
  async assignRolesToGroup(groupId: number, roleIds: number[]): Promise<void> {
    const payload: AssignIdsRequest = { ids: roleIds };
    return apiRequest<void>(`/iam/groups/${groupId}/roles`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Assign department groups to a staff member.
   */
  async assignGroupsToMember(membershipId: number, groupIds: number[]): Promise<void> {
    const payload: AssignIdsRequest = { ids: groupIds };
    return apiRequest<void>(`/iam/members/${membershipId}/groups`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Assign direct roles to a staff member.
   */
  async assignRolesToMember(membershipId: number, roleIds: number[]): Promise<void> {
    const payload: AssignIdsRequest = { ids: roleIds };
    return apiRequest<void>(`/iam/members/${membershipId}/roles`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Get aggregated permission breakdown and effective capabilities for a staff membership.
   */
  async getMemberPermissionSummary(membershipId: number): Promise<MemberPermissionSummaryResponse> {
    return apiRequest<MemberPermissionSummaryResponse>(`/iam/members/${membershipId}/permissions`);
  },

  /**
   * Fetch all staff memberships for an organization, optionally filtered by status (e.g. PENDING_APPROVAL).
   */
  async getMembers(orgId?: number, status?: string): Promise<MemberPermissionSummaryResponse[]> {
    const params = new URLSearchParams();
    if (orgId) params.append('orgId', orgId.toString());
    if (status) params.append('status', status);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<MemberPermissionSummaryResponse[]>(`/iam/members${queryString}`);
  },

  /**
   * School Head approval of a staff member into active status, assigning initial roles and departments.
   */
  async approveStaffMembership(
    membershipId: number,
    request?: import('../types/api').ApproveStaffRequest
  ): Promise<MemberPermissionSummaryResponse> {
    return apiRequest<MemberPermissionSummaryResponse>(`/iam/members/${membershipId}/approve`, {
      method: 'POST',
      body: JSON.stringify(request || {}),
    });
  },

  /**
   * Reject a staff membership application.
   */
  async rejectStaffMembership(membershipId: number): Promise<MemberPermissionSummaryResponse> {
    return apiRequest<MemberPermissionSummaryResponse>(`/iam/members/${membershipId}/reject`, {
      method: 'POST',
    });
  },

  /**
   * Provision a staff member inside an organization.
   * Mode A: INSTANT (Principal enters temporary/direct password)
   * Mode B: EMAIL_INVITE (Cryptographic OTP & onboarding setup link dispatched)
   */
  async provisionStaffUser(
    request: CreateStaffUserRequest,
    orgId?: number
  ): Promise<MemberPermissionSummaryResponse> {
    const query = orgId ? `?orgId=${orgId}` : '';
    return apiRequest<MemberPermissionSummaryResponse>(`/iam/users${query}`, {
      method: 'POST',
      body: JSON.stringify(request),
    }, true);
  },

  /**
   * Update membership status (ACTIVE, SUSPENDED, REJECTED) with anti-enumeration tenant boundary check.
   */
  async updateMembershipStatus(
    membershipId: number,
    status: MembershipStatus,
    orgId?: number
  ): Promise<MemberPermissionSummaryResponse> {
    const query = orgId ? `?orgId=${orgId}` : '';
    const payload: UpdateMembershipStatusRequest = { status };
    return apiRequest<MemberPermissionSummaryResponse>(`/iam/members/${membershipId}/status${query}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }, true);
  },
};

