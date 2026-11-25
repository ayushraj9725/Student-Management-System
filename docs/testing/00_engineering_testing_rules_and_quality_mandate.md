# Engineering & Testing Rules Mandate: The Ground-Level Quality Protocol
## Production-Grade Reliability, Test-Driven Verification, and Failure Mode Analysis

**System:** My School Care (Multi-Tenant SaaS)  
**Author:** Ayush Raj & Principal Engineering Team  
**Classification:** Authoritative Engineering Governance & Testing Rules (`docs/testing/00_engineering_testing_rules_and_quality_mandate.md`)  
**Status:** Active & Strictly Enforced Across All Future Sprints  

---

## 1. Core Philosophy: Why Ground-Level Testing is Non-Negotiable

Writing architecture specifications and clean application code is only 50% of building an enterprise SaaS platform. A system is only as reliable as the boundary conditions it has been proven to survive under real execution. 

This document defines the **unbreakable quality contract** governing all development in My School Care. Every future feature, refactor, or architectural component must adhere strictly to these five mandates before it can be considered "Done."

---

## 2. The Five Immutable Engineering Rules

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         THE FIVE IMMUTABLE TESTING PILLARS                       │
├──────────────────────────────────────────────────────────────────────────────────┤
│ 1. Mandatory Unit Testing       │ Every service, filter, and validator isolated  │
│ 2. Real Integration Testing     │ Filter chain, DB transactions & context tested │
│ 3. Test-Driven User Scenarios   │ Ground-level tests from end-user perspective   │
│ 4. Segregated Documentation     │ Systematic test plans in docs/testing/         │
│ 5. Post-Feature Failure Audit   │ Proactive "Where Can This Break?" tracing      │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

### Rule 1: Mandatory Ground-Level Unit Testing
For every functionality, service method, repository query, and security filter:
1. **Isolated Verification**: Every unit of business logic must be accompanied by JUnit 5 + Mockito unit tests.
2. **Boundary & Edge Testing**: Tests must explicitly cover:
   - Happy paths (valid payload, authorized tenant).
   - Validation failures (null, blank, malformed parameters).
   - Boundary conditions (empty collections, zero limits, boundary timestamps).
   - Exception handling (verifying custom domain exceptions like `ResourceNotFoundException`, `DuplicateResourceException`, and `BadRequestException`).
3. **Zero Untested Assumptions**: Code without tests is treated as broken by default.

---

### Rule 2: End-to-End & Slice Integration Testing
Unit tests prove individual classes function in isolation; integration tests prove the system functions as a cohesive whole.
1. **Security & Context Slice Testing (`@WebMvcTest` / `@SpringBootTest`)**:
   - Verify that `TenantContextFilter` correctly extracts, resolves, and binds the tenant before controllers execute.
   - Verify that `TenantContextHolder.clear()` unconditionally executes even when controllers throw unexpected exceptions.
   - Verify Spring Security filters reject unauthorized roles with HTTP `403 Forbidden` and unauthenticated callers with HTTP `401 Unauthorized`.
2. **Database & Transaction Slice Testing (`@DataJpaTest`)**:
   - Verify explicit JPQL `@Query` annotations bind `:organizationId` and never leak cross-tenant records.
   - Verify foreign key cascades, soft-delete filters, and unique composite constraints (`organization_id` + `unique_key`).

---

### Rule 3: Test-Driven Design (TDD) from the End-User Perspective
Features must be conceptualized and verified from the lens of actual human actors in the school ecosystem:
1. **Actor-Centric Test Suites**:
   - **Platform SuperAdmin**: Can provision schools, suspend institutions, and manage plans. Cannot access school-internal student or staff data without audit logging.
   - **School Organization Head (Principal)**: Full administrative power within their own school; 100% blocked from viewing or modifying other schools.
   - **Staff Member (Teacher / Accountant)**: Role-restricted access (e.g., teachers can enter attendance but cannot view fee ledger balances).
   - **Suspended Staff Member**: Can view notices (read-only GET) but is immediately rejected from editing or saving data (POST/PUT/DELETE blocked with HTTP 403).
2. **User Experience Contract**:
   - Tests must assert that user-facing errors are clean, informative, and never leak internal database stack traces or SQL syntax to the frontend.

---

### Rule 4: Segregated Test Documentation Hierarchy
All test plans, test cases, and verification results must be organized systematically under `docs/testing/`:

```
docs/testing/
├── 00_engineering_testing_rules_and_quality_mandate.md     (This Rulebook)
├── 01_performance_benchmarking_and_observability_playbook.md (Load testing & metrics)
├── 02_iam_and_tenancy_test_specification.md               (IAM & Isolation test cases)
├── 03_concurrency_and_token_rotation_test_suite.md         (Token race & lock tests)
└── 04_application_modules_acceptance_tests.md             (Student, Teacher, Fees tests)
```

Each test suite document must outline:
- Test Case ID (`TC-IAM-01`, `TC-CONC-02`, etc.)
- User Persona & Preconditions
- Test Steps & Payloads
- Expected System Behavior & HTTP Status Code
- Verification Proof & Code Reference

---

### Rule 5: Mandatory Post-Feature Failure Mode & Chaos Analysis
At the conclusion of **every single feature or architectural milestone**, the assistant and engineering team are **strictly mandated** to conduct a proactive Failure Analysis before declaring the feature complete.

