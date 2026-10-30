package com.student.management.applications.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Set;

/**
 * Aggregated response delivering user effective permissions and authorized applications.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserApplicationEntitlementResponse {
    private Long userId;
    private String username;
    private String fullName;
    private Long tenantId;
    private String tenantSlug;
    private String tenantName;
    private String userRole;
    private Boolean isSuperAdmin;
    private Set<String> effectivePermissions;
    private List<ApplicationEntitlementDto> applications;
}

