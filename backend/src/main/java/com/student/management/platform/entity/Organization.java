package com.student.management.platform.entity;

import com.student.management.platform.enums.OrganizationStatus;
import com.student.management.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/**
 * Organization entity representing a tenant school registered on the platform.
 */
@Entity
@Table(name = "organizations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Organization extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "slug", nullable = false, unique = true, length = 100)
    private String slug;

    @Column(name = "plan_id", nullable = false)
    private Long planId;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private OrganizationStatus status = OrganizationStatus.ACTIVE;

    @Column(name = "contact_email", nullable = false, length = 150)
    private String contactEmail;

    @Builder.Default
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "organization_enabled_applications", joinColumns = @JoinColumn(name = "organization_id"))
    @Column(name = "application_code", nullable = false, length = 60)
    private Set<String> enabledApplications = new HashSet<>(Arrays.asList("STUDENT_MANAGEMENT", "IAM_GOVERNANCE", "ATTENDANCE"));

    public Set<String> getEnabledApplicationCodes() {
        if (enabledApplications == null || enabledApplications.isEmpty()) {
            return new HashSet<>(Arrays.asList("STUDENT_MANAGEMENT", "IAM_GOVERNANCE", "ATTENDANCE"));
        }
        return enabledApplications;
    }

    public Organization(String name, String slug, Long planId, OrganizationStatus status, String contactEmail) {
        this.name = name;
        this.slug = slug;
        this.planId = planId;
        this.status = status != null ? status : OrganizationStatus.ACTIVE;
        this.contactEmail = contactEmail;
    }
}
