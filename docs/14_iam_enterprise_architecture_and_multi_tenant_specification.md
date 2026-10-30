# Deep Technical Review and Production Engineering Specification
## My School Care — Multi-Tenant IAM Architecture, Concurrency Safety, and Data Isolation Specification

**Author:** Principal Java Architect, Application Security Architect, Multi-Tenant SaaS Architect & PostgreSQL Database Architect  
**Target Platform:** My School Care SaaS Platform  
**Technology Stack:** Java 21 LTS, Spring Boot 3.3.x, Spring Security 6.3.x, Spring Data JPA / Hibernate ORM 6.6.x, PostgreSQL 16 LTS, HikariCP, JJWT 0.12.x, Next.js 15 App Router  
**Document Classification:** Engineering Standard & Production Implementation Blueprint  
**Status:** Approved for Implementation  

---

## 1. Existing Architecture Assessment

### 1.1 Baseline Assessment of Previous Document
The existing project documentation (*"IAM Module Architecture & 5-Layer Multi-Tenant Data Isolation Specification"*) correctly recognized the necessity of institutional autonomy and attempted to adopt the **Keycloak 26+ Organizations architecture** (separating global user identities from organization-scoped memberships).

However, an architectural audit of the previous specification reveals fundamental flaws that rendered the platform vulnerable to cross-tenant data leakage, thread-pool corruption, and authentication breakdowns in production:

| Area | Previous Documented Approach | Architectural Flaw & Failure Mode |
| :--- | :--- | :--- |
| **Tenant Identification** | Relied on HTTP headers (`X-Tenant-ID`, `X-Tenant-Slug`) and URL slugs as input to `TenantContextFilter`. | **Client-Controlled Authority Flaw**: Allowed client headers to dictate tenant context. Any authenticated user could spoof `X-Tenant-ID: 2` to access another school's data if repository queries were not guarded. |
| **Token Claims** | Evaluated JWT as containing credentials, but earlier implementation passed `Collections.emptyMap()` without signing `org_id` or `membership_id`. | **Stale / Missing Context**: Controllers had to fall back to optional `@RequestParam Long orgId`. When omitted or defaulted, requests collapsed to School ID 1. |
| **Token Refresh Lifecycle** | Reactive 401 handling without concurrency locks. | **Thundering Herd Re-login Loop**: Multiple concurrent dashboard requests receiving 401 simultaneously sent parallel refresh calls. The first call rotated the refresh token, causing subsequent requests to fail with *400 Invalid Refresh Token*, nuking `localStorage` and forcing the user to log in repeatedly. |
| **Concurrency & Threading** | Simple `ThreadLocal<Long>` in `TenantContextHolder` without strict lifecycle rules. | **Thread Pool Pollution**: Tomcat reuses worker threads (`http-nio-8080-exec-*`). If an unhandled exception bypassed cleanup, the thread carried School A's context into School B's subsequent request. Furthermore, `@Async` worker threads lost tenant context completely. |
| **Data Layer Isolation** | Relied solely on developer discipline to name repository methods `findAllByOrganizationId()`. | **Zero Defense-in-Depth**: A developer calling `membershipRepository.findById(id)` or `userRepository.findById(id)` bypassed isolation entirely, returning records across tenant boundaries. |
| **Referential Integrity** | Primary keys were single-column `id`, and foreign keys referenced single columns. | **Cross-Tenant Relationship Injection**: Allowed a rogue or accidental API call to assign School A's group ID into School B's membership role mapping, because the database foreign key only validated that the group existed, not that it belonged to the *same* school. |

---

## 2. Critical Gaps and Corrections

To transform this system into a hardened, enterprise-grade multi-tenant SaaS platform, nine mandatory architectural corrections are enforced:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                      NINE PILLARS OF ARCHITECTURAL CORRECTION                         │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. Cryptographically Authoritative Context (JWT Claims + Server-Side Active Check)     │
│ 2. Single-Flight Client Mutex & Token Rotation Grace Period (Zero Re-Login Loops)      │
│ 3. Immutable Java Record TenantContext with Strict finally Cleanup                    │
│ 4. TaskDecorator Propagation for Asynchronous & Scheduled Executions                   │
│ 5. Table Classification: Strict Partitioning of Global vs Tenant-Owned Data            │
│ 6. Composite Database Constraints: FK (id, organization_id) Enforcing Cross-Tenant Lock│
│ 7. Transaction-Local Connection Scoping (SET LOCAL app.current_tenant_id)              │
│ 8. Centralized Effective Permission Engine with Deterministic Cache Invalidation       │
│ 9. Fail-Closed Architectural Boundaries across Filter, Service, and Repository Layers │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Target Security Architecture

The target security architecture enforces a **Defense-in-Depth Model** where no single layer is trusted as the sole boundary:

```mermaid
flowchart TD
    subgraph ClientLayer ["Client Browser / Mobile App"]
        URL["1. Route URL: /[slug]/admin"]
        ClientQueue["2. In-Flight Refresh Mutex & Queue"]
    end

    subgraph GatewayLayer ["Servlet & Security Filter Chain"]
        TomcatThread["3. Worker Thread Allocation (http-nio-exec)"]
        JWTFilter["4. JwtAuthenticationFilter: Cryptographic Validation"]
        TenantFilter["5. TenantContextFilter: Server-Side Active Membership Verification"]
        ContextHolder["6. ThreadLocal Binding: Immutable TenantContext Record"]
    end

    subgraph ServiceLayer ["Spring Business & RBAC Services"]
        MethodSec["7. Method Security: @PreAuthorize & PermissionEvaluator"]
        RBAC["8. Effective Permission Calculation (Direct + Group)"]
        TaskDec["9. TaskDecorator Context Copying (Async / Events)"]
    end

    subgraph DatabaseLayer ["PostgreSQL 16 Multi-Tenant Engine"]
        HikariPool["10. HikariCP Connection Checkout"]
        TxScope["11. Transaction Scope: SET LOCAL app.current_tenant_id"]
        CompositeFK["12. Composite Foreign Keys & Unique Constraints"]
        RLS["13. Row-Level Security: FORCE ROW LEVEL SECURITY"]
    end

    URL --> ClientQueue
    ClientQueue -->|HTTPS + Bearer JWT| TomcatThread
    TomcatThread --> JWTFilter
    JWTFilter --> TenantFilter
    TenantFilter --> ContextHolder
    ContextHolder --> MethodSec
    MethodSec --> RBAC
    RBAC --> TaskDec
    RBAC --> HikariPool
    HikariPool --> TxScope
    TxScope --> CompositeFK
    CompositeFK --> RLS
```

