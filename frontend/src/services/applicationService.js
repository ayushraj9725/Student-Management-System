import { apiRequest } from './apiClient';

export const applicationService = {
  /**
   * Fetch dynamic application entitlements and effective permissions for the current user.
   * Resolves attribute-based and role-based operable applications.
   * 
   * @param {Object} params
   * @param {number} [params.orgId]
   * @param {string} [params.orgSlug]
   * @returns {Promise<Object>}
   */
  async getUserEntitlements(params = {}) {
    const query = new URLSearchParams();
    if (params.orgId) query.append('orgId', String(params.orgId));
    if (params.orgSlug) query.append('orgSlug', params.orgSlug);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiRequest(`/applications/user-entitlements${queryString}`, {
      method: 'GET',
    });
  },
};

