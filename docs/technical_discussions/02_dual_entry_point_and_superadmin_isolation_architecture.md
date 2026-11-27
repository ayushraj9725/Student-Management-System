# Technical Decision Record: Dual Entry Point & Super Admin Isolation

**Document ID**: `TDR-002`  
**Status**: APPROVED  
**Target Release**: Multi-Tenant Core Architecture  
**Author**: Engineering Team  

---

## 1. WHAT: The Architecture Change

Segregate the entry points and authentication gateways into two independent boundaries:
1. **Platform Super Admin Gateway** (`/platform` -> to be transitioned to isolated port/subdomain in production).
2. **Tenant Institutional Portal** (`/[slug]/admin` and `/[slug]/login` for Principals, Teachers, Clerks, Students).

Enforce strict boundary validation so that:
- Normal institutional users cannot authenticate or open sessions at the Platform Gateway.
- Platform Super Admins do not operate inside tenant-scoped institutional workspaces without explicit audited impersonation.

---

## 2. WHY: Problem Analysis & Threat Vectors

1. **Shared Entry Point Vulnerability**: When Super Admins and School Clerks use the same login page, brute force attacks, credential stuffing, and session confusion attacks target the same perimeter.
2. **Reconnaissance Leak**: A unified login form reveals whether credentials belong to a Super Admin vs. regular staff, allowing attackers to discover high-privilege usernames.
3. **Session Context Pollution**: If a Super Admin logs into a shared frontend, tenant context headers (`X-Organization-Id`) can conflict with platform-wide operations, leading to state corruption.
4. **Targeted Security Enforcement**: Super Admins require strict policies (MFA/TOTP, IP whitelisting, tighter session timeouts of 15 minutes), whereas school staff require longer operational sessions (8 hours) and institutional branding.

---

## 3. HOW: Implementation Mechanics (Zero Auth Breakage)

```
                     Incoming Login Request
                                │
        ┌───────────────────────┴───────────────────────┐
        ▼                                               ▼
[Platform Gateway (/platform)]            [Tenant Portal (/[slug]/admin)]
        │                                               │
Enter Credentials                               Enter Credentials
        │                                               │
POST /api/v1/auth/login                         POST /api/v1/auth/login
(Unified Auth Service)                          (Unified Auth Service)
        │                                               │
Verify Password & Fetch User                    Verify Password & Fetch User
        │                                               │
Is PLATFORM_SUPER_ADMIN?                        Belongs to Tenant [slug]?
  ├── YES: Issue Token + Allow Access             ├── YES: Issue Token + Allow Access
  └── NO:  Reject with HTTP 403                   └── NO:  Reject with HTTP 403
           "Restricted Platform Gateway"                   "Access Restricted to Tenant"
```

### Key Engineering Invariants:
1. **Unified Backend IAM Remains Intact**: Password hashing (BCrypt), JWT generation, and token rotation algorithms do not change. No breaking schema changes.
2. **Gateway Scope Verification**:
   - At Platform Gateway: Reject immediately if user role is not `PLATFORM_SUPER_ADMIN` before mounting any admin console.
   - At Tenant Portal: Verify the user's membership belongs to the target tenant slug.
3. **Future Production Migration Path**:
   - The Platform Gateway UI can be extracted to a separate internal port (e.g. `port 8080` / `admin.internal`) or routed behind a VPN/Cloudflare Access policy without modifying backend IAM logic.

---

## 4. TRADEOFF ANALYSIS

| Approach | Pros | Cons | Decision |
| :--- | :--- | :--- | :--- |
| **A. Completely Separate Backend Auth Services** (Two Auth Microservices) | Total physical database and service isolation. | Massive code duplication; breaks single-sign-on; 2x maintenance burden; unnecessary complexity at current scale. | **REJECTED** |
| **B. Single Entry Point with Client-Side Post-Login Redirect** | Zero extra endpoints needed. | Information disclosure; security by obscurity; leaks superadmin presence to attackers. | **REJECTED** |
| **C. Dual Gateway with Unified Backend IAM & Scope Enforcement** (Chosen) | Zero auth breakage; strict role-boundary enforcement; seamless future transition to separate internal port/subdomain; clean user UX. | Requires dedicated login components for Platform vs Tenant. | **ACCEPTED** |

---

## 5. Security & Recovery Roadmap (Next Actions)

1. **Dedicated Platform Gateway View**: Update `/platform` to render a specialized, hardened `PlatformAuthGateway` component (distinct from the school login).
2. **Scope Pre-Check**: Block non-superadmins at the gateway level with audit logging.
3. **TOTP / MFA Foundation**: Prepare TOTP secret column on `User` entity for Super Admins and School Heads.
4. **Break-Glass Revocation**: Endpoint to revoke all active tokens for a compromised admin identifier immediately.
