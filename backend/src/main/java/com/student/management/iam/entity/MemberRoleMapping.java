package com.student.management.iam.entity;

import com.student.management.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * Mapping entity assigning exceptional or custom roles directly to individual members.
 */
@Entity
@Table(
    name = "member_role_mapping",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_member_role", columnNames = {"membership_id", "role_id"})
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class MemberRoleMapping extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "membership_id", nullable = false)
    private Long membershipId;

    @Column(name = "role_id", nullable = false)
    private Long roleId;

    public MemberRoleMapping(Long membershipId, Long roleId) {
        this.membershipId = membershipId;
        this.roleId = roleId;
    }
}
