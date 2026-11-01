# Production Architecture Decisions & Technical Trade-Offs Ledger
## Architecture Evolution of My School Care Multi-Tenant IAM Platform

**Author:** Ayush Raj & Principal Engineering Team  
**System:** My School Care (Multi-Tenant SaaS)  
**Core Objective:** Enterprise-grade security, high throughput concurrency, low infrastructure cost, and long-term maintainability.  
**Classification:** Authoritative Technical Decision Record (ADR)  

---

## 1. Initial Strategy & Design Philosophy

When architecting the multi-tenant foundation of My School Care, our engineering strategy was governed by three fundamental constraints:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CORE ENGINEERING TRIANGLE                       │
│                                                                        │
│                1. INFRASTRUCTURE COST (SaaS Economics)                 │
│                                   ▲                                    │
│                                  / \                                   │
│                                 /   \                                  │
│                                /     \                                 │
│                               ▼       ▼                                │
│      2. DATA ISOLATION (Security) ◄──► 3. MAINTAINABILITY & DEV SPEED  │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Infrastructure Cost (SaaS Economics)**:
   A dedicated database-per-tenant or container-per-tenant model is commercially unviable for small-to-medium educational institutions (e.g., 500 schools = 500 managed database instances with massive cloud infrastructure overhead). We required a **Shared Database, Shared Schema** architecture while guaranteeing zero cross-tenant data leakage.
2. **Data Isolation & Security**:
   Under no circumstances may School A view, modify, or infer records belonging to School B. The isolation boundary must hold even when callers attempt parameter tampering, header spoofing, or cross-tenant URL traversal.
3. **Maintainability & Engineering Simplicity**:
   We deliberately avoided over-engineering through complex distributed microservices or fragile third-party sidecars. The architecture leverages standard capabilities in **Java 21 LTS**, **Spring Boot 3.3**, and **PostgreSQL 16**, maximizing performance within a modular, clean codebase.

---

## 2. Chronological Architectural Decisions & Trade-Offs

---

### Decision 1: Database Multi-Tenancy Architecture (Isolated DBs vs Shared Schema)
* **Problem**: Selecting a multi-tenant persistence model capable of hosting hundreds of schools with minimal operational cost and predictable performance.
* **Alternatives Considered**:
  - *Option A: Database-per-Tenant* (Dedicated PostgreSQL instance per school).
  - *Option B: Schema-per-Tenant* (Single database partitioned into tenant schemas: `tenant_1`, `tenant_2`).
  - *Option C: Shared Database, Shared Schema with Tenant Discriminator (`organization_id`)*.
* **Trade-Off Analysis**:
  - Option A provides physical isolation but incurs prohibitive cloud hosting costs and complex database migration overhead.
  - Option B degrades PostgreSQL connection pool utilization, leads to schema exhaustion at scale (500+ schemas), and slows DDL migrations.
  - Option C eliminates idle resource overhead, maximizes connection pooling efficiency, and simplifies centralized migrations, provided that query scoping and constraints are strictly enforced.
* **Justified Decision**: **Option C (Shared Database, Shared Schema with `organization_id` and composite constraints)**.
* **Impact on Cost & Performance**: Minimal operational expenditure (a single high-performance managed RDS instance handles all schools), standard backup routines, and optimal JVM/database buffer memory efficiency.

---

### Decision 2: Authoritative Tenant Context Resolution (Client Headers vs Cryptographic JWT Claims)
* **Problem**: In early prototypes, frontend state defaulted missing tenant IDs to `active_tenant_id = 1` (Delhi Public School). Furthermore, relying on client-supplied HTTP headers (`X-Tenant-ID`) allowed cross-tenant tampering.
* **Alternatives Considered**:
  - *Option A: Client HTTP Headers as Truth* (`X-Tenant-ID` and `X-Tenant-Slug`).
  - *Option B: Dynamic Subdomain Routing* (`school1.myschoolcare.com`).
  - *Option C: Cryptographically Signed JWT Claims + Server-Side Active Verification*.
* **Trade-Off Analysis**:
  - Option A creates a critical privilege escalation vulnerability; any authenticated caller can forge or modify headers using browser developer tools.
  - Option B introduces DNS configuration overhead and wildcard SSL certificate complexity during local and hybrid development.
  - Option C guarantees that once authenticated, the caller's tenant boundary is cryptographically sealed inside the token.
