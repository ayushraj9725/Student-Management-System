package com.student.management.shared.filter;

import com.student.management.iam.entity.Membership;
import com.student.management.iam.enums.MembershipStatus;
import com.student.management.iam.repository.MembershipRepository;
import com.student.management.iam.security.jwt.JwtTokenProvider;
import com.student.management.platform.entity.Organization;
import com.student.management.platform.enums.OrganizationStatus;
import com.student.management.platform.repository.OrganizationRepository;
import com.student.management.shared.context.TenantContext;
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
import java.util.Optional;

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
    private final MembershipRepository membershipRepository;
    private final JwtTokenProvider jwtTokenProvider;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        Organization org = null;
        Long callerUserId = null;
        Long callerMembershipId = null;
        String callerRole = null;
        boolean isSuperAdmin = false;
        boolean isMemberSuspended = false;

        // 1. Check Bearer JWT for cryptographically verified organization claim
        String bearerToken = extractJwtFromRequest(request);
        if (StringUtils.hasText(bearerToken) && jwtTokenProvider.validateToken(bearerToken)) {
            try {
                Claims claims = jwtTokenProvider.getClaims(bearerToken);
                Boolean isSuper = (Boolean) claims.get("isSuperAdmin");
                isSuperAdmin = Boolean.TRUE.equals(isSuper);
                Object orgIdObj = claims.get("org_id");
                Object membershipIdObj = claims.get("membership_id");
                Object userIdObj = claims.get("userId");
                callerRole = (String) claims.get("role");

                if (userIdObj instanceof Number n) {
                    callerUserId = n.longValue();
                }
                if (membershipIdObj instanceof Number n) {
                    callerMembershipId = n.longValue();
                }

                if (!isSuperAdmin && orgIdObj != null) {
                    Long jwtOrgId = ((Number) orgIdObj).longValue();
                    org = organizationRepository.findById(jwtOrgId).orElse(null);
                    if (org != null) {
                        log.debug("Enforced cryptographically verified JWT tenant ID {} for user '{}'",
                                jwtOrgId, claims.getSubject());

                        // Server-side active membership check to detect mid-session suspension or revocation
                        if (callerUserId != null && !request.getRequestURI().startsWith("/api/v1/auth/")) {
                            Optional<Membership> membershipOpt = membershipRepository.findByUserIdAndOrganizationId(callerUserId, org.getId());
                            if (membershipOpt.isEmpty()) {
                                log.warn("Rejected JWT for user {} in org {}: active membership not found or deleted",
                                        callerUserId, org.getId());
                                sendForbiddenErrorResponse(response, "Membership Revoked",
                                        "Your institutional membership in '" + org.getName() + "' is not active or has been revoked.");
                                return;
                            }
                            Membership membership = membershipOpt.get();
                            if (MembershipStatus.REJECTED.equals(membership.getStatus())) {
                                log.warn("Rejected JWT for user {} in org {}: membership status is REJECTED",
                                        callerUserId, org.getId());
                                sendForbiddenErrorResponse(response, "Membership Rejected",
                                        "Your institutional membership request in '" + org.getName() + "' was rejected.");
                                return;
                            }
                            callerMembershipId = membership.getId();
                            if (MembershipStatus.SUSPENDED.equals(membership.getStatus())) {
                                isMemberSuspended = true;
                            }
                        }
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
            boolean isOrgSuspended = OrganizationStatus.SUSPENDED.equals(org.getStatus());
            boolean effectiveSuspended = isOrgSuspended || isMemberSuspended;

            TenantContext tenantContext = new TenantContext(
                    callerUserId,
                    org.getId(),
                    callerMembershipId,
                    org.getSlug(),
                    callerRole,
                    isSuperAdmin,
                    effectiveSuspended
            );
            TenantContextHolder.setContext(tenantContext);

            // Enforce read-only constraint: suspended organizations or suspended members can VIEW but not EDIT/MODIFY data
            if (effectiveSuspended && isWriteRequest(request)) {
                String reason = isOrgSuspended
                        ? "Organization '" + org.getName() + "' is suspended by platform administration."
                        : "Your institutional staff membership in '" + org.getName() + "' is suspended by school administration.";
                log.warn("Blocked mutative request [{}] {} for suspended context: {}",
                        request.getMethod(), request.getRequestURI(), reason);
                sendSuspendedErrorResponse(response, reason);
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

    private void sendForbiddenErrorResponse(HttpServletResponse response, String errorTitle, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        String safeTitle = errorTitle != null ? errorTitle.replace("\"", "\\\"") : "Forbidden";
        String safeMsg = message != null ? message.replace("\"", "\\\"") : "Access denied.";
        String json = "{\"status\":403,\"error\":\"" + safeTitle + "\",\"message\":\"" + safeMsg + "\"}";
        response.getWriter().write(json);
        response.getWriter().flush();
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
