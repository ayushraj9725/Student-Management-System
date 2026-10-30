package com.student.management.iam.entity;

import com.student.management.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * Mapping entity enrolling staff members into departmental school groups.
 */
@Entity
@Table(
    name = "membership_group_mapping",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_membership_group", columnNames = {"membership_id", "group_id"})
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class MembershipGroupMapping extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "membership_id", nullable = false)
    private Long membershipId;

    @Column(name = "group_id", nullable = false)
    private Long groupId;

    public MembershipGroupMapping(Long membershipId, Long groupId) {
        this.membershipId = membershipId;
        this.groupId = groupId;
    }
}
