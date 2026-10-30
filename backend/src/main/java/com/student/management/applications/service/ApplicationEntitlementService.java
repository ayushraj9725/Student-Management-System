package com.student.management.applications.service;

import com.student.management.applications.dto.UserApplicationEntitlementResponse;

import java.util.List;

public interface ApplicationEntitlementService {

    UserApplicationEntitlementResponse getUserEntitlements(Long userId, Long orgId);

    UserApplicationEntitlementResponse getUserEntitlementsBySlug(Long userId, String orgSlug);

    UserApplicationEntitlementResponse getEntitlementsForCurrentCaller(Long orgId, String orgSlug);

    List<String> getAuthorizedApplicationCodes(Long userId, Long orgId);
}

