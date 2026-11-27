package com.student.management.platform.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

/**
 * DTO representing an application module in the platform master catalog.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApplicationModuleCatalogDto {
    private String id;
    private String code;
    private String title;
    private String description;
    private String route;
    private String category;
    private String iconColor;
    private boolean comingSoon;
    private Set<String> requiredPermissions;
}
