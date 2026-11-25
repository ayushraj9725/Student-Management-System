# Dynamic Tenant Navigation & Application Visibility Specification
## 3-Tier Multi-Tenant AppShell, Institutional Feature Toggles & Role-Gated Navigation

**System:** My School Care (Multi-Tenant SaaS)  
**Author:** Ayush Raj & Principal Engineering Team  
**Document ID:** `docs/15_dynamic_tenant_navigation_and_application_visibility_specification.md`  
**Classification:** Authoritative Technical Specification & TDD Blueprint  
**Status:** Architecture & Planning Phase (Awaiting Execution Approval)  

---

## 1. Executive Summary & Design Mandate

In a multi-tenant school management platform, users encompass diverse institutional personas—including Platform SuperAdmins, School Principals (Organization Heads), Department Heads, Teachers, Accountants, Admission Officers, and Students.

A fatal design flaw in traditional SaaS platforms is **portal fragmentation** (creating distinct codebases for "Admin Portal", "Teacher Portal", "Student Portal") or **hardcoded navigation dumps** (overwhelming teachers and clerks with 20+ irrelevant sidebar menus).

This specification establishes a **Unified Global Navigation Engine** that dynamically tailors the sidebar and action surfaces in real time. It ensures that no matter who logs in, they experience a unified, clean, and distraction-free interface displaying **only the applications their school subscribes to, that their Principal has enabled, and that their assigned role permits**.

---

## 2. What: The 3-Tier Navigation Resolution Hierarchy

Every navigation item, dashboard card, and action button on the platform is evaluated through a three-tier gate before rendering:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        3-TIER DYNAMIC VISIBILITY RESOLUTION ENGINE                     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ TIER 1: PLATFORM ENTITLEMENT (SaaS Subscription Gate)                                  │
│   • Managed by: Platform SuperAdmin                                                    │
│   • Rule: Did School A purchase the "Finance" or "Examinations" module?               │
│   • If FALSE ──► Module is completely unavailable to the entire institution.           │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│ TIER 2: TENANT HEAD FEATURE TOGGLES (School Administration Gate)                       │
│   • Managed by: School Principal / Organization Head                                   │
│   • Rule: Did Principal enable "Online Admissions" or "Hostel Records" for this term? │
│   • If FALSE ──► Menu is instantly hidden from all staff in this school.               │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│ TIER 3: USER RBAC PERMISSIONS (Individual Staff Capability Gate)                       │
│   • Managed by: IAM Membership & Role Assignments                                      │
│   • Rule: Does this staff member have `student:create` or `finance:read`?              │
│   • If FALSE ──► Individual sub-menus and action buttons are pruned from the DOM.      │
├───────────────────────────────────────────┴────────────────────────────────────────────┤
│                RESULT: Dynamic, Tailored, Zero-Clutter Institutional Workspace         │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Why: Business & Architectural Justification

1. **Zero Code Duplication**:
   - Maintains a single, robust React/Next.js `AppShell` and component tree. Eliminates the maintenance debt of multiple portal codebases.
2. **Cognitive Load Reduction**:
   - A 5th-grade math teacher is not distracted by fee ledgers, payroll tables, or system audit logs. Their sidebar displays only **Student Directory**, **Class Attendance**, and **Gradebook**.
3. **Tenant-Level Institutional Autonomy**:
   - School A (a small primary school) may only want basic student tracking.
   - School B (a large secondary academy) may utilize the full suite of admissions, examinations, and fee collections.
   - Both schools run on the exact same shared frontend and backend without custom code deployments.
4. **Defense-in-Depth (UI Experience + Backend Enforcement)**:
   - UI menu hiding provides a streamlined user experience.
   - Backend APIs enforce strict `@PreAuthorize` and `TenantContextFilter` guards; if a malicious actor manually inspects the DOM or navigates to a hidden URL, the backend rejects the request with HTTP `403 Forbidden`.

---

## 4. How: End-to-End Technical Architecture

### 4.1 Backend Data Model & Configuration Storage

#### A. Organization Application Settings Entity
In PostgreSQL, institutional feature toggles are modeled directly on the `organizations` table or via a dedicated composite settings relationship:

