package com.student.management.iam.entity;

import com.student.management.iam.enums.MembershipStatus;
import com.student.management.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.ZonedDateTime;

/**
 * Membership entity linking global users to tenant schools with approval status.
 */
@Entity
@Table(
    name = "memberships",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_org", columnNames = {"user_id", "organization_id"})
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Membership extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "organization_id", nullable = false)
    private Long organizationId;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private MembershipStatus status = MembershipStatus.PENDING_APPROVAL;

    @Column(name = "approved_by")
    private Long approvedBy;

    @Column(name = "approved_at")
    private ZonedDateTime approvedAt;

    public Membership(Long userId, Long organizationId, MembershipStatus status) {
        this.userId = userId;
        this.organizationId = organizationId;
        this.status = status != null ? status : MembershipStatus.PENDING_APPROVAL;
    }
}
