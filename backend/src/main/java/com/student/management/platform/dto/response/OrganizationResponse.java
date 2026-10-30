package com.student.management.platform.dto.response;

import com.student.management.platform.enums.OrganizationStatus;
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
public class OrganizationResponse {
    private Long id;
    private String name;
    private String slug;
    private Long planId;
    private String planName;
    private OrganizationStatus status;
    private String contactEmail;
    private String activationOtp;
    private ZonedDateTime createdAt;
    private ZonedDateTime updatedAt;
    private UUID createdBy;
    private UUID updatedBy;
}
