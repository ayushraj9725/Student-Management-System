package com.student.management.platform.controller;

import com.student.management.platform.dto.request.CreateOrganizationRequest;
import com.student.management.platform.dto.request.UpdateOrganizationStatusRequest;
import com.student.management.platform.dto.response.OrganizationResponse;
import com.student.management.platform.dto.response.SubscriptionPlanResponse;
import com.student.management.platform.dto.response.TenantAnalyticsResponse;
import com.student.management.platform.service.PlatformService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller exposing endpoints exclusively for Platform Super Admins to govern client tenants.
 */
@Slf4j
@RestController
@RequestMapping("${api.prefix:/api/v1}/platform")
@RequiredArgsConstructor
public class PlatformAdminController {

    private final PlatformService platformService;

    @GetMapping("/plans")
    public ResponseEntity<List<SubscriptionPlanResponse>> getAllPlans() {
        log.debug("REST request to get all subscription plans");
        return ResponseEntity.ok(platformService.getAllPlans());
    }

    @GetMapping("/organizations")
    public ResponseEntity<List<OrganizationResponse>> getAllOrganizations() {
        log.debug("REST request to get all organizations");
        return ResponseEntity.ok(platformService.getAllOrganizations());
    }

    @GetMapping("/organizations/slug/{slug}")
    public ResponseEntity<OrganizationResponse> getOrganizationBySlug(@PathVariable String slug) {
        log.debug("REST request to get organization by slug: {}", slug);
        return ResponseEntity.ok(platformService.getOrganizationBySlug(slug));
    }

    @PostMapping("/organizations")
    public ResponseEntity<OrganizationResponse> createOrganization(@Valid @RequestBody CreateOrganizationRequest request) {
        log.info("REST request to onboard organization: {}", request.getName());
        OrganizationResponse response = platformService.createOrganization(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PatchMapping("/organizations/{id}/status")
    public ResponseEntity<OrganizationResponse> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateOrganizationStatusRequest request) {
        log.info("REST request to update status for organization ID: {}", id);
        return ResponseEntity.ok(platformService.updateOrganizationStatus(id, request));
    }

    @GetMapping("/organizations/{id}/analytics")
    public ResponseEntity<TenantAnalyticsResponse> getTenantAnalytics(@PathVariable Long id) {
        log.debug("REST request to get analytics for organization ID: {}", id);
        return ResponseEntity.ok(platformService.getTenantAnalytics(id));
    }
}
