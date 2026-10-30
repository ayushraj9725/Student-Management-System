package com.student.management.iam.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthTokenResponse {

    private String accessToken;
    private String refreshToken;
    @Builder.Default
    private String tokenType = "Bearer";
    private Long expiresInMs;
    private Long userId;
    private String username;
    private String email;
    private String fullName;
    private String role;
    private Boolean isSuperAdmin;
    private Long organizationId;
    private String organizationSlug;
    private String organizationName;
    private java.util.List<String> authorizedApplications;
    private java.util.Set<String> permissions;
}
