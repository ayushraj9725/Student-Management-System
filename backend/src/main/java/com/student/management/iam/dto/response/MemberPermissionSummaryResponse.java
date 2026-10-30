package com.student.management.iam.dto.response;

import com.student.management.iam.enums.MembershipStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MemberPermissionSummaryResponse {
    private Long membershipId;
    private Long userId;
    private String fullName;
    private String username;
    private String email;
    private Long organizationId;
    private MembershipStatus status;
    private List<String> directRoles;
    private List<String> groupNames;
    private List<String> groupInheritedRoles;
    private Set<String> effectivePermissions;
}
