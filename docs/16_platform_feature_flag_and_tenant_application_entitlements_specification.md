# Platform Feature Flag & Tenant Application Entitlements Architecture

## 1. Executive Summary & Purpose

In modern B2B SaaS platforms serving institutional clients (e.g., schools, universities, enterprise organizations), software capabilities cannot be treated as a one-size-fits-all binary monolith. Different institutions operate under different tiers, budgets, and operational workflows:

* A primary school may only require **Staff & Student Records** and **Daily Attendance**.
* A large private academy may license **Examination & Results Moderation** and **Tuition Fee & Finance Management**.
* All institutions require **Institutional Identity & Access Management (IAM)** to govern staff roles and permissions.

This document formalizes the **Platform-Level Feature Flag & Application Entitlements Architecture** of My School Care. It documents how applications are centrally defined in the platform catalog, conditionally provisioned to specific institutional tenants by Platform Super Administrators, and dynamically rendered to authorized staff members without cross-tenant data leakage.

---

## 2. Architectural Pillars & Core Technologies

| Layer | Technology | Architectural Role |
| :--- | :--- | :--- |
| **Platform Governance UI** | Next.js 15 (Port 4001) | Dedicated, dark-themed control center isolated from tenant school portals. Exposes tenant catalog toggles and quota metrics. |
| **Institutional Workspace UI** | Next.js 15 (Port 4000) | School-facing portal rendering only the specific applications provisioned to the authenticated institution. |
| **API & Business Logic** | Spring Boot 3.x (Java 21) | Dual-scope REST services (`PLATFORM` vs `TENANT`) enforcing cryptographic boundaries and 3-tier entitlement gating. |
| **Database Persistence** | PostgreSQL (Relational) | Shared-database model with strict logical partitioning using foreign-keyed tenant collections (`organization_enabled_applications`). |
| **Request Thread Isolation** | Spring Servlet Filter (`ThreadLocal`) | Request-scoped tenant context propagation with guaranteed thread cleanup to eliminate memory leaks and cross-tenant pollution. |

---

## 3. The 3-Tier Application Gating Model

Access to any SaaS application inside My School Care must pass through three distinct hierarchical evaluation gates:

```
┌─────────────────────────────────────────────────────────────┐
│ Tier 1: Master Platform Registry                            │
│ (All applications engineered and registered on the SaaS)    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Tier 2: Tenant Entitlement Gate (Platform Feature Flag)      │
│ Has Platform Super Admin provisioned this app to School X?  │
│  ├── NO  ──► Application completely HIDDEN & BLOCKED        │
│  └── YES ──► Proceeds to Tier 3                             │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Tier 3: Institutional RBAC Gate                             │
│ Does the logged-in staff member have the role or permission?│
│  ├── Principal / Admin  ──► Full access to enabled app      │
│  ├── Permitted Staff    ──► Granted access                  │
│  └── Unpermitted Staff  ──► Action locked or restricted     │
└─────────────────────────────────────────────────────────────┘
```

### Tier 1: Platform Master Registry
The master registry catalog enumerates all available modules across the platform:
1. **Staff & Student Records (`STUDENT_MANAGEMENT`):** Core academic student enrollment and course assignment.
2. **Identity & Access Management (`IAM_GOVERNANCE`):** Role-based access control, permission groups, and staff membership.
3. **Attendance Management (`ATTENDANCE`):** Biometric tracking, roll call logs, and leave workflows.
4. **Examination & Grading (`EXAMINATION`):** Grade books, marks moderation, report cards.
5. **Fee & Finance Management (`FINANCE`):** Tuition billing, concessions, fee structures, accounting ledgers.
6. **Platform Control (`PLATFORM_CONTROL`):** Isolated exclusively to Platform Super Admins; strictly filtered out of all tenant catalogs.

### Tier 2: Tenant Entitlement Gating (Platform Feature Flag)
Platform Super Administrators hold sovereign authority over institutional contracts. Through the Platform Control Panel, the Super Admin toggles which modules are entitled to which tenant. If a school has not licensed the **Finance** module:
* The module is marked `isAvailable: false`.
* The module is marked `isAuthorized: false`.
* Staff, teachers, and even the School Principal cannot see or open that application.

### Tier 3: Institutional RBAC Gating
If a module is enabled at the school level (Tier 2 passes), the user's effective permissions and roles are evaluated:
* Institutional Administrators/Principals automatically inherit operating rights over all enabled school modules.
* Teachers, accountants, or librarians only see modules matching their assigned roles (e.g., an accountant sees Fee Management, but not Examination Grading).

