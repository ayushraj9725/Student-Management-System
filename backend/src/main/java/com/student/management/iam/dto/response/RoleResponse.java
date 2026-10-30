package com.student.management.iam.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoleResponse {
    private Long id;
    private String name;
    private String description;
    private Long organizationId;
    private boolean isSystemTemplate;
    private List<PermissionResponse> permissions;
    private ZonedDateTime createdAt;
    private ZonedDateTime updatedAt;
    private UUID createdBy;
    private UUID updatedBy;
}
