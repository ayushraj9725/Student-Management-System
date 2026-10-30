package com.student.management.platform.mapper;

import com.student.management.platform.dto.response.SubscriptionPlanResponse;
import com.student.management.platform.entity.SubscriptionPlan;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper(componentModel = "spring")
public interface SubscriptionPlanMapper {

    SubscriptionPlanResponse toResponse(SubscriptionPlan plan);

    List<SubscriptionPlanResponse> toResponseList(List<SubscriptionPlan> plans);
}
