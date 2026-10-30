package com.student.management.iam.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApproveStaffRequest {
    private List<Long> roleIds;
    private List<Long> groupIds;
    private Long approvedByUserId;
}
