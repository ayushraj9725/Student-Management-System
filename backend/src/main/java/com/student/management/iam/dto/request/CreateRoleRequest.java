package com.student.management.iam.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateRoleRequest {

    @NotBlank(message = "Role name is required")
    @Size(max = 100, message = "Role name cannot exceed 100 characters")
    private String name;

    private String description;

    @NotEmpty(message = "At least one permission must be assigned to the role")
    private List<Long> permissionIds;
}