---

## 4. End-to-End Operational Lifecycle

### Workflow 1: School Onboarding & Initial Provisioning
1. Platform Super Admin logs in to **Port 4001** (`http://localhost:4001/platform`).
2. Super Admin clicks **"Onboard School"**, enters the institutional name, unique slug (`dps-rkpuram`), administrative email, and assigns a subscription plan.
3. The platform persists the organization and provisions the default baseline applications (`STUDENT_MANAGEMENT`, `IAM_GOVERNANCE`, `ATTENDANCE`).
4. An activation OTP is securely dispatched to the school administrator's registered email.

### Workflow 2: Dynamic Application Entitlement Modification
1. From the **Tenant Directory** table on the Platform Control Panel, the Super Admin clicks the **Apps** button next to an institution.
2. The **Application Entitlements Modal** opens, displaying all SaaS modules with their real-time activation status.
3. Super Admin toggles an application (e.g., enables **Examination & Results** or disables **Fee & Finance**).
4. Super Admin clicks **"Save Entitlements"**:
   * The frontend sends an authenticated `PUT` request with cryptographic `PLATFORM` scope headers.
   * Spring Boot verifies the caller is a Platform Super Admin.
   * The database transaction updates the `organization_enabled_applications` table.
   * Changes take effect **immediately in real time** without requiring server restarts or database migrations.

### Workflow 3: School Staff Discovery & Authorization
1. School staff member visits **Port 4000** (`http://localhost:4000`) and logs in.
2. The client application calls `GET /api/v1/applications/user-entitlements` with the tenant's slug.
3. The backend resolves the organization's entitled applications from the database:
   * Any application disabled by the Platform Super Admin is stripped from the active menu.
   * Enabled applications are rendered on the staff discovery launchpad with real-time status indicators.

---

## 5. Architectural Decisions & Tradeoffs

### Decision 1: Shared Database with Foreign-Keyed Collection vs Database-per-Tenant
* **Decision:** Used a unified relational database where organizations link to an `organization_enabled_applications` collection table.
* **Why:** Running separate database instances or separate schemas per school introduces extreme operational complexity, slow schema migrations, and high cloud costs for thousands of schools. A shared relational collection provides instant querying, zero-downtime provisioning, and transactional consistency.
* **Tradeoff:** Requires strict programmatic query isolation (`tenant_id` verification) at the data access layer to prevent data leakage.

### Decision 2: Dual Network Gateways (Port 4000 vs 4001)
* **Decision:** Separated the Platform Super Admin portal (Port 4001) from the Institutional School portal (Port 4000) at the network layer.
* **Why:** In production, Port 4001 can be placed behind private enterprise VPNs, IP whitelists, or internal subnets, while Port 4000 remains publicly accessible to students, parents, and staff. This drastically minimizes the attack surface against the platform control layer.
* **Tradeoff:** Requires dual-port dev running configurations and reverse-proxy ingress path routing in production.

### Decision 3: Client-Side Port Scope Detection vs Edge Middleware
* **Decision:** Implemented client-side runtime port detection in the root page rather than Node.js Edge middleware.
* **Why:** Edge runtime on Windows environments proved unstable when parsing low-level host network sockets, producing intermittent `500 Internal Server Error` crashes. Client-side browser port detection is 100% stable, cross-platform, and free of runtime dependencies.
* **Tradeoff:** Requires a fraction-of-a-second client mount before executing the redirect.

---

## 6. Verification & Automated Test Coverage

The feature flag and entitlement system is guarded by a comprehensive automated test suite in the backend:

1. **`PlatformAdminServiceTest` (Platform Ops Layer):**
   * Verifies atomic updates to tenant application sets.
   * Verifies resource validation and error handling for invalid tenant IDs.
   * Verifies that the platform catalog strictly isolates and excludes `PLATFORM_CONTROL` from all school offerings.

2. **`ApplicationEntitlementServiceTest` (Institutional Gating Layer):**
   * Verifies that School Principals receive all applications provisioned to their school.
   * Verifies that unprovisioned applications are strictly blocked even for administrative school users.
   * Verifies that staff permissions cannot bypass tenant-level feature flags (if an app is disabled by the platform, staff cannot access it even with explicit role permissions).
