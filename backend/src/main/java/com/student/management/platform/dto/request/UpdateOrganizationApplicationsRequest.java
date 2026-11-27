package com.student.management.platform.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

/**
 * Request payload to update enabled applications for a specific organization tenant.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateOrganizationApplicationsRequest {

    @NotNull(message = "Enabled applications set cannot be null")
    private Set<String> enabledApplications;
}
