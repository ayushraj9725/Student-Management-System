# Real-Life Staff Workflow, Entity Relationships & RBAC Guide

## 1. Executive Summary & Foundational Question Answered

### Question: Does the system pre-define permissions, or can staff create their own?

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              THE GOLDEN RULE OF RBAC                                   │
│  1. PERMISSIONS ARE SYSTEM-DEFINED (CAPABILITIES BACKED BY CODE).                      │
│  2. ROLES ARE USER/STAFF-DEFINED (CUSTOM BUNDLES OF SYSTEM PERMISSIONS).               │
│  3. GROUPS ARE ORGANIZATIONAL DEPARTMENTS (SETS OF SCHOOL MEMBERS).                    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Why are Permissions System-Defined?
A permission represents a concrete capability that backend software actually knows how to execute and protect. 
For example:
- `student:create` executes the `POST /api/students` endpoint and validates student uniqueness.
- `student:delete` triggers `DELETE /api/students/{id}` and verifies enrollment records.
- `attendance:mark` updates the attendance ledger.

If a staff member could invent an arbitrary permission code (e.g., `fly:airplane` or `exam:approve`), the backend would have **no controller, logic, or database query** to enforce it. Therefore:
* The **System provides a rich, granular Permission Catalog** covering all school resources and actions.
* The **School Staff creates custom Roles** by bundling any combination of these system permissions together.
* For maximum convenience, the system ships with **Pre-seeded Role Templates** (`SCHOOL_ADMIN`, `TEACHER`, `REGISTRAR`, `STUDENT`) so schools can start instantly without building roles from scratch.

---

## 2. Real-Life Entities & Real-World School Analogy

To make the architecture intuitive, here is how each database entity maps to real-world school operations:

| Database Entity | Real-World Equivalent | Real-Life Concrete Example |
| :--- | :--- | :--- |
| `organizations` | The School or Institution | *"Delhi Public School, R.K. Puram"* |
| `subscription_plans` | School's Commercial Tier | *"Standard Plan: Up to 1,000 Students & 50 Staff"* |
| `users` | A Human Being with an Identity | *"Priya Sharma (priya@dps.edu, verified by Gmail OTP)"* |
| `memberships` | Employment or Enrollment Status | *"Priya Sharma is an ACTIVE staff member at DPS"* |
| `school_groups` | Departments or Operational Teams | *"Science Department"*, *"Class 10 Faculty"*, *"Exam Board"* |
| `roles` | Job Titles / Duty Responsibilities | *"Department Head"*, *"Class Teacher"*, *"Lab Incharge"* |
| `permissions` | Specific Authorized Actions | `student:read`, `student:write`, `attendance:mark` |
| `students` | The Enrolled Student Body | *"Aarav Patel, Roll #101, Grade 10, Computer Science"* |

---

## 3. Entity Relationship Architecture

```mermaid
erDiagram
    ORGANIZATIONS ||--o{ SUBSCRIPTION_PLANS : "subscribes to"
    ORGANIZATIONS ||--o{ MEMBERSHIPS : "employs / enrolls"
    ORGANIZATIONS ||--o{ SCHOOL_GROUPS : "structures into"
    ORGANIZATIONS ||--o{ ROLES : "defines custom"
    ORGANIZATIONS ||--o{ STUDENTS : "educates"

    USERS ||--o{ MEMBERSHIPS : "belongs to orgs as"
    
    MEMBERSHIPS ||--o{ MEMBERSHIP_GROUP_MAPPING : "placed into"
    SCHOOL_GROUPS ||--o{ MEMBERSHIP_GROUP_MAPPING : "contains members"

    SCHOOL_GROUPS ||--o{ GROUP_ROLE_MAPPING : "bestows"
    ROLES ||--o{ GROUP_ROLE_MAPPING : "assigned to group"

    MEMBERSHIPS ||--o{ MEMBER_ROLE_MAPPING : "direct individual"
    ROLES ||--o{ MEMBER_ROLE_MAPPING : "assigned directly"

    ROLES ||--o{ ROLE_PERMISSIONS : "bundles"
    PERMISSIONS ||--o{ ROLE_PERMISSIONS : "granted by"
```

---

## 4. Step-by-Step Real-Life Operational Flows

### Flow 1: Platform Super Admin Onboards a New School & Principal (Implemented)