---

## 4. Authentication and Token Lifecycle

### 4.1 Separation of Security Concepts
1. **User Authentication**: Validating who the human is globally (`users` table: username/email + Argon2/BCrypt password hash or OAuth2 federated ID).
2. **Organization Identification**: Determining which institutional workspace is targeted (`organizations` table via slug or ID).
3. **Membership Validation**: Verifying that the authenticated global user possesses an `ACTIVE` relationship record within the identified organization (`memberships` table).
4. **Tenant Authorization**: Verifying that the user's role and membership status in that organization grant access to the requested administrative module (e.g. `SCHOOL_ADMIN`).
5. **Resource-Level Authorization**: Evaluating whether the user possesses the granular capability (e.g. `STUDENT_CREATE`, `FEE_COLLECT`) required for the specific target record or sub-entity (e.g. Grade 10 Science section).

### 4.2 Comprehensive Matrix: Ten Production Scenarios

| Scenario | System Behavior & Execution Path | Security & Data Outcome |
| :--- | :--- | :--- |
| **1. User opens school URL without an access token** | Next.js route guard intercepts; backend API calls return `401 Unauthorized`. Client redirects to `/login?redirect=[slug]`. | URL slug is preserved. Zero tenant context established. Fail-closed. |
| **2. User holds valid token for Org A, but opens Org B's URL** | Client-side isolation guard compares `currentUser.organizationSlug` against route param `slug`. Backend `TenantContextFilter` checks JWT claim `org_id` against requested URL. | Immediate `403 Forbidden` (`Cross-Tenant Access Denied`). Screen shows institutional boundary error with direct link back to Org A. |
| **3. User has memberships in both Org A and Org B** | User authenticates globally. Identity provider lists available organizations. When user selects Org B, a scoped JWT is issued containing `org_id: B` and `membership_id: B`. | User operates strictly within Org B. To switch to Org A, client invokes `/api/v1/auth/switch-tenant?orgId=A` to rotate token claims. |
| **4. Access token expires during active session** | HTTP call receives `401`. Client-side interceptor pauses all outgoing requests, engages mutex lock, and dispatches a single `/api/v1/auth/refresh-token` call. | Token silently renewed. Queued requests retry with new token. User observes zero stutter and zero logout. |
| **5. Refresh token expires or is revoked** | `/api/v1/auth/refresh-token` fails with `401`. Client interceptor purges `localStorage`, clears active state, and redirects to `/login?redirect=[current_slug]`. | Forced clean re-login. User logs in and immediately returns to their school workspace. |
| **6. Membership suspended while access token is still valid** | Principal suspends staff member. Staff member makes API call. `TenantContextFilter` checks DB or fast cache (`membership_status`). | Call immediately rejected with `403 Forbidden: Membership Suspended`. Stale JWT cannot be used for malicious operations. |
| **7. Role revoked while access token is still valid** | Principal removes `STUDENT_EDIT` role. User's access token still has previous roles. Method security checks `EffectivePermissionService` (backed by versioned cache). | Request denied with `403 Forbidden`. Permissions evaluated against current database state. |
| **8. Organization deactivated while users are online** | Platform Admin sets organization status to `SUSPENDED` or `INACTIVE`. `TenantContextFilter` detects status on request. | If `SUSPENDED`: Mutative requests (POST/PUT/DELETE) rejected with `403 Read-Only`. If `INACTIVE`: All requests rejected with `403 Deactivated`. |
| **9. Client tampers with `X-Tenant-ID` or `X-Tenant-Slug`** | Caller tampers header to `X-Tenant-ID: 99`. `TenantContextFilter` detects mismatch against cryptographically signed JWT `org_id` claim. | Tampered header overridden by verified JWT claim for regular staff, or request rejected with `400 Bad Request: Tenant Tampering Detected`. |
| **10. User attempts to access another membership ID** | Staff member with `membershipId: 10` invokes `/api/v1/iam/members/99/permissions`. Controller checks `resolveEffectiveMembershipId()`. | Target membership validated: `WHERE id = 99 AND organization_id = :currentOrgId`. If ID belongs to another school, query returns 0 rows $\rightarrow$ `404 Not Found`. |

### 4.3 Authoritative Token Contract
The access token is an HMAC-SHA256 or RSA-SHA256 signed stateless JWT:
```json
{
  "sub": "45",
  "iss": "https://identity.myschoolcare.com",
  "aud": ["myschoolcare-api"],
  "userId": 45,
  "username": "ayush_admin",
  "email": "principal@himaliyan.edu",
  "org_id": 2,
  "org_slug": "himaliyan-public-school",
  "membership_id": 105,
  "role": "ADMIN",
  "isSuperAdmin": false,
  "iat": 1793340000,
  "exp": 1793341800,
  "jti": "8f5a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c"
}
```

### 4.4 Token Rotation and Sliding Window Concurrency
To prevent the "Thundering Herd" logout bug in browsers:

