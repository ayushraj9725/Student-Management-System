package com.student.management.iam.entity;

import com.student.management.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * Mapping entity assigning roles to departmental school groups.
 */
@Entity
@Table(
    name = "group_role_mapping",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_group_role", columnNames = {"group_id", "role_id"})
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class GroupRoleMapping extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "group_id", nullable = false)
    private Long groupId;

    @Column(name = "role_id", nullable = false)
    private Long roleId;

    public GroupRoleMapping(Long groupId, Long roleId) {
        this.groupId = groupId;
        this.roleId = roleId;
    }
}