```sql
-- Schema addition to support institutional module toggles
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS enabled_applications JSONB NOT NULL 
DEFAULT '["STUDENT_MANAGEMENT", "IAM_GOVERNANCE", "ATTENDANCE"]'::jsonb;
```

#### B. The Settings DTO
```java
package com.student.management.platform.dto;

import java.util.Set;

public record OrganizationApplicationSettingsDto(
        Long organizationId,
        Set<String> enabledApplicationCodes, // e.g. ["STUDENT_MANAGEMENT", "ATTENDANCE"]
        boolean allowStaffSelfRegistration,
        boolean enableOnlineAdmissionPortal
) {}
```

#### C. School Head Management API
School Principals manage their school's enabled modules via:
- `GET /api/v1/organizations/{id}/settings` (Requires `organization:read` or `rbac:manage`)
- `PATCH /api/v1/organizations/{id}/settings` (Requires `organization:manage_settings` or `role:admin`)

---

### 4.2 Backend Entitlement Resolution (`ApplicationEntitlementServiceImpl`)

The entitlement resolution algorithm merges all three tiers in a single, high-performance database evaluation:

```java
@Override
@Transactional(readOnly = true)
public UserApplicationEntitlementResponse getUserEntitlements(Long userId, Long orgId) {
    // 1. Resolve User and Tenant
    User user = userRepository.findById(userId).orElseThrow();
    Organization org = organizationRepository.findById(orgId).orElseThrow();

    // 2. Tier 1 & 2: Get Organization's active licensed & enabled modules
    Set<String> schoolEnabledApps = org.getEnabledApplicationCodes();

    // 3. Tier 3: Resolve User's Effective Permissions from Membership & Roles
    Set<String> userPermissions = rbacService.resolveEffectivePermissions(userId, orgId);
    boolean isSchoolAdmin = userPermissions.contains("rbac:manage") || isPrincipal(user);

    List<ApplicationEntitlementDto> result = new ArrayList<>();

    for (ApplicationModule module : ApplicationModule.values()) {
        if (module == ApplicationModule.PLATFORM_CONTROL) continue;

        // Gate 1 & 2: School must have module enabled
        boolean isSchoolEnabled = schoolEnabledApps.contains(module.getCode());

        // Gate 3: User must have required role/permissions
        boolean isUserAuthorized = isSchoolAdmin || checkModulePermissions(module, userPermissions);

        // Effective operable state
        boolean effectivelyOperable = isSchoolEnabled && isUserAuthorized;

        result.add(ApplicationEntitlementDto.builder()
                .code(module.getCode())
                .title(module.getTitle())
                .route(module.getComputedRoute(org.getSlug()))
                .isAuthorized(effectivelyOperable)
                .isAvailable(isSchoolEnabled)
                .build());
    }

    return new UserApplicationEntitlementResponse(userId, org.getId(), result, userPermissions);
}
```

---

### 4.3 Frontend Dynamic Navigation Engine

#### A. Master Navigation Registry (`navigationConfig.ts`)
A single, declarative master navigation structure defines all possible routes and their gating requirements:

```typescript
export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  appCode: string;               // Tier 1 & 2 Check
  requiredPermission?: string;   // Tier 3 Check
  badge?: string;
  children?: NavItem[];
}

export const MASTER_NAVIGATION: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: 'LayoutDashboard',
    appCode: 'CORE_DASHBOARD'
  },
  {
    id: 'students',
    label: 'Students',
    path: '/students',
    icon: 'GraduationCap',
    appCode: 'STUDENT_MANAGEMENT',
    requiredPermission: 'student:read',
    children: [
      {
        id: 'student-list',
        label: 'Student Directory',
        path: '/students',
        icon: 'Users',
        appCode: 'STUDENT_MANAGEMENT',
        requiredPermission: 'student:read'
      },
      {
        id: 'student-admission',
        label: 'New Admission',
        path: '/students/admission',
        icon: 'UserPlus',
        appCode: 'STUDENT_MANAGEMENT',
        requiredPermission: 'student:create'
      }
    ]
  },
  {
    id: 'attendance',
    label: 'Attendance',
    path: '/attendance',
    icon: 'CalendarCheck',
    appCode: 'ATTENDANCE',
    requiredPermission: 'attendance:mark'
  },
  {
    id: 'iam',
    label: 'IAM & Staff Roles',
    path: '/admin',
    icon: 'ShieldCheck',
    appCode: 'IAM_GOVERNANCE',
    requiredPermission: 'rbac:manage'
  }
];
```