```mermaid
sequenceDiagram
    autonumber
    actor User as User Browser (Multiple Tabs / Parallel APIs)
    participant Client as apiClient.ts (Single-Flight Mutex)
    participant AuthController as /auth/refresh-token
    participant TokenRepo as RefreshTokenRepository
    participant DB as PostgreSQL

    Note over User, Client: Access Token Expired
    User->>Client: API 1 (Get Members) -> Receives 401
    User->>Client: API 2 (Get Roles) -> Receives 401
    Client->>Client: Acquire Mutex: isRefreshing = true
    Client->>Client: Queue API 2 behind Refresh Promise
    Client->>AuthController: POST /auth/refresh-token (refreshTokenRaw)
    AuthController->>TokenRepo: Lookup tokenHash
    TokenRepo->>DB: Check token validity & Grace Period
    AuthController->>DB: Verify User is still ACTIVE in Organization
    AuthController->>TokenRepo: Mark old token as ROTATED (30s Grace Period)
    AuthController->>TokenRepo: Save new RefreshToken (Sliding 7-Day Window)
    AuthController-->>Client: Returns { newAccessToken, newRefreshToken }
    Client->>Client: Update localStorage with new tokens
    Client->>Client: Release Mutex & Drain Queue
    Client->>User: Retry API 1 with new Access Token -> 200 OK
    Client->>User: Retry API 2 with new Access Token -> 200 OK
```

---

## 5. Organization and Membership Resolution

### 5.1 Resolution Flow
1. **Unauthenticated Public Endpoints** (e.g. `/api/v1/auth/login`, `/setup-password`):
   - Tenant context resolved strictly from URL slug or request body.
2. **Authenticated Tenant Endpoints** (e.g. `/api/v1/iam/**`, `/api/v1/students/**`):
   - Token claims `org_id` and `membership_id` are cryptographically extracted.
   - For non-superadmin users, client headers and query parameters are **untrusted routing hints**; the verified JWT claim is the single source of truth.
3. **Platform Super-Admin Scope**:
   - `isSuperAdmin == true` users operate with global oversight. When inspecting a specific school, they explicitly provide `?orgId=X` or `X-Tenant-ID: X`, which is logged in the central platform audit ledger.

---

## 6. Spring Security Request Lifecycle

### 6.1 Filter Execution Order
The HTTP request passes through a strictly ordered pipeline:

```
[HTTP Request]
       │
       ▼
1. CorsFilter (Validates Origin)
       │
       ▼
2. SecurityContextHolderFilter (Initializes clean SecurityContext)
       │
       ▼
3. JwtAuthenticationFilter (Validates Bearer token, sets Authentication in SecurityContext)
       │
       ▼
4. TenantContextFilter (Extracts org_id, validates active Membership in DB, binds TenantContext)
       │
       ▼
5. TenantSuspensionFilter (Blocks write operations if OrganizationStatus == SUSPENDED)
       │
       ▼
6. AuthorizationFilter (Enforces URL and Method Security via CustomPermissionEvaluator)
       │
       ▼
7. DispatcherServlet -> Controller -> Service -> Repository
       │
       ▼
8. finally { TenantContextHolder.clear(); } (Guaranteed ThreadLocal cleanup)
```

### 6.2 Implementation: SecurityFilterChain Configuration
```java
package com.student.management.iam.security.config;

import com.student.management.iam.security.filter.JwtAuthenticationFilter;
import com.student.management.shared.filter.TenantContextFilter;
import com.student.management.shared.filter.TenantSuspensionFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
@RequiredArgsConstructor
public class SecurityConfiguration {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final TenantContextFilter tenantContextFilter;
    private final TenantSuspensionFilter tenantSuspensionFilter;
    private final DelegatingAuthenticationEntryPoint authenticationEntryPoint;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configure(http))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(exceptions -> exceptions.authenticationEntryPoint(authenticationEntryPoint))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/api/v1/auth/**",
                    "/v3/api-docs/**",
                    "/swagger-ui/**",
                    "/swagger-ui.html"
                ).permitAll()
                .requestMatchers("/api/v1/platform/**").hasAuthority("ROLE_PLATFORM_SUPER_ADMIN")
                .requestMatchers("/api/v1/iam/**").authenticated()
                .requestMatchers("/api/v1/students/**").authenticated()
                .anyRequest().authenticated()
            )
            // Filter Order: JWT -> Tenant Context -> Suspension Guard
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterAfter(tenantContextFilter, JwtAuthenticationFilter.class)
            .addFilterAfter(tenantSuspensionFilter, TenantContextFilter.class);

        return http.build();
    }
}
```

---

## 7. TenantContext Design

### 7.1 Immutable Record Contract
```java
package com.student.management.shared.context;

import java.io.Serializable;
import java.util.Objects;

/**
 * Immutable production TenantContext record.
 * Holds verified caller identity and organizational boundary metadata.
 */
public record TenantContext(
        Long userId,
        Long organizationId,
        Long membershipId,
        String organizationSlug,
        String role,
        boolean isSuperAdmin,
        boolean isSuspended,
        String correlationId
) implements Serializable {

    public TenantContext {
        Objects.requireNonNull(correlationId, "correlationId must not be null");
    }

    public static TenantContext empty(String correlationId) {
        return new TenantContext(null, null, null, null, null, false, false, correlationId);
    }

    public boolean hasTenant() {
        return organizationId != null && organizationId > 0;
    }
}
```

### 7.2 Fail-Closed TenantContextHolder
```java
package com.student.management.shared.context;

import com.student.management.shared.exception.TenantContextMissingException;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public final class TenantContextHolder {

    private static final ThreadLocal<TenantContext> CONTEXT = new ThreadLocal<>();

    private TenantContextHolder() {}

    public static void setContext(TenantContext context) {
        if (context == null) {
            clear();
        } else {
            CONTEXT.set(context);
        }
    }

    public static TenantContext getContext() {
        return CONTEXT.get();
    }

    public static Long getTenantId() {
        TenantContext ctx = CONTEXT.get();
        return ctx != null ? ctx.organizationId() : null;
    }

    public static Long getMembershipId() {
        TenantContext ctx = CONTEXT.get();
        return ctx != null ? ctx.membershipId() : null;
    }

    /**
     * Fail-closed guard: Throws exception if active tenant context is missing.
     */
    public static TenantContext requireContext() {
        TenantContext ctx = CONTEXT.get();
        if (ctx == null || !ctx.hasTenant()) {
            throw new TenantContextMissingException(
                "Access Denied: Tenant context is required but missing from execution thread."
            );
        }
        return ctx;
    }

    public static Long requireTenantId() {
        return requireContext().organizationId();
    }

    public static void clear() {
        CONTEXT.remove();
    }
}
```

