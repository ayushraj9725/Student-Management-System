package com.student.management.iam.entity;

import com.student.management.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * School group entity representing organizational departments or committees.
 */
@Entity
@Table(
    name = "school_groups",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_org_group_name", columnNames = {"organization_id", "name"})
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class SchoolGroup extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "organization_id", nullable = false)
    private Long organizationId;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    public SchoolGroup(Long organizationId, String name, String description) {
        this.organizationId = organizationId;
        this.name = name;
        this.description = description;
    }
}
