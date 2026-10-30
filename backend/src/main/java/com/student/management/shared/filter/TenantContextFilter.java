package com.student.management.shared.filter;

import com.student.management.iam.security.jwt.JwtTokenProvider;
import com.student.management.platform.entity.Organization;
import com.student.management.platform.enums.OrganizationStatus;
import com.student.management.platform.repository.OrganizationRepository;
import com.student.management.shared.context.TenantContextHolder;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Filter that intercepts incoming HTTP requests to resolve the tenant context.
 * Non-superadmin users have their tenant context cryptographically enforced from their JWT,
 * preventing cross-tenant parameter tampering or stale frontend header bleed.
 * In read-only mode for suspended organizations: Safe GET/HEAD/OPTIONS requests are allowed
 * so users can view data without issues, while mutative write/edit requests (POST/PUT/PATCH/DELETE)
 * are rejected with a clean 403 response.
 */
@Slf4j
@Component
@Order(1)
@RequiredArgsConstructor
public class TenantContextFilter extends OncePerRequestFilter {

    private final OrganizationRepository organizationRepository;
    private final JwtTokenProvider jwtTokenProvider;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        Organization org = null;

        // 1. Check Bearer JWT for cryptographically verified organization claim
        String bearerToken = extractJwtFromRequest(request);
        if (StringUtils.hasText(bearerToken) && jwtTokenProvider.validateToken(bearerToken)) {
            try {
                Claims claims = jwtTokenProvider.getClaims(bearerToken);
                Boolean isSuper = (Boolean) claims.get("isSuperAdmin");
                Object orgIdObj = claims.get("org_id");

                if (!Boolean.TRUE.equals(isSuper) && orgIdObj != null) {
                    Long jwtOrgId = ((Number) orgIdObj).longValue();
                    org = organizationRepository.findById(jwtOrgId).orElse(null);
                    if (org != null) {
                        log.debug("Enforced cryptographically verified JWT tenant ID {} for user '{}'",
                                jwtOrgId, claims.getSubject());
                    }
                }
            } catch (Exception ex) {
                log.warn("Unable to extract tenant context from JWT claims: {}", ex.getMessage());
            }
        }

        // 2. If no JWT tenant claim (e.g. Platform SuperAdmin or unauthenticated query), fallback to headers/query params
        if (org == null) {
            String tenantHeader = request.getHeader("X-Tenant-ID");
            String tenantSlugHeader = request.getHeader("X-Tenant-Slug");
            if (tenantHeader == null || tenantHeader.isBlank()) {
                tenantHeader = tenantSlugHeader;
            }
            if (tenantHeader == null || tenantHeader.isBlank()) {
                tenantHeader = request.getParameter("tenantId");
            }
            if (tenantHeader == null || tenantHeader.isBlank()) {
                tenantHeader = request.getParameter("slug");
            }
            if (tenantHeader == null || tenantHeader.isBlank()) {
                tenantHeader = request.getParameter("orgId");
            }

            if (tenantHeader != null && !tenantHeader.isBlank()) {
                try {
                    Long tenantId = Long.parseLong(tenantHeader);
                    org = organizationRepository.findById(tenantId).orElse(null);
                } catch (NumberFormatException ignored) {
                    org = organizationRepository.findBySlug(tenantHeader).orElse(null);
                }
            }
        }

        if (org != null) {
            boolean isSuspended = OrganizationStatus.SUSPENDED.equals(org.getStatus());
            TenantContextHolder.setTenantId(org.getId());
            TenantContextHolder.setSuspended(isSuspended);

            // Enforce read-only constraint: suspended organizations can VIEW but not EDIT/MODIFY data
            if (isSuspended && isWriteRequest(request)) {
                log.warn("Blocked mutative request [{}] {} for suspended tenant: {}",
                        request.getMethod(), request.getRequestURI(), org.getName());
                sendSuspendedErrorResponse(response, org.getName());
                return;
            }
        }

        try {
            filterChain.doFilter(request, response);
        } finally {
            TenantContextHolder.clear();
        }
    }

    private String extractJwtFromRequest(HttpServletRequest request) {
        String bearer = request.getHeader("Authorization");
        if (StringUtils.hasText(bearer) && bearer.startsWith("Bearer ")) {
            return bearer.substring(7);
        }
        return null;
    }

    private boolean isWriteRequest(HttpServletRequest request) {
        String method = request.getMethod();
        if ("GET".equalsIgnoreCase(method) || "HEAD".equalsIgnoreCase(method) || "OPTIONS".equalsIgnoreCase(method)) {
            return false;
        }

        String uri = request.getRequestURI();
        // Allow authentication endpoints (login, logout, token refresh, password recovery)
        if (uri.startsWith("/api/v1/auth/")) {
            return false;
        }
        // Allow platform administration operations (e.g. superadmin unsuspending school)
        if (uri.startsWith("/api/v1/platform/")) {
            return false;
        }

        return true;
    }

    private void sendSuspendedErrorResponse(HttpServletResponse response, String orgName) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        String safeName = orgName != null ? orgName.replace("\"", "\\\"") : "Institution";
        String json = "{\"status\":403,\"error\":\"Tenant Suspended\",\"message\":\"Organization '" 
                + safeName + "' is suspended by platform administration. Write and edit operations are disabled in read-only mode.\"}";
        response.getWriter().write(json);
        response.getWriter().flush();
    }
}