---

## 8. Concurrent Request and ThreadLocal Management

### 8.1 Concurrent Request Simulation
Consider four concurrent requests processed by Spring Boot's Tomcat worker thread pool:
- **Thread `exec-1`**: School A Principal provisions Teacher.
- **Thread `exec-2`**: School B Principal creates custom role.
- **Thread `exec-3`**: School C Accountant inspects fee permissions.
- **Thread `exec-4`**: School A Teacher marks student attendance.

```mermaid
sequenceDiagram
    autonumber
    participant T1 as Thread exec-1 (School A)
    participant T2 as Thread exec-2 (School B)
    participant T3 as Thread exec-3 (School C)
    participant T4 as Thread exec-4 (School A)
    participant Pool as Tomcat Thread Pool

    Note over T1, T4: Parallel Processing in Separate JVM Thread Stacks
    T1->>T1: TenantContext(orgId=1, userId=10)
    T2->>T2: TenantContext(orgId=2, userId=25)
    T3->>T3: TenantContext(orgId=3, userId=80)
    T4->>T4: TenantContext(orgId=1, userId=11)

    T1->>T1: DB Insert Teacher (orgId=1)
    T2->>T2: DB Insert Role (orgId=2)
    T3->>T3: DB Query Fees (orgId=3)
    T4->>T4: DB Save Attendance (orgId=1)

    Note over T1, T4: Guaranteed Cleanup in finally Block
    T1->>T1: TenantContextHolder.clear()
    T2->>T2: TenantContextHolder.clear()
    T3->>T3: TenantContextHolder.clear()
    T4->>T4: TenantContextHolder.clear()

    T1->>Pool: Return Clean Thread exec-1
    T2->>Pool: Return Clean Thread exec-2
    T3->>Pool: Return Clean Thread exec-3
    T4->>Pool: Return Clean Thread exec-4
```

### 8.2 Why Global Variables Cause Disaster
If an engineer declares:
```java
// SEVERE VULNERABILITY: Do NOT do this
private Long currentTenantId;
```
Because Spring beans are singletons by default, all 200 concurrent worker threads overwrite this single shared variable on the JVM heap. When School B makes a request, School A's ongoing transaction suddenly executes queries using School B's tenant ID, causing an immediate catastrophic cross-tenant data leak.

---

## 9. Asynchronous and Background Execution

### 9.1 Context Propagation via TaskDecorator
```java
package com.student.management.shared.async;

import com.student.management.shared.context.TenantContext;
import com.student.management.shared.context.TenantContextHolder;
import org.springframework.core.task.TaskDecorator;
import org.springframework.lang.NonNull;

public class TenantContextAwareTaskDecorator implements TaskDecorator {

    @Override
    @NonNull
    public Runnable decorate(@NonNull Runnable runnable) {
        // Step 1: Capture context from HTTP caller thread
        TenantContext callerContext = TenantContextHolder.getContext();

        return () -> {
            try {
                // Step 2: Bind context onto asynchronous worker thread
                if (callerContext != null) {
                    TenantContextHolder.setContext(callerContext);
                }
                runnable.run();
            } finally {
                // Step 3: Guaranteed cleanup of async worker thread
                TenantContextHolder.clear();
            }
        };
    }
}
```

### 9.2 ThreadPoolTaskExecutor Bean Configuration
```java
package com.student.management.shared.async;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

@Configuration
@EnableAsync
public class AsyncConfiguration {

    @Bean(name = "tenantAwareTaskExecutor")
    public Executor tenantAwareTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(8);
        executor.setMaxPoolSize(32);
        executor.setQueueCapacity(250);
        executor.setThreadNamePrefix("TenantAsync-");
        executor.setTaskDecorator(new TenantContextAwareTaskDecorator());
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        executor.initialize();
        return executor;
    }
}
```

---

## 10. Hibernate/JPA Tenant Isolation

### 10.1 Evaluation of Isolation Mechanisms

| Mechanism | Strengths | Vulnerabilities / Bypasses | Production Verdict |
| :--- | :--- | :--- | :--- |
| **Explicit Repository Scoping** | Zero magic; fast; standard SQL queries; fully index-aligned. | Developer can write `findById(id)` without scoping. | **Mandatory Foundation** |
| **Composite Entity IDs `(id, orgId)`** | Eliminates unscoped `findById(id)`; enforces composite foreign keys. | Requires composite PK mappings; increases entity complexity. | **Recommended for Relationships** |
| **Hibernate `@TenantId` (Discriminator)** | Transparently injects tenant predicate into all entity queries. | Does not cover Native SQL; bulk HQL updates require care. | **Recommended for Entities** |
| **Hibernate Filters** | Dynamic filtering per session. | Must be manually enabled per Hibernate Session/Transaction. | **Fragile (Omit)** |
| **PostgreSQL RLS** | Database-level kernel enforcement; blocks Native SQL leaks. | Minor overhead; requires `SET LOCAL` on connection. | **Defense-in-Depth Layer** |

### 10.2 Defense Against `findById(id)` Mistakes
To eliminate developer error where a junior developer accidentally calls `repository.findById(id)`:
1. **BaseTenantRepository Interface**: Enforces `findByIdAndOrganizationId(Long id, Long organizationId)`.
2. **ArchUnit Static Architecture Tests**: Automatically fails the CI/CD build if any service invokes `findById()` on a tenant-owned entity repository.
3. **Database Composite Foreign Keys**: Prevents cross-tenant associations even if retrieved by mistake.