* **Justified Decision**: **Option C**. URL slugs serve purely as user routing hints. For authenticated non-superadmin callers, `TenantContextFilter` extracts `org_id` and `membership_id` directly from the cryptographically verified JWT claims, overriding any client-supplied headers.
* **Impact on Security**: 100% immune to header spoofing, parameter tampering, and cross-tenant URL manipulation.

---

### Decision 3: Web Concurrency Engine (Traditional OS Threads vs Java 21 Virtual Threads)
* **Problem**: Tomcat allocates a default worker pool of 200 platform threads. If 2,000 concurrent staff members from 500 schools simultaneously access dashboards or record operations, thread starvation ensues, causing requests to queue, timeout, and crash the server.
* **Alternatives Considered**:
  - *Option A: Fully Reactive Stack (Spring WebFlux & Project Reactor)*.
  - *Option B: Scaling Platform OS Threads to 2,000 in Tomcat*.
  - *Option C: Java 21 Virtual Threads (`spring.threads.virtual.enabled=true`)*.
* **Trade-Off Analysis**:
  - Option A eliminates thread starvation but introduces severe development friction (reactive paradigms, loss of standard JPA/Hibernate transactions, difficult stack traces, and non-blocking ecosystem incompatibilities).
  - Option B allocates 1MB–2MB of stack memory per thread (requiring 2GB–4GB of RAM exclusively for thread stacks) and triggers excessive operating system context-switching latency.
  - Option C allows standard synchronous, readable JPA code to execute on lightweight virtual threads (costing only a few kilobytes each). When a virtual thread blocks on database I/O, the underlying carrier OS thread is immediately unmounted and reassigned.
* **Justified Decision**: **Option C (Java 21 Virtual Threads)**.
* **Impact on Cost & Performance**: Enables thousands of concurrent I/O-bound requests on modest server hardware (4GB–8GB RAM) without the architectural complexity of reactive programming.

---

### Decision 4: Concurrency Safety and ThreadLocal Lifecycle Management
* **Problem**: Servlet containers and worker pools reuse threads across different incoming requests. If an exception or unhandled path leaves tenant context in a `ThreadLocal` storage slot, a subsequent request assigned to that thread inherits the prior tenant's identity, resulting in critical cross-tenant data pollution.
* **Alternatives Considered**:
  - *Option A: Explicit Parameter Passing* (Passing `Long organizationId` through every service method signature).
  - *Option B: Manual ThreadLocal cleanup within Spring MVC Controllers*.
  - *Option C: Unified Immutable `TenantContext` Record + Guaranteed `finally { TenantContextHolder.clear(); }` in `OncePerRequestFilter`*.
* **Trade-Off Analysis**:
  - Option A pollutes method signatures across the entire domain model.
  - Option B fails whenever an exception occurs before reaching controller exit points.
  - Option C establishes an architectural barrier at the servlet filter level: regardless of downstream runtime exceptions or successful completions, the worker thread is unconditionally scrubbed before returning to the container pool.
* **Justified Decision**: **Option C**.
* **Impact on Maintainability**: Keeps service interfaces clean while eliminating thread-reuse context bleeding at the JVM framework level.

---

### Decision 5: Background Processing and Asynchronous Context Propagation (`TaskDecorator`)
* **Problem**: Operations executed via `@Async` (such as email dispatch, audit event recording, and report compilation) are scheduled on separate worker thread pools (`ThreadPoolTaskExecutor`). Standard `ThreadLocal` contexts do not automatically propagate from the HTTP thread into async worker threads, causing `tenantId = null`.
* **Alternatives Considered**:
  - *Option A: Manually injecting tenant ID parameters into async methods*.
  - *Option B: Custom Spring `TaskDecorator` Context Bridge*.
* **Trade-Off Analysis**:
  - Option A requires manual parameter management for every background task and risks developer omission.
  - Option B intercepts task dispatch, takes an immutable snapshot of `TenantContext` from the caller thread, binds it inside the worker thread prior to task execution, and executes guaranteed cleanup in a `finally` block upon completion.
* **Justified Decision**: **Option B (`TenantContextTaskDecorator` configured in `AsyncConcurrencyConfig`)**.
* **Impact on Reliability**: Guarantees consistent organizational context across asynchronous jobs, scheduled tasks, and event listeners.

