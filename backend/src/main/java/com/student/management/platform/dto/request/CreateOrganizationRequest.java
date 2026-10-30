package com.student.management.platform.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateOrganizationRequest {

    @NotBlank(message = "School/Organization name is required")
    @Size(max = 150, message = "Name cannot exceed 150 characters")
    private String name;

    @NotBlank(message = "Organization slug is required")
    @Size(max = 100, message = "Slug cannot exceed 100 characters")
    private String slug;

    @NotNull(message = "Subscription plan ID is required")
    private Long planId;

    @NotBlank(message = "Contact email is required")
    @Email(message = "Contact email must be valid")
    private String contactEmail;

    private String headFullName;

    @Email(message = "School head email must be valid")
    private String headEmail;
}