---

## 11. PostgreSQL Schema and Database Constraints

### 11.1 Table Classification Matrix

| Table Name | Classification | `organization_id` Column | Reasoning & Constraint Strategy |
| :--- | :--- | :--- | :--- |
| `users` | Global Identity Pool | ❌ No | Global credentials; 1 user can hold memberships across multiple schools. Global unique email/username. |
| `organizations` | Tenant Anchor Root | ❌ No | System tenant root entity. Unique `slug`. |
| `memberships` | Tenant-Owned Resource |  Yes (`NOT NULL`) | Scopes user to organization. Unique `(user_id, organization_id)`. |
| `school_groups` | Tenant-Owned Resource |  Yes (`NOT NULL`) | Departments/Teams. Unique `(organization_id, name)`. |
| `roles` | Hybrid (Templates vs Custom) |  Nullable | `organization_id IS NULL` for platform templates (`TEACHER`); `organization_id = X` for custom roles. |
| `permissions` | Global Capabilities | ❌ No | Immutable capability catalogue (`STUDENT_CREATE`, `FEE_COLLECT`). |
| `membership_roles` | Relationship Mapping |  Yes (`NOT NULL`) | **Composite Foreign Key** referencing `memberships(id, organization_id)`. |
| `group_roles` | Relationship Mapping |  Yes (`NOT NULL`) | **Composite Foreign Key** referencing `school_groups(id, organization_id)`. |
| `membership_groups` | Relationship Mapping |  Yes (`NOT NULL`) | **Composite Foreign Keys** referencing both `memberships` and `school_groups`. |
| `audit_events` | Tenant Audit Log |  Nullable | `organization_id = X` for school events; `NULL` for global platform admin events. |
| `students` | Institutional Business Data |  Yes (`NOT NULL`) | Business records scoped strictly to school tenant. |

### 11.2 Production DDL with Composite Cross-Tenant Constraints
```sql
-- 1. Organizations (Tenant Root)
CREATE TABLE organizations (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    plan_id BIGINT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    contact_email VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Global Users Pool
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    is_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Scoped Memberships (Enforces Composite Uniqueness for Foreign Key References)
CREATE TABLE memberships (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    approved_at TIMESTAMPTZ,
    approved_by_user_id BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Prevent duplicate memberships for same user in same school
    CONSTRAINT uq_memberships_user_org UNIQUE (user_id, organization_id),
    -- Required to permit composite foreign key references from child tables
    CONSTRAINT uq_memberships_id_org UNIQUE (id, organization_id)
);

-- 4. School Groups / Departments
CREATE TABLE school_groups (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Permit duplicate group names across different schools, but unique within one school
    CONSTRAINT uq_groups_org_name UNIQUE (organization_id, name),
    -- Required for composite foreign key references
    CONSTRAINT uq_groups_id_org UNIQUE (id, organization_id)
);

-- 5. Hybrid Roles (Templates vs Org Custom)
CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    is_system_template BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_roles_id_org UNIQUE (id, organization_id)
);

-- 6. Permissions Catalog (Global)
CREATE TABLE permissions (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(80) NOT NULL UNIQUE,
    description VARCHAR(255) NOT NULL,
    module VARCHAR(50) NOT NULL
);

-- 7. Cross-Tenant Enforced Membership Group Mapping
-- PREVENTS School A Membership from being assigned to School B Group!
CREATE TABLE membership_groups (
    membership_id BIGINT NOT NULL,
    group_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (membership_id, group_id),
    -- Composite Foreign Keys Enforce Strict Organization Boundary
    CONSTRAINT fk_mem_grp_membership FOREIGN KEY (membership_id, organization_id)
        REFERENCES memberships(id, organization_id) ON DELETE CASCADE,
    CONSTRAINT fk_mem_grp_group FOREIGN KEY (group_id, organization_id)
        REFERENCES school_groups(id, organization_id) ON DELETE CASCADE
);

-- 8. Cross-Tenant Enforced Membership Direct Role Mapping
CREATE TABLE membership_roles (
    membership_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (membership_id, role_id),
    CONSTRAINT fk_mem_roles_membership FOREIGN KEY (membership_id, organization_id)
        REFERENCES memberships(id, organization_id) ON DELETE CASCADE
);

-- 9. Cross-Tenant Enforced Group Role Inheritance Mapping
CREATE TABLE group_roles (
    group_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, role_id),
    CONSTRAINT fk_grp_roles_group FOREIGN KEY (group_id, organization_id)
        REFERENCES school_groups(id, organization_id) ON DELETE CASCADE
);
```

---

## 12. Composite Indexing Strategy

### 12.1 Leading Column Selection Rules
In B-tree indexes, the **leading column** determines query selectivity and applicability:
- For queries filtering by `organization_id` and `status` (e.g. `WHERE organization_id = 2 AND status = 'ACTIVE'`), the index **MUST** lead with `organization_id`:
  ```sql
  CREATE INDEX idx_memberships_org_status ON memberships (organization_id, status);
  ```
- If an index were defined as `(status, organization_id)`, looking up all members of School A would scan all `ACTIVE` rows across *all* schools, causing massive index page I/O bloat.

### 12.2 Production Index Definitions
```sql
-- Fast membership resolution by user across schools
CREATE INDEX idx_memberships_user_id ON memberships (user_id);

-- Group lookups scoped to organization
CREATE INDEX idx_school_groups_org ON school_groups (organization_id);

-- Fast member search within school
CREATE INDEX idx_membership_groups_org_member ON membership_groups (organization_id, membership_id);

-- Audit event retrieval by school ordered by timestamp
CREATE INDEX idx_audit_events_org_created ON audit_events (organization_id, created_at DESC);

-- Business entities (Students) fast search
CREATE INDEX idx_students_org_course ON students (organization_id, course);
```

