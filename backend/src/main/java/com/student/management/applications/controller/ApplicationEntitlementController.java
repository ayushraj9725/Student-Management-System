package com.student.management.applications.controller;

import com.student.management.applications.dto.UserApplicationEntitlementResponse;
import com.student.management.applications.service.ApplicationEntitlementService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller exposing Application Directory and Entitlements API.
 * Resolves attribute-based and role-based operable applications for the authenticated user.
 */
@Slf4j
@RestController
@RequestMapping("${api.prefix:/api/v1}/applications")
@RequiredArgsConstructor
public class ApplicationEntitlementController {

    private final ApplicationEntitlementService applicationEntitlementService;

    @GetMapping("/user-entitlements")
    public ResponseEntity<UserApplicationEntitlementResponse> getUserEntitlements(
            @RequestParam(required = false) Long orgId,
            @RequestParam(required = false) String orgSlug
    ) {
        log.debug("REST request for user application entitlements (orgId: {}, orgSlug: {})", orgId, orgSlug);
        UserApplicationEntitlementResponse response = applicationEntitlementService.getEntitlementsForCurrentCaller(orgId, orgSlug);
        return ResponseEntity.ok(response);
    }
}

