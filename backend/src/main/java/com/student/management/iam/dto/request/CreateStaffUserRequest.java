package com.student.management.iam.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request payload for adding and provisioning staff members within a tenant organization.
 * Supports Mode A (INSTANT) and Mode B (EMAIL_INVITE).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateStaffUserRequest {

    @NotBlank(message = "Full name is required")
    private String fullName;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;

    private String username;

    /**
     * Provisioning mode:
     * - "INSTANT": Principal provisions credentials directly; user can sign in immediately.
     * - "EMAIL_INVITE": System dispatches an email onboarding invite with a 6-digit setup code.
     */
    @Builder.Default
    private String provisionMode = "INSTANT";

    private String password;

    private List<Long> roleIds;

    private List<Long> groupIds;
}