#### B. Pure Navigation Filtering Algorithm
The Global Sidebar applies recursive filtering:
```typescript
export function filterNavigation(
  items: NavItem[],
  authorizedAppCodes: Set<string>,
  userPermissions: Set<string>,
  isSuperAdmin: boolean
): NavItem[] {
  if (isSuperAdmin) return items; // Platform SuperAdmin has unconstrained platform visibility

  return items
    .filter(item => {
      // 1. Check if application is authorized for this tenant
      if (item.appCode !== 'CORE_DASHBOARD' && !authorizedAppCodes.has(item.appCode)) {
        return false;
      }
      // 2. Check user-level permission
      if (item.requiredPermission && !userPermissions.has(item.requiredPermission)) {
        return false;
      }
      return true;
    })
    .map(item => {
      if (item.children) {
        return {
          ...item,
          children: filterNavigation(item.children, authorizedAppCodes, userPermissions, isSuperAdmin)
        };
      }
      return item;
    })
    .filter(item => !item.children || item.children.length > 0); // Prune empty parent menus
}
```

---

## 5. Test-Driven Verification Protocol (TDD)

Per our project mandate (`00_engineering_testing_rules_and_quality_mandate.md`), this functionality requires comprehensive unit and integration test coverage:

### 5.1 Unit Tests (`backend/src/test/java/.../ApplicationEntitlementServiceTest.java`)
- **`testSuperAdminReceivesPlatformControlOnly`**: Confirms SuperAdmin context never leaks school data.
- **`testSchoolHeadSeesAllEnabledSchoolModules`**: Confirms Principal receives all enabled modules.
- **`testTeacherWithStudentReadCannotSeeFinanceOrIam`**: Confirms staff member with restricted permissions receives an empty authorization array for finance and IAM.
- **`testModuleDisabledBySchoolHeadIsExcludedForStaff`**: Confirms that when `ATTENDANCE` is removed from school settings, even an authorized teacher receives `isAuthorized = false`.

### 5.2 Multi-Tenant Integration Tests (`@SpringBootTest`)
- **`testTenantIsolationInApplicationSettings`**:
  - School A (DPS) enables `ATTENDANCE`.
  - School B (St. Xavier's) disables `ATTENDANCE`.
  - Authenticate as Teacher A in School A -> Verifies `ATTENDANCE` is authorized.
  - Authenticate as Teacher B in School B -> Verifies `ATTENDANCE` is hidden and blocked.
- **`testDirectApiAccessToDisabledModuleFailsClosed`**:
  - Teacher B attempts direct HTTP POST to `/api/v1/attendance/mark`.
  - Asserts response is HTTP `403 Forbidden` (`Module disabled for this organization`).

---

## 6. Post-Feature Failure Mode Audit ("Where Can This Break?")

| Dimension | Risk / Failure Mode | Architectural Mitigation |
| :--- | :--- | :--- |
| **Concurrency** | Principal toggles off a module while 50 teachers are actively using it. | Real-time `TenantContextFilter` checks reject mutative writes; frontend gracefully shows a notification toast on the next API call. |
| **Cache Invalidation** | Frontend caches old menu items in `localStorage`, showing stale menus after permission revocation. | Menu state is derived strictly from fresh JWT claims or authenticated `/user-entitlements` payload on app mount. |
| **Tampering** | User inspects DOM and un-hides a menu item in HTML. | The backend `@PreAuthorize` and repository `:organizationId` guards reject the underlying API call with HTTP 403. |
| **Partial Config** | A newly onboarded school has a null `enabled_applications` column in PostgreSQL. | Default fallback value `["STUDENT_MANAGEMENT", "IAM_GOVERNANCE"]` applied via database schema constraint and entity lifecycle. |