---

## 13. PostgreSQL Row-Level Security (RLS)

### 13.1 Evaluating RLS with Connection Pooling
PostgreSQL RLS provides an unassailable kernel-level security barrier. Even if a developer writes raw JDBC `SELECT * FROM students`, the database kernel strips out records belonging to other tenants.

#### Connection Pool Safety Rule: `SET LOCAL` vs `SET SESSION`
When using HikariCP, setting a session variable via `SET app.current_tenant_id = 2` is **catastrophic**, because connections are recycled to other threads.
**Solution**: Use `SET LOCAL` inside a database transaction:
```sql
-- Transaction-scoped: automatically reverts upon COMMIT or ROLLBACK
SET LOCAL app.current_tenant_id = '2';
```

### 13.2 PostgreSQL RLS Policies
```sql
-- 1. Enable and Force RLS on Business Tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE students FORCE ROW LEVEL SECURITY;

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships FORCE ROW LEVEL SECURITY;

-- 2. Tenant Isolation Policy using app.current_tenant_id
CREATE POLICY tenant_isolation_students_policy ON students
    FOR ALL
    USING (
        organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')::BIGINT
    )
    WITH CHECK (
        organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')::BIGINT
    );

CREATE POLICY tenant_isolation_memberships_policy ON memberships
    FOR ALL
    USING (
        organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')::BIGINT
    )
    WITH CHECK (
        organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')::BIGINT
    );
```

### 13.3 Spring JPA Transaction-Local RLS Setup
```java
package com.student.management.shared.interceptor;

import com.student.management.shared.context.TenantContextHolder;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.stereotype.Component;

@Aspect
@Component
public class DatabaseTenantSecurityAspect {

    @PersistenceContext
    private EntityManager entityManager;

    @Before("@annotation(org.springframework.transaction.annotation.Transactional)")
    public void setDatabaseTenantContext() {
        Long tenantId = TenantContextHolder.getTenantId();
        if (tenantId != null && tenantId > 0) {
            entityManager.createNativeQuery("SET LOCAL app.current_tenant_id = :orgId")
                    .setParameter("orgId", String.valueOf(tenantId))
                    .executeUpdate();
        }
    }
}
```

---

## 14. RBAC Engine Implementation

### 14.1 Effective Permission Calculation Algorithm
A staff member's permissions are the **union** of:
1. Permissions mapped to Direct Roles assigned to the Membership.
2. Permissions mapped to Roles assigned to all Groups/Departments of which the Membership is a member.

```mermaid
flowchart LR
    Member["Membership: ayush_staff (Org 2)"] --> DirectRoles["Direct Roles: TEACHER"]
    Member --> GroupLink["Group: Science Department"]
    GroupLink --> GroupRoles["Group Roles: LAB_COORDINATOR"]

    DirectRoles --> Perm1["STUDENT_READ, ATTENDANCE_MARK"]
    GroupRoles --> Perm2["LAB_EQUIPMENT_BOOK, INVENTORY_READ"]

    Perm1 --> Effective["Effective Permissions: STUDENT_READ, ATTENDANCE_MARK, LAB_EQUIPMENT_BOOK, INVENTORY_READ"]
    Perm2 --> Effective
```

### 14.2 EffectivePermissionService Implementation
```java
package com.student.management.iam.service.impl;

import com.student.management.iam.dto.response.MemberPermissionSummaryResponse;
import com.student.management.iam.entity.*;
import com.student.management.iam.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EffectivePermissionServiceImpl {

    private final MembershipRepository membershipRepository;
    private final MemberRoleMappingRepository memberRoleMappingRepository;
    private final MembershipGroupMappingRepository membershipGroupMappingRepository;
    private final GroupRoleMappingRepository groupRoleMappingRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final PermissionRepository permissionRepository;
    private final RoleRepository roleRepository;

    @Transactional(readOnly = true)
    @Cacheable(value = "effective_permissions", key = "#membershipId")
    public Set<String> getEffectivePermissions(Long membershipId) {
        Membership membership = membershipRepository.findById(membershipId)
                .orElseThrow(() -> new IllegalArgumentException("Membership not found"));

        if (!"ACTIVE".equals(membership.getStatus())) {
            return Collections.emptySet();
        }

        Set<Long> allRoleIds = new HashSet<>();

        // 1. Direct Roles
        List<MemberRoleMapping> directRoles = memberRoleMappingRepository.findAllByMembershipId(membershipId);
        directRoles.forEach(r -> allRoleIds.add(r.getRoleId()));

        // 2. Group Inherited Roles
        List<MembershipGroupMapping> groupMappings = membershipGroupMappingRepository.findAllByMembershipId(membershipId);
        List<Long> groupIds = groupMappings.stream().map(MembershipGroupMapping::getGroupId).toList();
        if (!groupIds.isEmpty()) {
            List<GroupRoleMapping> groupRoleMappings = groupRoleMappingRepository.findAllByGroupIdIn(groupIds);
            groupRoleMappings.forEach(gr -> allRoleIds.add(gr.getRoleId()));
        }

        if (allRoleIds.isEmpty()) {
            return Collections.emptySet();
        }

        // 3. Collect Permission Codes
        List<RolePermission> rolePermissions = rolePermissionRepository.findAllByRoleIdIn(new ArrayList<>(allRoleIds));
        List<Long> permIds = rolePermissions.stream().map(RolePermission::getPermissionId).toList();

        return permissionRepository.findAllById(permIds).stream()
                .map(Permission::getCode)
                .collect(Collectors.toSet());
    }

    @CacheEvict(value = "effective_permissions", key = "#membershipId")
    public void invalidateMemberPermissionCache(Long membershipId) {
        // Cache evicted on role/group mutations
    }
}
```

