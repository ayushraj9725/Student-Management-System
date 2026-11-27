package com.student.management.iam.security.entity;

import com.student.management.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.ZonedDateTime;

/**
 * Entity tracking cryptographic refresh tokens for revokable session management.
 */
@Entity
@Table(name = "refresh_tokens")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class RefreshToken extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "token_hash", nullable = false, unique = true, length = 255)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private ZonedDateTime expiresAt;

    @Builder.Default
    @Column(name = "is_revoked", nullable = false)
    private boolean isRevoked = false;

    @Column(name = "revoked_at")
    private ZonedDateTime revokedAt;

    @Column(name = "replaced_by_token", length = 255)
    private String replacedByToken;

    public boolean isExpired() {
        return expiresAt.isBefore(ZonedDateTime.now());
    }

    public boolean isWithinGracePeriod(long gracePeriodSeconds) {
        if (!isRevoked || revokedAt == null) {
            return false;
        }
        return revokedAt.plusSeconds(gracePeriodSeconds).isAfter(ZonedDateTime.now());
    }
}