This flow executes when the **Platform Super Admin** onboards a school via the **Platform Control Panel** (`/platform`):

```mermaid
sequenceDiagram
    autonumber
    actor Us as Platform Super Admin
    participant CP as Control Panel UI (/platform)
    participant Backend as Platform API (PlatformServiceImpl)
    participant Mail as Email / SMTP Service
    actor Principal as School Head / Principal
    participant Login as Central Login Portal (/)

    Us->>CP: Fills School Name: "Delhi Public School", Slug: "delhi-public-school", Plan: "STANDARD", Principal Email: "principal@dps.edu"
    CP->>Backend: POST /api/v1/platform/organizations
    Backend->>Backend: 1. Persists Organization entity (status: ACTIVE)
    Backend->>Backend: 2. Provisions School Head User account (role: ADMIN)
    Backend->>Backend: 3. Links ACTIVE Membership to the Organization
    Backend->>Backend: 4. Automatically assigns SCHOOL_ADMIN template role mapping
    Backend->>Mail: 5. Generates 6-digit OTP & dispatches Welcome Activation Email to principal@dps.edu
    Mail-->>Principal: Delivers activation email with 6-digit verification code
    Principal->>Login: Visits portal (/), clicks "Forgot password?", enters principal@dps.edu & OTP
    Login->>Backend: POST /api/v1/auth/verify-otp & POST /api/v1/auth/reset-password
    Backend->>Backend: Verifies OTP, rotates credentials, sets new password
    Principal->>Login: Logs in with principal@dps.edu + password
    Login-->>Principal: Lands on Central Dashboard (/) with full access to School IAM and School Applications!
```

---

### Flow 2: School Staff Onboarding (Zero Public Registration Policy)

To eliminate spam and unauthorized access, **public self-registration is strictly disallowed**. All personnel must be onboarded directly by the **School Head or School HR** from **School IAM**:

```mermaid
sequenceDiagram
    autonumber
    actor Head as School Head / HR
    participant IAM as School IAM (/[slug]/admin)
    participant Backend as IAM Engine (RbacServiceImpl)
    participant Mail as Email / SMTP Service
    actor Teacher as New Teacher / Staff (Priya)
    participant Login as Central Login Portal (/)

    Head->>IAM: Opens Staff Directory, clicks [+ Add Staff Member]
    Head->>IAM: Enters Name: "Priya Sharma", Email: "priya@dps.edu", selects Role: TEACHER, Department: "Science Faculty"
    IAM->>Backend: POST /api/v1/iam/members/onboard
    Backend->>Backend: Creates user record with ACTIVE membership & designated role boundaries
    Backend->>Mail: Dispatches invitation email with 6-digit activation OTP
    Mail-->>Teacher: Delivers invitation email
    Teacher->>Login: Visits login portal (/), sets password via OTP
    Teacher->>Login: Signs in with priya@dps.edu + password
    Login->>Backend: POST /api/v1/auth/login
    Backend-->>Teacher: Lands on Dashboard (/) viewing strictly TEACHER modules (Attendance, Exams, Student Records)
```

---

### Flow 3: How School Staff Sets Up Groups & Assigns Roles

Staff does not need to configure permissions for 100 teachers one by one. They assign roles to **Groups**:

```mermaid
graph TD
    subgraph School["Delhi Public School"]
        Dept["Department / Group: Science Faculty"]
        
        TeacherA["Member: Rahul Sen (Physics)"]
        TeacherB["Member: Anita Rao (Chemistry)"]
        TeacherC["Member: Vikram Joshi (Biology)"]
        
        TeacherA --> Dept
        TeacherB --> Dept
        TeacherC --> Dept
        
        Role["Assigned Role: TEACHER"]
        Dept --> Role
        
        P1["student:read"]
        P2["student:create"]
        P3["student:update"]
        P4["attendance:mark"]
        
        Role --> P1
        Role --> P2
        Role --> P3
        Role --> P4
    end
```

* **Outcome:** When a new teacher is added to the "Science Faculty" group, they **automatically inherit** `student:read`, `student:create`, `student:update`, and `attendance:mark` without manual role assignment.

---

### Flow 4: Creating a Custom Role for a Special Purpose

Suppose the school has an **"Exam Incharge"** who should enter student marks and view records, but **must NEVER delete students or change school settings**.

