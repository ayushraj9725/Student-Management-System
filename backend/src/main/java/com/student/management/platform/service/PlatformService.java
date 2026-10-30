package com.student.management.platform.service;

import com.student.management.platform.dto.request.CreateOrganizationRequest;
import com.student.management.platform.dto.request.UpdateOrganizationStatusRequest;
import com.student.management.platform.dto.response.OrganizationResponse;
import com.student.management.platform.dto.response.SubscriptionPlanResponse;
import com.student.management.platform.dto.response.TenantAnalyticsResponse;

import java.util.List;

/**
 * Public service interface for platform administration, tenant onboarding, and quota validation.
 */
public interface PlatformService {

    List<SubscriptionPlanResponse> getAllPlans();

    List<OrganizationResponse> getAllOrganizations();

    OrganizationResponse getOrganizationBySlug(String slug);

    OrganizationResponse createOrganization(CreateOrganizationRequest request);

    OrganizationResponse updateOrganizationStatus(Long id, UpdateOrganizationStatusRequest request);

    TenantAnalyticsResponse getTenantAnalytics(Long orgId);

    void validateStudentCapacity(Long orgId);
}