The analysis must systematically evaluate the following failure dimensions:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   THE 5-POINT FAILURE ANALYSIS AUDIT                   │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Concurrency & Race Conditions   │ What happens under parallel hits? │
│ 2. Network & Transient Failures    │ What if the client retries?       │
│ 3. Database & Partial State Writes │ What if the DB crashes mid-txn?   │
│ 4. Cross-Tenant Bleed Attack Vectors│ Can another school exploit this? │
│ 5. Upstream/Downstream Bottlenecks │ Will HikariCP or CPU choke?       │
└────────────────────────────────────────────────────────────────────────┘
```

#### Detailed Breakdown of the Audit:
1. **Concurrency & Race Conditions**:
   - Can two browser tabs or workers submit identical payloads simultaneously?
   - Is there a double-spend, double-refresh, or lost-update risk?
   - Is optimistic (`@Version`) or pessimistic (`PESSIMISTIC_WRITE`) locking required?
2. **Network Failures & Idempotency**:
   - What happens if the request succeeds on the backend but the response drops over a flaky mobile network?
   - Will an automated client retry corrupt or duplicate the entity?
3. **Partial Writes & Transaction Boundaries**:
   - If step 3 of a 5-step process fails (e.g. email service throws an exception after user creation), does the database roll back cleanly (`@Transactional`), or does orphaned state remain?
4. **Tenant Isolation Bleed Vectors**:
   - Can an authenticated user pass another school's entity ID (e.g. `studentId = 999`) in the URL path and inspect/update it?
   - Does the repository query explicitly filter by `:organizationId`?
5. **System Capacity & Crash Resistance**:
   - What happens when 1,000 requests hit this endpoint concurrently?
   - Does this endpoint hold database connections open while waiting for third-party HTTP/SMTP calls? (Anti-pattern: holding DB connection during external I/O).

---

## 3. The 5-Dimension Production Testing Spectrum

To eliminate the trap of shallow testing (writing a few superficial unit tests just for coverage), every module must be verified across five distinct dimensions:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                         COMPLETE 5-DIMENSION TESTING SPECTRUM                          │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. Ground-Level Unit Tests        │ Logic, edge cases, custom domain exceptions        │
│ 2. Integration & Repository Tests │ Real DB constraints, composite keys, transactions  │
│ 3. Security & Filter Chain Tests  │ TenantContextFilter, Spring Security, 401/403     │
│ 4. Multi-Tenant Isolation Tests   │ Cross-tenant penetration & header tampering defeat │
│ 5. Persona-Based Acceptance Tests │ Real-world SuperAdmin, Principal, Teacher flows    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **Dimension 1: Ground-Level Unit Tests (Logic Isolation)**:
   - Covers business logic in services, DTO mappings, and validators.
   - Explicitly asserts boundary values (nulls, empty strings, zero limits, boundary timestamps).
   - Asserts specific custom exceptions (`BadRequestException`, `ResourceNotFoundException`, `DuplicateResourceException`).
2. **Dimension 2: Integration & Repository Tests (Persistence & Data Integrity)**:
   - Validates database schema constraints (`organization_id` + unique code composite constraints).
   - Verifies explicit JPQL `@Query` parameter binding (`:organizationId`).
   - Asserts `@Transactional` rollback behavior: if step 3 of an operation fails, the database remains unpolluted.
3. **Dimension 3: Security & Filter Chain Tests (Authentication & Context)**:
   - Validates that `TenantContextFilter` runs at `@Order(1)` and properly extracts JWT claims.
   - Proves guaranteed `finally { TenantContextHolder.clear(); }` execution to prevent carrier/virtual thread contamination.
   - Asserts that unauthenticated access returns HTTP `401 Unauthorized` and forbidden access returns HTTP `403 Forbidden`.
4. **Dimension 4: Multi-Tenant Isolation Tests (Cross-Tenant Penetration Defense)**:
   - Penetration tests verifying that School A users cannot query, mutate, or infer School B records even if they manipulate URL path IDs (`/api/v1/students/{id}`).
   - Proves that tenant-level settings (e.g. School A disabling a module) have zero effect on School B.
5. **Dimension 5: Persona-Based Acceptance Tests (End-User Behavior)**:
   - **Platform SuperAdmin**: Platform governance scope only; isolated from institutional records.
   - **School Principal**: Full institutional authority, module visibility toggle capabilities.
   - **Staff Member (Teacher/Clerk)**: Strictly scoped to assigned classes and permissions.
   - **Suspended Staff**: Allowed safe read-only GET requests, immediately rejected with HTTP `403` on mutative POST/PUT/DELETE requests.

---

## 4. Operational Protocol: Assistant Commitment

To guarantee that this protocol is never forgotten or bypassed:
1. **Proactive Initiation**: At the completion of every implementation step, the AI assistant will **automatically remind the user** and present the *Failure Mode & Boundary Analysis* for that specific feature.
2. **No Rushing to the Next Task**: We will not jump into new feature development until the existing feature's test cases pass and all critical failure modes have been addressed or explicitly acknowledged.
3. **Regression Safety**: Every resolved failure scenario must be codified into an automated regression test.
