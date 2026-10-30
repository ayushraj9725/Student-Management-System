package com.student.management.iam.security.entity;

import com.student.management.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.ZonedDateTime;

/**
 * Entity tracking one-time passwords, attempts, and verification state.
 */
@Entity
@Table(name = "otp_verifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class OtpVerification extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "email", nullable = false, length = 150)
    private String email;

    @Column(name = "otp_code", nullable = false, length = 10)
    private String otpCode;

    @Column(name = "purpose", nullable = false, length = 50)
    private String purpose;

    @Column(name = "expires_at", nullable = false)
    private ZonedDateTime expiresAt;

    @Builder.Default
    @Column(name = "attempt_count")
    private Integer attemptCount = 0;

    @Builder.Default
    @Column(name = "is_verified")
    private Boolean isVerified = false;

    public boolean isExpired() {
        return expiresAt.isBefore(ZonedDateTime.now());
    }
}
