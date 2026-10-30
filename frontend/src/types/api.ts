export type OrganizationStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';

export type MembershipStatus = 'PENDING_APPROVAL' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';

export interface SubscriptionPlanResponse {
  id: number;
  name: string;
  maxStudents: number;
  maxStaff: number;
  priceMonthly: number;
  featuresJson: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrganizationResponse {
  id: number;
  name: string;
  slug: string;
  planId: number;
  planName: string;
  status: OrganizationStatus;
  contactEmail: string;
  activationOtp?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateOrganizationRequest {
  name: string;
  slug: string;
  planId: number;
  contactEmail: string;
}

export interface UpdateOrganizationStatusRequest {
  status: OrganizationStatus;
}

export interface TenantAnalyticsResponse {
  organizationId: number;
  organizationName: string;
  slug: string;
  planName: string;
  status: OrganizationStatus;
  totalStudents: number;
  maxStudentsQuota: number;
  totalStaffMembers: number;
  maxStaffQuota: number;
}

export interface PermissionResponse {
  id: number;
  code: string;
  description: string;
}

export interface RoleResponse {
  id: number;
  name: string;
  description: string;
  organizationId: number | null;
  isSystemTemplate: boolean;
  permissions: PermissionResponse[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateRoleRequest {
  name: string;
  description: string;
  permissionIds: number[];
}

export interface SchoolGroupResponse {
  id: number;
  organizationId: number;
  name: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateGroupRequest {
  name: string;
  description: string;
}

export interface AssignIdsRequest {
  ids: number[];
}

export interface MemberPermissionSummaryResponse {
  membershipId: number;
  userId: number;
  fullName?: string;
  username?: string;
  email?: string;
  organizationId: number;
  status: MembershipStatus;
  directRoles: string[];
  groupNames: string[];
  groupInheritedRoles: string[];
  effectivePermissions: string[];
}

export interface CreateStaffUserRequest {
  fullName: string;
  email: string;
  username?: string;
  provisionMode?: 'INSTANT' | 'EMAIL_INVITE';
  password?: string;
  roleIds?: number[];
  groupIds?: number[];
}

export interface UpdateMembershipStatusRequest {
  status: MembershipStatus;
}

export interface ApproveStaffRequest {
  roleIds?: number[];
  groupIds?: number[];
  approvedByUserId?: number;
}


export interface Student {
  id: number;
  name: string;
  email: string;
  course: string;
  semester: number;
  organizationId?: number;
}

export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

export interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInMs: number;
  userId: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  isSuperAdmin: boolean;
  organizationId?: number;
  organizationSlug?: string;
  organizationName?: string;
  authorizedApplications?: string[];
  permissions?: string[];
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
  purpose?: string;
}

export interface VerifyOtpRequest {
  email: string;
  otpCode: string;
  purpose: string;
}

export interface OtpVerificationResponse {
  email: string;
  verified: boolean;
  resetToken: string;
  message: string;
}

export interface ResetPasswordRequest {
  email: string;
  resetToken: string;
  newPassword: string;
}
