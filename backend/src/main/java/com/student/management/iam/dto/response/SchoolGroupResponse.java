package com.student.management.iam.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SchoolGroupResponse {
    private Long id;
    private Long organizationId;
    private String name;
    private String description;
    private ZonedDateTime createdAt;
    private ZonedDateTime updatedAt;
    private UUID createdBy;
    private UUID updatedBy;
}
