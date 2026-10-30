package com.student.management.platform.dto.response;

import com.student.management.platform.enums.OrganizationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TenantAnalyticsResponse {
    private Long organizationId;
    private String organizationName;
    private String slug;
    private String planName;
    private OrganizationStatus status;
    private long totalStudents;
    private int maxStudentsQuota;
    private long totalStaffMembers;
    private int maxStaffQuota;
}
