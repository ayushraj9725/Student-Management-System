package com.student.management.platform.dto.response;

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
public class SubscriptionPlanResponse {
    private Long id;
    private String name;
    private int maxStudents;
    private int maxStaff;
    private int priceCents;
    private String featuresJson;
    private ZonedDateTime createdAt;
    private ZonedDateTime updatedAt;
    private UUID createdBy;
    private UUID updatedBy;
}