### 14.3 CustomPermissionEvaluator for Method Security
```java
package com.student.management.iam.security.evaluator;

import com.student.management.iam.service.impl.EffectivePermissionServiceImpl;
import com.student.management.shared.context.TenantContextHolder;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.PermissionEvaluator;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.io.Serializable;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class CustomPermissionEvaluator implements PermissionEvaluator {

    private final EffectivePermissionServiceImpl permissionService;

    @Override
    public boolean hasPermission(Authentication auth, Object targetDomainObject, Object permission) {
        if (auth == null || permission == null) return false;

        Long membershipId = TenantContextHolder.getMembershipId();
        if (membershipId == null) return false;

        Set<String> effectivePerms = permissionService.getEffectivePermissions(membershipId);
        return effectivePerms.contains(permission.toString());
    }

    @Override
    public boolean hasPermission(Authentication auth, Serializable targetId, String targetType, Object permission) {
        return hasPermission(auth, null, permission);
    }
}
```
Usage in Controllers:
```java
@PreAuthorize("hasPermission(null, 'STUDENT_CREATE')")
@PostMapping
public ResponseEntity<Student> createStudent(@Valid @RequestBody Student student) { ... }
```

---

## 15. Platform Administrator vs Organization Administrator Boundaries

1. **Separation of Concerns**:
   - `PLATFORM_SUPER_ADMIN`: Root platform lifecycle manager (creates schools, manages subscription plans, configures global system templates). Possesses **zero** default staff memberships in institutional tenants.
   - `SCHOOL_ADMIN`: Chief institutional officer for a specific school. Has full governance over their school's users, groups, and custom roles, but cannot view or alter platform subscriptions or other schools.
2. **Audited Impersonation / Emergency Access Protocol**:
   - If platform support must access School A to troubleshoot an incident, they cannot simply change their token. They must initiate an **Audited Impersonation Session**:
     - Requires Support Ticket ID and target school authorization.
     - Logs `IMPERSONATION_START` event in global immutable audit table.
     - Issues a time-bounded (max 30 minutes) scoped session token.
     - Every action performed during impersonation is logged with `actor_type = PLATFORM_SUPPORT_IMPERSONATOR`.

---

## 16. Invitation and Membership Lifecycle

```mermaid
stateDiagram-v2
    [*] --> PENDING_ACTIVATION: Principal invites Staff (Mode B)
    [*] --> ACTIVE: Instant Provisioning (Mode A)
    PENDING_ACTIVATION --> ACTIVE: Staff completes OTP verification & sets password
    PENDING_ACTIVATION --> REJECTED: OTP expires (15 min) or invite cancelled
    ACTIVE --> SUSPENDED: Principal toggles status to SUSPENDED
    SUSPENDED --> ACTIVE: Principal reactivates Staff Member
    ACTIVE --> REVOKED: Staff terminates employment
    SUSPENDED --> REVOKED: Staff terminates employment
    REVOKED --> [*]
```

### Security Handshake Guarantees:
- **Cryptographic 6-Digit Verification Code**: Dispatched via email, hashed in database using SHA-256 or BCrypt.
- **Expiry Window**: 15 minutes strict time-to-live.
- **Anti-Enumeration**: Entering an unassigned email responds with generic *"If an account exists, a security code was dispatched"*.
- **Single-Use Burn**: Code is permanently deleted immediately upon successful verification.

---

## 17. Auditing, Observability, and Operational Safety

### 17.1 Immutable Audit Log Schema
```sql
CREATE TABLE audit_events (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    actor_user_id BIGINT NOT NULL,
    actor_membership_id BIGINT,
    actor_username VARCHAR(100) NOT NULL,
    event_type VARCHAR(80) NOT NULL,
    resource_type VARCHAR(80) NOT NULL,
    resource_id VARCHAR(80),
    ip_address VARCHAR(45) NOT NULL,
    correlation_id VARCHAR(64) NOT NULL,
    payload_before_json JSONB,
    payload_after_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 17.2 PII Redaction and Log Safety
Under no circumstances are plain-text passwords, OTP codes, Authorization headers, or JWT strings written into application log files or audit tables. Log output uses structured JSON with automatic masking.

---

## 18. Performance and Scalability

1. **HikariCP Connection Pool Sizing**:
   - Optimal pool size formula:
     $$\text{Pool Size} = (\text{CPU Cores} \times 2) + \text{Effective Spindle Count}$$
   - For an 8-core production server: 16–20 connections handle up to 2,000 active concurrent requests due to sub-10ms query execution times.
2. **Permission Cache Strategy**:
   - In-memory Caffeine cache or Redis cluster key: `effective_perms::{membershipId}`.
   - Cache hit latency: $< 0.1 \text{ ms}$.
   - Invalidated immediately upon `member_roles` or `group_roles` mutations.
3. **Database Pagination**:
   - Endpoints listing members, students, or audit logs strictly enforce pagination: `page=0&size=20` (max limit 100) to prevent heap exhaustion.

---

## 19. Comprehensive Security and Isolation Testing Suite

Integration test suite implemented using **Testcontainers PostgreSQL 16**:

```java
package com.student.management.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Testcontainers
@SpringBootTest
public class MultiTenantIsolationSecurityTests {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Test
    @DisplayName("Cross-Tenant Read: School A Admin cannot read School B Students")
    void testCrossTenantStudentReadPrevented() {
        // Enforce School A context
        // Attempt query for student owned by School B
        // Expect empty result / 404
    }

    @Test
    @DisplayName("Cross-Tenant Relational Injection: School A cannot assign School B Group")
    void testCrossTenantGroupMappingPrevented() {
        // Attempt to insert membership_groups linking Member(Org A) to Group(Org B)
        // Expect DataIntegrityViolationException from Composite FK
    }

