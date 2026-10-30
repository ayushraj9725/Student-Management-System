package com.student.management.iam.dto.request;

import com.student.management.iam.enums.MembershipStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request payload for toggling or updating a staff member's operational status.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateMembershipStatusRequest {

    @NotNull(message = "Membership status is required")
    private MembershipStatus status;
}

