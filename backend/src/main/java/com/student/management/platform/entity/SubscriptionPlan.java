package com.student.management.platform.entity;

import com.student.management.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * Subscription plan entity representing billing tier and quota limits.
 */
@Entity
@Table(name = "subscription_plans")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class SubscriptionPlan extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, unique = true, length = 50)
    private String name;

    @Builder.Default
    @Column(name = "max_students", nullable = false)
    private Integer maxStudents = 100;

    @Builder.Default
    @Column(name = "max_staff", nullable = false)
    private Integer maxStaff = 10;

    @Builder.Default
    @Column(name = "price_cents", nullable = false)
    private Integer priceCents = 0;

    @Column(name = "features_json", columnDefinition = "TEXT")
    private String featuresJson;

    public SubscriptionPlan(String name, Integer maxStudents, Integer maxStaff, Integer priceCents, String featuresJson) {
        this.name = name;
        this.maxStudents = maxStudents;
        this.maxStaff = maxStaff;
        this.priceCents = priceCents;
        this.featuresJson = featuresJson;
    }
}