1. **Staff opens:** `Settings > Roles & Permissions > [+ Create New Role]`.
2. **Staff enters:** Role Name = `"Exam Incharge"`, Description = *"Can view students and submit term exam marks"*.
3. **Staff picks from System Permission Catalog:**
   - [x] `student:read`
   - [x] `grade:enter`
   - [x] `grade:export`
   - [ ] `student:delete` *(Disabled)*
   - [ ] `rbac:manage` *(Disabled)*
4. **Staff assigns Role:** Assigns `"Exam Incharge"` to Teacher *Anita Rao* or to the *"Examination Committee"* group.
5. **Backend saves:**
   - Inserts row into `roles` with `organization_id = :dpsId`.
   - Inserts rows into `role_permissions` mapping `role_id` to `permission_id`.

---

### Flow 5: Everyday Operation (Executing an Action with Security Verification)

When Teacher *Rahul* clicks *"Add Student"* on the dashboard:

```mermaid
sequenceDiagram
    autonumber
    actor Teacher as Rahul (Teacher)
    participant UI as React Frontend
    participant Filter as Tenant & JWT Filter
    participant Quota as Plan Quota Service
    participant RBAC as Capability Evaluator
    participant Academic as Academic Service
    participant DB as MySQL DB

    Teacher->>UI: Fills Student Form and clicks [Save Student]
    UI->>Filter: POST /api/students with Bearer JWT (Tenant: DPS)
    
    Filter->>Filter: 1. Validate JWT signature & 1-day expiration
    Filter->>Filter: 2. Check DPS organization status: ACTIVE? (Yes)
    
    Filter->>Quota: 3. Check student limit (Current: 840, Plan Limit: 1000) -> Allowed
    
    Filter->>RBAC: 4. Check if Rahul has 'student:create'
    RBAC->>RBAC: Resolves Rahul -> Science Dept -> TEACHER role -> Has 'student:create' (Allowed)
    
    Filter->>Academic: 5. Forward request with TenantContext (org_id = DPS)
    Academic->>DB: 6. INSERT INTO students (organization_id, full_name, ...) VALUES (DPS, 'Aarav', ...)
    DB-->>Academic: Row inserted
    Academic-->>UI: 201 Created (Student successfully enrolled)
    UI-->>Teacher: Shows success notification and updates course count cards
```

---

## 5. Built-in Standard Permission Catalog (System-Defined)

The system ships with the following standard capabilities that staff can assign to roles:

| Domain Resource | Permission Code | Description | Default Pre-Seeded In |
| :--- | :--- | :--- | :--- |
| **Students** | `student:read` | View student rosters and individual profiles | `SCHOOL_ADMIN`, `TEACHER`, `REGISTRAR` |
| **Students** | `student:create` | Add new student records | `SCHOOL_ADMIN`, `REGISTRAR` |
| **Students** | `student:update` | Modify existing student details | `SCHOOL_ADMIN`, `REGISTRAR` |
| **Students** | `student:delete` | Remove student records from system | `SCHOOL_ADMIN` only |
| **Courses** | `course:read` | View department course listings | All Roles |
| **Courses** | `course:manage` | Add, update, or decommission courses | `SCHOOL_ADMIN` |
| **Access Control** | `rbac:manage` | Create roles, groups, and approve members | `SCHOOL_ADMIN` only |
| **Staff & Groups** | `staff:assign_group`| Move members between departments/groups | `SCHOOL_ADMIN`, `HOD` |
| **Reports** | `report:export` | Download rosters and metric summaries | `SCHOOL_ADMIN`, `REGISTRAR` |
| **Attendance** | `attendance:mark` | Record daily student attendance | `SCHOOL_ADMIN`, `TEACHER` |

---

## 6. Summary: Why This Gives Clients Total Autonomy

1. **No Code Changes for New Job Titles:** If a school creates a new position (e.g. *"Sports Coordinator"* or *"Library Assistant"*), staff creates the role and checks the required permissions right from the UI.
2. **Zero Admin Bottlenecks:** Group-based mapping means adding 50 teachers to the "Science Faculty" group instantly assigns all of them the correct access.
3. **Ironclad Multi-Tenant Isolation:** Everything is strictly bound to `organization_id`, ensuring no school can ever view or mutate another school's data.
4. **Platform Control Panel Stays in Our Hands:** We manage tenant licenses, suspension, quotas, and onboarding from our private control panel without interfering in the school's daily internal operations.
