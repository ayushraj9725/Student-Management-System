package com.student.management.iam.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OtpVerificationResponse {

    private String email;
    private boolean verified;
    private String resetToken;
    private String message;
}