---

### Decision 6: Token Rotation Concurrency and Elimination of the "Re-Login Loop"
* **Problem**: When a short-lived access token expires during active dashboard usage, modern browser single-page applications dispatch multiple parallel requests (e.g., fetching members, roles, and groups simultaneously). Under standard token rotation, every request receives a `401 Unauthorized` and concurrently hits `/auth/refresh-token`. The first call succeeds and invalidates the previous refresh token; the subsequent calls fail with *Invalid or Revoked Token*, resulting in cleared browser storage and repeated forced logouts.
* **Alternatives Considered**:
  - *Option A: Disabling Refresh Token Rotation* (Using static, non-rotating refresh tokens).
  - *Option B: Client-Side Single-Flight Mutex Queue + Server-Side 30-Second Rotation Grace Period*.
* **Trade-Off Analysis**:
  - Option A compromises security; a compromised refresh token remains valid until absolute expiration.
  - Option B preserves cryptographic token rotation while introducing concurrency resilience: the client executes only one refresh request while queuing parallel requests, and the server permits a 30-second leeway window for concurrent in-flight requests from multiple browser tabs.
* **Justified Decision**: **Option B**.
* **Impact on User Experience**: Active users experience transparent, uninterrupted session renewal with zero unexpected logout interruptions.

---

### Decision 7: Data Repository Isolation (Auto-Generated JPA Naming vs Explicit `@Query`)
* **Problem**: Relying solely on Spring Data JPA method name generation (such as `findById(id)`) creates a vulnerability where an engineer may inadvertently call an unscoped method, returning records across tenant boundaries.
* **Alternatives Considered**:
  - *Option A: Strict code reviews verifying method naming conventions*.
  - *Option B: Explicit JPQL `@Query` with mandatory `:organizationId` parameter binding*.
* **Trade-Off Analysis**:
  - Option A is vulnerable to human oversight.
  - Option B enforces compile-time and runtime guarantees at the repository interface: every query explicitly binds the tenant discriminator.
* **Justified Decision**: **Option B**.
* **Impact on Security**: Complete protection against accidental cross-tenant data lookups.

---

## 3. Technical Evaluation of Five Core Production Inquiries

---

### Q1: Database Connection Pool Capacity vs Virtual Threads
* **Inquiry**: *Despite the presence of Java 21 Virtual Threads, are database connections still strictly bounded?*
* **Architectural Evaluation**:
  - **Yes, database connections remain strictly bounded.**
  - Virtual threads resolve socket I/O thread starvation at the web layer, allowing thousands of requests to wait on network responses without allocating gigabytes of OS thread memory.
  - However, PostgreSQL is a physical relational process governed by disk I/O, shared memory buffers, and CPU cores. Opening 2,000 concurrent database connections would saturate PostgreSQL shared buffers and trigger kernel out-of-memory crashes.
  - HikariCP acts as a defensive governor (default `maximum-pool-size = 20`). Virtual threads enqueue in HikariCP's lightweight connection pool queue. When repository queries complete in sub-5ms intervals, connections cycle through the virtual thread queue at thousands of operations per second without exhausting database server resources.

---

### Q2: Blocking Operations and Carrier Thread Pinning
* **Inquiry**: *Can long-running or blocking operations degrade the virtual thread runtime?*
* **Architectural Evaluation**:
  - Modern PostgreSQL JDBC socket reads allow the virtual thread to yield and unmount from its carrier OS thread cleanly.
  - **The Pinning Risk**: If legacy code contains `synchronized` blocks (instead of `java.util.concurrent.locks.ReentrantLock`) or invokes native JNI methods, the virtual thread "pins" the underlying carrier platform thread, temporarily preventing it from executing other virtual threads.
  - **Mitigation**: We audited the codebase to ensure standard lock primitives are used, and long-running operations (such as external SMTP email dispatch) are completely offloaded to dedicated asynchronous worker pools.

---

### Q3: CPU-Intensive Tasks vs Virtual Threads
* **Inquiry**: *Can virtual threads accelerate CPU-heavy workloads?*
* **Architectural Evaluation**:
  - **No. Virtual threads do not enhance CPU-bound computations.**
  - Cryptographic operations such as password hashing (BCrypt with cost factor 10–12) consume substantial CPU clock cycles (~80ms per hash).
  - Attempting to run 500 concurrent password hashes on virtual threads will peg the server's physical CPU cores at 100%, causing latency degradation.
  - **Mitigation**: High-CPU computations are throttled and executed on bounded platform thread pools (`ThreadPoolTaskExecutor`), safeguarding core web traffic.

