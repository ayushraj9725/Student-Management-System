package com.student.management.platform.mapper;

import com.student.management.platform.dto.request.CreateOrganizationRequest;
import com.student.management.platform.dto.response.OrganizationResponse;
import com.student.management.platform.entity.Organization;
import org.mapstruct.Builder;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", builder = @Builder(disableBuilder = true))
public interface OrganizationMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", expression = "java(com.student.management.platform.enums.OrganizationStatus.ACTIVE)")
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    Organization toEntity(CreateOrganizationRequest request);

    @Mapping(target = "planName", source = "planName")
    OrganizationResponse toResponse(Organization organization, String planName);
}
