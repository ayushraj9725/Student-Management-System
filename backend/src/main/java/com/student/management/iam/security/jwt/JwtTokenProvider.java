package com.student.management.iam.security.jwt;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Date;
import java.util.Map;

/**
 * Enterprise JWT Token Provider using JJWT 0.12.x HMAC-SHA256 signatures.
 */
@Slf4j
@Component
public class JwtTokenProvider {

    private final SecretKey key;
    private final long accessTokenExpirationMs;
    private final long refreshTokenExpirationMs;
    private final SecureRandom secureRandom = new SecureRandom();

    public JwtTokenProvider(
            @Value("${security.jwt.secret:404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970}") String secret,
            @Value("${security.jwt.access-token-expiration-ms:1800000}") long accessTokenExpirationMs,
            @Value("${security.jwt.refresh-token-expiration-ms:86400000}") long refreshTokenExpirationMs
    ) {
        byte[] keyBytes;
        try {
            keyBytes = Decoders.BASE64.decode(secret);
            if (keyBytes.length < 32) {
                keyBytes = java.security.MessageDigest.getInstance("SHA-256").digest(secret.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            }
        } catch (Exception ex) {
            try {
                keyBytes = java.security.MessageDigest.getInstance("SHA-256").digest(secret.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            } catch (Exception e) {
                keyBytes = secret.getBytes(java.nio.charset.StandardCharsets.UTF_8);
            }
        }
        this.key = Keys.hmacShaKeyFor(keyBytes);
        this.accessTokenExpirationMs = accessTokenExpirationMs;
        this.refreshTokenExpirationMs = refreshTokenExpirationMs;
    }

    /**
     * Generate short-lived stateless JWT Access Token with multi-tenant claims.
     */
    public String generateAccessToken(Long userId, String username, String email, String role, Boolean isSuperAdmin, Map<String, Object> extraClaims) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + accessTokenExpirationMs);

        var builder = Jwts.builder()
                .subject(username)
                .claim("userId", userId)
                .claim("email", email)
                .claim("role", role)
                .claim("isSuperAdmin", isSuperAdmin != null && isSuperAdmin)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(key);

        if (extraClaims != null && !extraClaims.isEmpty()) {
            extraClaims.forEach(builder::claim);
        }

        return builder.compact();
    }

    /**
     * Generate a short-lived Password Reset Token (10 minutes).
     */
    public String generatePasswordResetToken(String email) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + 600000); // 10 minutes

        return Jwts.builder()
                .subject(email)
                .claim("purpose", "PASSWORD_RESET")
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(key)
                .compact();
    }

    /**
     * Generate secure cryptographic random token for refresh token storage.
     */
    public String generateSecureRandomToken() {
        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }

    public String getUsernameFromToken(String token) {
        return getClaims(token).getSubject();
    }

    public Long getUserIdFromToken(String token) {
        Object val = getClaims(token).get("userId");
        if (val instanceof Number n) {
            return n.longValue();
        }
        return null;
    }

    public Claims getClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser().verifyWith(key).build().parseSignedClaims(token);
            return true;
        } catch (MalformedJwtException e) {
            log.error("Invalid JWT token format: {}", e.getMessage());
        } catch (ExpiredJwtException e) {
            log.warn("Expired JWT token: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            log.error("Unsupported JWT token: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            log.error("JWT claims string is empty: {}", e.getMessage());
        } catch (Exception e) {
            log.error("JWT validation failed: {}", e.getMessage());
        }
        return false;
    }

    public long getAccessTokenExpirationMs() {
        return accessTokenExpirationMs;
    }

    public long getRefreshTokenExpirationMs() {
        return refreshTokenExpirationMs;
    }
}