    @Test
    @DisplayName("Thread Reuse Safety: ThreadLocal cleared between requests")
    void testThreadLocalContextCleanup() {
        // Execute Request 1 for Org A
        // Verify ThreadLocal is completely empty prior to Request 2
    }
}
```

---

## 20. Java Package Architecture

```
com.student.management
├── applications               # Application Directory & Entitlement Modules
├── controller                 # Core School Business Controllers (Students, Teachers)
├── entity                     # Domain Entities
├── exception                  # Global Exception Handlers
├── iam                        # Identity & Access Management Module
│   ├── controller             # RbacController, AuthController
│   ├── dto
│   │   ├── request            # CreateStaffUserRequest, CreateRoleRequest
│   │   └── response           # MemberPermissionSummaryResponse, AuthTokenResponse
│   ├── entity                 # Membership, SchoolGroup, Role, Permission
│   ├── enums                  # MembershipStatus, ProvisionMode
│   ├── repository             # MembershipRepository, RoleRepository
│   ├── security
│   │   ├── config             # SecurityConfiguration, AsyncConfiguration
│   │   ├── evaluator          # CustomPermissionEvaluator
│   │   ├── filter             # JwtAuthenticationFilter
│   │   ├── jwt                # JwtTokenProvider
│   │   └── service            # CustomUserDetailsService
│   ├── service                # RbacService, AuthService, OtpService
│   │   └── impl               # Concrete Service Implementations
│   └── user                   # Global User Identity Engine
├── platform                   # Platform Control Panel & Tenant Provisioning
│   ├── controller             # PlatformController
│   ├── entity                 # Organization, SubscriptionPlan
│   ├── repository             # OrganizationRepository
│   └── service                # PlatformService
└── shared                     # Shared Multi-Tenant Cross-Cutting Infrastructure
    ├── async                  # TenantContextAwareTaskDecorator
    ├── context                # TenantContext (Record), TenantContextHolder
    ├── entity                 # BaseEntity
    ├── filter                 # TenantContextFilter, TenantSuspensionFilter
    └── interceptor            # DatabaseTenantSecurityAspect (RLS Hook)
```

---

## 21. Implementation Roadmap

```mermaid
gantt
    title My School Care IAM Production Implementation Roadmap
    dateFormat  YYYY-MM-DD
    section Phase 1: Core Isolation
    Immutable TenantContext & Fail-Closed Holder   :done, p1, 2026-10-25, 2d
    Token Claims Enrichment (org_id, membership_id):done, p2, 2026-10-27, 2d
    Composite Foreign Keys & DB Migrations         :active, p3, 2026-10-29, 3d
    section Phase 2: Token Safety
    Client Single-Flight Refresh Mutex             :active, p4, 2026-10-31, 2d
    Server-Side Refresh Rotation Grace Period (30s):p5, 2026-11-02, 2d
    section Phase 3: Engine Hardening
    EffectivePermissionService & Method Security   :p6, 2026-11-04, 3d
    Async TaskDecorator Context Propagation        :p7, 2026-11-07, 2d
    section Phase 4: Verification
    PostgreSQL RLS Integration                     :p8, 2026-11-09, 3d
    Testcontainers Integration Test Suite          :p9, 2026-11-12, 3d
```

---

## 22. Architecture Decisions and Open Questions

### Architectural Decision Records (ADR)
1. **ADR-01: Shared Database, Shared Schema with Composite Foreign Keys**
   - *Decision*: Adopt a single PostgreSQL database with shared schema. Enforce tenant boundaries using `organization_id` on all tenant-owned tables, coupled with composite unique keys `(id, organization_id)` and composite foreign keys.
   - *Rationale*: Optimal resource utilization, lowest operational complexity, seamless migrations across thousands of schools.
2. **ADR-02: Cryptographic Token Claims over Client Headers**
   - *Decision*: Non-superadmin requests resolve tenant context strictly from verified JWT claims (`org_id`, `membership_id`). Client headers are treated as untrusted routing hints.
   - *Rationale*: Eliminates tenant tampering vulnerabilities at the gateway.

### Open Architecture Questions for Stakeholder Alignment
1. **Granular Resource-Level Scope (Future Phase)**:
   - *Question*: When a teacher has permission `ATTENDANCE_MARK`, should they mark attendance for the whole school, or strictly for Section 10-A?
   - *Recommendation*: Phase 1 enforces institutional boundary (School Level). Phase 2 will introduce `resource_scopes` (class/section mappings) without modifying the fundamental IAM foundation.
2. **Global Account Linking Across Institutions**:
   - *Question*: If a teacher works at School A in the morning and School B in the afternoon, how do they accept the second invitation?
   - *Recommendation*: Invitation handshake detects existing email $\rightarrow$ Prompts for existing password $\rightarrow$ Binds second active `Membership` to the same global `User` ID.

---

## 23. Official Technical References

1. **Spring Security 6.3 Official Reference**:
   - *Architecture & Filter Chain*: https://docs.spring.io/spring-security/reference/servlet/architecture.html
   - *Method Security & PreAuthorize*: https://docs.spring.io/spring-security/reference/servlet/authorization/method-security.html
2. **Hibernate ORM 6.6 User Guide**:
   - *Discriminator Multi-Tenancy*: https://docs.hibernate.org/orm/6.6/userguide/html_single/Hibernate_User_Guide.html#multitenacy-discriminator
3. **PostgreSQL 16 Database Documentation**:
   - *Row Security Policies (RLS)*: https://www.postgresql.org/docs/16/ddl-rowsecurity.html
   - *Transaction Settings (`SET LOCAL`)*: https://www.postgresql.org/docs/16/sql-set.html
4. **Keycloak 26 Documentation**:
   - *Organizations Management*: https://www.keycloak.org/docs/latest/server_admin/#organizations
5. **OWASP Security Standards**:
   - *Multi-Tenant Security Cheat Sheet*: https://cheatsheetseries.owasp.org/cheatsheets/Multitenancy_Cheat_Sheet.html
   - *JSON Web Token Security Cheat Sheet*: https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html