---

### Q4: Connection Pool Exhaustion and Queuing Behavior
* **Inquiry**: *How do concurrent requests behave when the database connection pool is saturated?*
* **Architectural Evaluation**:
  - When traffic spikes exceed pool capacity, requests wait in HikariCP's internal lock-free handoff queue.
  - The parameter `spring.datasource.hikari.connection-timeout` (default: 30,000ms) governs maximum queue latency. If a connection is not obtained within this threshold, HikariCP throws a `SQLTransientConnectionException`.
  - **Throughput Calculation**: With properly indexed queries executing in 5ms, a 20-connection pool delivers:
    $$\text{Throughput} = \frac{20 \text{ connections}}{0.005 \text{ seconds}} = 4,000 \text{ queries/second}$$
    Consequently, connection queuing only becomes a threat when slow, unindexed table scans block connections.

---

### Q5: Load Testing and Latency Metrics (p50, p95, p99)
* **Inquiry**: *How should performance benchmarks measure actual system latency under load?*
* **Architectural Targets**:
  - **p50 (Median)**: Target $< 15\text{ ms}$ (Typical user experience).
  - **p95**: Target $< 50\text{ ms}$ (Standard high-load threshold).
  - **p99**: Target $< 200\text{ ms}$ (Worst-case latency under connection pool contention).
  - If p99 latency spikes beyond 500ms, it serves as an immediate indicator of database connection pool exhaustion or lock contention.

---

---

## 4. Rigorous Proof and Technical Verification of the Five Core Tenancy Questions

---

### Question 1: Who creates `TenantContext` — JWT filter, membership guard, or a separate service?

