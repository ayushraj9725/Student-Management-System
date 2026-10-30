package com.student.management.applications.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

/**
 * Representation of an application card with authorized visibility state.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApplicationEntitlementDto {
    private String id;
    private String code;
    private String title;
    private String description;
    private String route;
    private String category;
    private String iconColor;
    private Boolean isAuthorized;
    private Boolean isAvailable;
    private Boolean comingSoon;
    private Set<String> requiredPermissions;
}

