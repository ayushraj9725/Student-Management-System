import { apiRequest } from './apiClient';
import {
  SubscriptionPlanResponse,
  OrganizationResponse,
  CreateOrganizationRequest,
  UpdateOrganizationStatusRequest,
  TenantAnalyticsResponse,
} from '../types/api';

/**
 * Service for Platform Super Admin operations:
 * Tenant provisioning, subscription quotas, and platform analytics.
 */
export const platformService = {
  /**
   * Fetch all subscription plans supported by the platform.
   */
  async getAllPlans(): Promise<SubscriptionPlanResponse[]> {
    return apiRequest<SubscriptionPlanResponse[]>('/platform/plans');
  },

  /**
   * Fetch all registered organizations/schools across the platform.
   */
  async getAllOrganizations(): Promise<OrganizationResponse[]> {
    return apiRequest<OrganizationResponse[]>('/platform/organizations');
  },

  /**
   * Resolve an organization by its human-readable slug without revealing numeric IDs.
   */
  async getOrganizationBySlug(slug: string): Promise<OrganizationResponse> {
    return apiRequest<OrganizationResponse>(`/platform/organizations/slug/${slug}`);
  },

  /**
   * Onboard a new organization/school with an assigned subscription plan.
   */
  async createOrganization(request: CreateOrganizationRequest): Promise<OrganizationResponse> {
    return apiRequest<OrganizationResponse>('/platform/organizations', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  /**
   * Update the status of an organization (e.g. ACTIVE, SUSPENDED, INACTIVE).
   */
  async updateOrganizationStatus(
    id: number,
    request: UpdateOrganizationStatusRequest
  ): Promise<OrganizationResponse> {
    return apiRequest<OrganizationResponse>(`/platform/organizations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(request),
    });
  },

  /**
   * Retrieve real-time quota telemetry and aggregated metrics for a specific tenant.
   */
  async getTenantAnalytics(id: number): Promise<TenantAnalyticsResponse> {
    return apiRequest<TenantAnalyticsResponse>(`/platform/organizations/${id}/analytics`);
  },
};