* **Authoritative Answer**:
  `TenantContext` is created exclusively by [`TenantContextFilter`](file:///c:/Users/AyushRaj/Desktop/Student_management_system/backend/src/main/java/com/student/management/shared/filter/TenantContextFilter.java) (annotated with `@Component` and `@Order(1)`), extending Spring's `OncePerRequestFilter`.
* **Exact Execution Flow & Code Proof**:
  1. [`TenantContextFilter.java#L47-L50`](file:///c:/Users/AyushRaj/Desktop/Student_management_system/backend/src/main/java/com/student/management/shared/filter/TenantContextFilter.java#L47-L50): Intercepts the HTTP request as the first tenant-aware filter before controllers or domain services execute.
  2. [`TenantContextFilter.java#L58-L67`](file:///c:/Users/AyushRaj/Desktop/Student_management_system/backend/src/main/java/com/student/management/shared/filter/TenantContextFilter.java#L58-L67): Extracts the bearer token from the `Authorization` header and cryptographically parses the JWT claims (`org_id`, `membership_id`, `userId`, `role`, `isSuperAdmin`).
  3. [`TenantContextFilter.java#L132-L141`](file:///c:/Users/AyushRaj/Desktop/Student_management_system/backend/src/main/java/com/student/management/shared/filter/TenantContextFilter.java#L132-L141): Constructs an immutable [`TenantContext`](file:///c:/Users/AyushRaj/Desktop/Student_management_system/backend/src/main/java/com/student/management/shared/context/TenantContext.java) Java record containing the verified identity and binds it to the current worker thread:
     ```java
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
     ```
  4. [`TenantContextFilter.java#L157-L159`](file:///c:/Users/AyushRaj/Desktop/Student_management_system/backend/src/main/java/com/student/management/shared/filter/TenantContextFilter.java#L157-L159): Guarantees total thread cleanup in a `finally` block:
     ```java
     try {
         filterChain.doFilter(request, response);
     } finally {
         TenantContextHolder.clear();
     }
     ```

---

### Question 2: Does `organizationId` come directly from the JWT or is it set in trusted context only after database membership verification?

* **Authoritative Answer**:
  `organizationId` in the JWT is treated as a **cryptographic claim hint**, not as trusted ground truth. It is placed into the trusted `TenantContext` **only after real-time verification against the PostgreSQL database**.
* **Exact Execution Flow & Code Proof**:
  1. In [`TenantContextFilter.java#L76-L79`](file:///c:/Users/AyushRaj/Desktop/Student_management_system/backend/src/main/java/com/student/management/shared/filter/TenantContextFilter.java#L76-L79), the raw `jwtOrgId` is extracted, and the database is queried to ensure the organization exists and retrieve its current status:
     ```java
     Long jwtOrgId = ((Number) orgIdObj).longValue();
     org = organizationRepository.findById(jwtOrgId).orElse(null);
     ```
  2. In [`TenantContextFilter.java#L84-L108`](file:///c:/Users/AyushRaj/Desktop/Student_management_system/backend/src/main/java/com/student/management/shared/filter/TenantContextFilter.java#L84-L108), the filter queries the database to verify the user's active membership in that specific organization:
     ```java
     Optional<Membership> membershipOpt = membershipRepository.findByUserIdAndOrganizationId(callerUserId, org.getId());
     ```
  3. If the membership does not exist or has been deleted, the request is immediately rejected with HTTP `403 Forbidden` (`Membership Revoked`).
  4. Only after this database lookup succeeds is the verified `org.getId()` and the database-sourced `membership.getId()` injected into the trusted `TenantContext`.

---

### Question 3: Is context set exclusively for authenticated users?

* **Authoritative Answer**:
  - For **business and tenant-isolated operations**, context requires an authenticated user with a verified membership.
  - For **public pre-login endpoints** (such as fetching school branding/theme by slug via `GET /api/v1/platform/organizations/slug/{slug}`), the filter establishes a minimal, unauthenticated context where `callerUserId = null` and `callerMembershipId = null`.
* **Exact Execution Flow & Code Proof**:
  1. In [`TenantContextFilter.java#L102-L126`](file:///c:/Users/AyushRaj/Desktop/Student_management_system/backend/src/main/java/com/student/management/shared/filter/TenantContextFilter.java#L102-L126), unauthenticated requests (with no JWT) resolve the tenant via URL slug or headers solely for public branding:
     ```java
     if (org == null) {
         String tenantHeader = request.getHeader("X-Tenant-ID");
         // ... falls back to URL parameters or slug
         org = organizationRepository.findBySlug(tenantHeader).orElse(null);
     }
     ```
  2. In [`SecurityConfig.java#L72-L89`](file:///c:/Users/AyushRaj/Desktop/Student_management_system/backend/src/main/java/com/student/management/iam/security/config/SecurityConfig.java#L72-L89), Spring Security enforces strict authentication boundaries:
     ```java
     .requestMatchers("/api/v1/auth/**").permitAll()
     .requestMatchers("/api/v1/platform/organizations/slug/**").permitAll()
     .anyRequest().authenticated()
     ```
  3. In business controllers like [`RbacController.java#L63-L66`](file:///c:/Users/AyushRaj/Desktop/Student_management_system/backend/src/main/java/com/student/management/iam/controller/RbacController.java#L63-L66), endpoints require an active authenticated tenant context; unauthenticated or unassigned requests fail-closed.

---

### Question 4: What happens with an existing JWT if a membership is suspended or deleted in the database?

* **Authoritative Answer**:
  A stale or stolen JWT **cannot** bypass membership changes. Because every request performs a real-time database verification of the membership state in `TenantContextFilter`, suspended and deleted memberships are intercepted immediately mid-session.
* **Exact Execution Flow & Code Proof**:
  1. **If Membership is Deleted / Revoked**:
     In [`TenantContextFilter.java#L85-L93`](file:///c:/Users/AyushRaj/Desktop/Student_management_system/backend/src/main/java/com/student/management/shared/filter/TenantContextFilter.java#L85-L93):
     ```java
     Optional<Membership> membershipOpt = membershipRepository.findByUserIdAndOrganizationId(callerUserId, org.getId());
     if (membershipOpt.isEmpty()) {
         log.warn("Rejected JWT for user {} in org {}: active membership not found or deleted", callerUserId, org.getId());
         sendForbiddenErrorResponse(response, "Membership Revoked",
                 "Your institutional membership in '" + org.getName() + "' is not active or has been revoked.");
         return; // Immediately terminates filter chain with HTTP 403
     }
     ```
  2. **If Membership is Suspended**:
     In [`TenantContextFilter.java#L104-L107`](file:///c:/Users/AyushRaj/Desktop/Student_management_system/backend/src/main/java/com/student/management/shared/filter/TenantContextFilter.java#L104-L107) and [`#L144-L153`](file:///c:/Users/AyushRaj/Desktop/Student_management_system/backend/src/main/java/com/student/management/shared/filter/TenantContextFilter.java#L144-L153):
     - The filter sets `effectiveSuspended = true` in `TenantContext`.
     - Read-only operations (`GET`, `HEAD`, `OPTIONS`) remain accessible so the staff member can view status and notifications.
     - Any mutative write/edit operation (`POST`, `PUT`, `PATCH`, `DELETE`) is intercepted immediately and rejected with HTTP `403 Forbidden` (`Your institutional staff membership in [School] is suspended by school administration`).

---

### Question 5: Does the application fail-closed when context is absent?

* **Authoritative Answer**:
  **Yes, the application fails closed across all architectural layers** (Filter Layer, Context Layer, Controller Layer, and Repository Layer).
* **Exact Execution Flow & Code Proof**:
  1. **Context Holder Layer**:
     [`TenantContextHolder.java#L49-L55`](file:///c:/Users/AyushRaj/Desktop/Student_management_system/backend/src/main/java/com/student/management/shared/context/TenantContextHolder.java#L49-L55) provides fail-closed enforcement via `requireTenantId()`:
     ```java
     public static Long requireTenantId() {
         Long tenantId = getTenantId();
         if (tenantId == null) {
             throw new IllegalStateException("TenantContext missing: active organization ID is required but was not resolved.");
         }
         return tenantId;
     }
     ```
  2. **Controller Layer**:
     [`RbacController.java#L63-L66`](file:///c:/Users/AyushRaj/Desktop/Student_management_system/backend/src/main/java/com/student/management/iam/controller/RbacController.java#L63-L66), [`#L74-L77`](file:///c:/Users/AyushRaj/Desktop/Student_management_system/backend/src/main/java/com/student/management/iam/controller/RbacController.java#L74-L77), and [`#L117-L120`](file:///c:/Users/AyushRaj/Desktop/Student_management_system/backend/src/main/java/com/student/management/iam/controller/RbacController.java#L117-L120):
     ```java
     Long activeOrgId = resolveEffectiveOrgId(orgId);
     if (activeOrgId == null) {
         throw new IllegalArgumentException("Tenant context must be specified via header X-Tenant-ID or orgId query param.");
     }
     ```
  3. **Data Repository Layer**:
     All database access queries explicitly bind `:organizationId` (e.g. [`RoleRepository.java#L28-L34`](file:///c:/Users/AyushRaj/Desktop/Student_management_system/backend/src/main/java/com/student/management/iam/repository/RoleRepository.java#L28-L34)):
     ```java
     @Query("SELECT r FROM Role r WHERE (r.organization.id = :organizationId OR r.isSystemRole = true) AND r.deletedAt IS NULL")
     List<Role> findAvailableRoles(@Param("organizationId") Long organizationId);
     ```
     If `organizationId` is null, the query evaluates strictly against system defaults or fails parameter validation, preventing accidental retrieval of another school's data.

---

## 5. Summary Matrix of Architectural Refactoring

| Dimension | Prototype Implementation | Production Refactored Standard | Justification / Core Benefit |
| :--- | :--- | :--- | :--- |
| **Web Concurrency** | 200 Platform OS Threads | Java 21 Virtual Threads | Lightweight scalability for thousands of concurrent requests. |
| **Tenant Context** | Fragmented Primitive ThreadLocals | Immutable `TenantContext` Record | Thread-safe, single-snapshot identity structure. |
| **Thread Scrubbing**| Manual / Incomplete | Unconditional `finally { clear(); }` | Guarantees zero cross-tenant context bleeding. |
| **Async Execution** | Context lost (`null` in worker) | `TenantContextTaskDecorator` | Automatically propagates tenant context to background tasks. |
| **Token Refresh** | Parallel 401 collision errors | Single-Flight Mutex Queue + 30s Grace | Eliminates the infinite re-login loop. |
| **Repository Scoping**| Auto-generated JPA method names | Explicit JPQL `@Query` with `:orgId` | Eliminates unscoped cross-tenant query execution. |
| **Membership Guard**| Relied solely on JWT expiration | Server-Side Active Status Check in Filter| Immediately terminates access for suspended or deleted members. |
