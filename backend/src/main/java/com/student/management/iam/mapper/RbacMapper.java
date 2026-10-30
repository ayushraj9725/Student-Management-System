package com.student.management.iam.mapper;

import com.student.management.iam.dto.request.CreateGroupRequest;
import com.student.management.iam.dto.request.CreateRoleRequest;
import com.student.management.iam.dto.response.PermissionResponse;
import com.student.management.iam.dto.response.SchoolGroupResponse;
import com.student.management.iam.entity.*;
import org.mapstruct.Builder;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring", builder = @Builder(disableBuilder = true))
public interface RbacMapper {

    PermissionResponse toResponse(Permission permission);

    List<PermissionResponse> toPermissionResponseList(List<Permission> permissions);

    SchoolGroupResponse toResponse(SchoolGroup group);

    List<SchoolGroupResponse> toGroupResponseList(List<SchoolGroup> groups);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "organizationId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    SchoolGroup toEntity(CreateGroupRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "organizationId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    Role toEntity(CreateRoleRequest request);
}
