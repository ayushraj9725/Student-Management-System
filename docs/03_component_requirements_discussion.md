# Component-Wise Requirements Discussion Document

## 1. Overview
This document specifies the detailed functional and non-functional requirements for each frontend component and its associated backend integration in the **Student Management System**.

---

## 2. Component Specifications

### 2.1 Component 1: `AuthPage.jsx` (Authentication & Member Registration)
- **Primary Responsibility:** Gatekeeping the entire application. Displays immediately upon initial access if no authenticated user session exists.
- **Functional Requirements:**
  - **Login Mode:**
    - Input: `Username` (text) and `Password` (password).
    - Validation: Both fields must be non-empty.
    - Action: Calls `POST /api/auth/login`.
    - Outcome: Stores user session and redirects to the Student Management Dashboard.
  - **Register Mode:**
    - Input: `Full Name` (text), `Username` (text), and `Password` (password).
    - Validation: Full name required, username unique (3-50 chars), password at least 6 characters.
    - Action: Calls `POST /api/auth/register`, then auto-authenticates.
  - **Error Display:** In-line alert displaying validation errors or backend conflict messages (e.g., *"Username already exists"*).

---

### 2.2 Component 2: `Navbar.jsx` (Top Navigation Bar)
- **Primary Responsibility:** Provides branding identity and session termination controls.
- **Functional Requirements:**
  - Display system title: `Student Management System`.
  - Display the currently active management member's name (e.g., *"Member: Tanisha Tyagi"*).
  - Provide a **Logout** button.
  - On Logout: Clears `localStorage` session keys (`sms_token`, `sms_user`) and resets application state to render `AuthPage`.

---

### 2.3 Component 3: `CourseCards.jsx` (Course-Wise Metric Cards)
- **Primary Responsibility:** Summarize real-time enrollment statistics across all academic courses.
- **Functional Requirements:**
  - Dynamically calculate the count of students grouped by their enrolled course (`student.course`).
  - Render an **"All Students"** card indicating the total number of records.
  - Render individual cards for each active course (e.g., *Computer Science*, *Information Technology*, *Data Science*, *Electronics & Comm.*).
  - **Interactive Filtering:** Clicking any course card filters the student records table to display only students belonging to that department.
  - Clicking the selected card again or clicking "All Students" resets the filter.

---

### 2.4 Component 4: `StudentList.jsx` (Student Records Directory)
- **Primary Responsibility:** Present student records in a structured, searchable, and actionable tabular layout.
- **Functional Requirements:**
  - **Data Columns:**
    1. `Student ID`: Unique identifier prefixed with `#` (e.g., `#101`).
    2. `Full Name`: Student's complete registered name.
    3. `Email Address`: Contact email or fallback `-` if omitted.
    4. `Course`: Academic department/branch.
    5. `Semester`: Current semester number (1–8).
    6. `Actions`: Two action buttons per record: **Edit** and **Delete**.
  - **Toolbar Controls:**
    - **Search Field:** Real-time search by ID, Full Name, or Course.
    - **Refresh Button:** Re-fetches the latest dataset from MySQL.
    - **Add Student Button:** Opens the `StudentFormModal` in creation mode.
  - **Course Filter Chip:** When a course card is selected, shows a banner: *"Filtered by course: [Course Name]"* with a *"Show All Courses"* reset button.
  - **State Feedback:** Clean loading state during network transit and descriptive empty state when no matching records exist.

---

### 2.5 Component 5: `StudentFormModal.jsx` (Add & Edit Student Dialog)
- **Primary Responsibility:** Collect and validate student information for insertion or modification.
- **Functional Requirements:**
  - **Add Mode:**
    - Title: *"Add New Student"*.
    - Fields: Student ID (editable, positive integer), Full Name, Email, Course (dropdown), Semester (dropdown 1–8).
    - Buttons: `Save Student`, `Reset`, and `Cancel`.
  - **Edit Mode:**
    - Title: *"Edit Student Details"*.
    - Fields: Pre-populated with the student's existing details.
    - Student ID: Disabled/immutable to preserve database primary key integrity.
    - Buttons: `Update Student`, `Reset` (restores original values), and `Cancel`.
  - **Client-Side Validation:**
    - Student ID: Positive number > 0.
    - Full Name: At least 2 characters, non-empty.
    - Email: Standard email regex format if provided.
    - Course & Semester: Selected from standard allowed options.

---

### 2.6 Component 6: `DeleteConfirmModal.jsx` (Deletion Confirmation)
- **Primary Responsibility:** Prevent accidental loss of data by requiring explicit confirmation before record deletion.
- **Functional Requirements:**
  - Highlight destructive action in danger red.
  - Display summary of target record: Student ID, Full Name, Course, and Semester.
  - Actions:
    - `Cancel`: Dismisses modal with zero state mutation.
    - `Delete`: Invokes `DELETE /api/students/{id}` and triggers immediate table refresh.

---

### 2.7 Component 7: `studentService.js` (API Integration Layer)
- **Primary Responsibility:** Encapsulate all HTTP communication with the backend.
- **Functional Requirements:**
  - Base URL configuration (`http://localhost:8085/api/v1`).
  - Standardized request wrapper injecting `Authorization: Bearer <token>` headers.
  - Standardized JSON serialization and HTTP response error unwrapping.

---

## 3. Multi-Tenant Architecture & Data Isolation Requirements (Decision 1)

### 3.1 Data Isolation Model
- **Strategy:** Shared Database with Discriminator Column (`organization_id` / `tenant_id`).
- **Rationale:** Minimizes infrastructure complexity, ensures high performance within a **Modular Monolith**, and allows seamless schema management.
- **Enforcement Rules:**
  - All tenant-owned tables (`students`, `courses`, `memberships`, `groups`, `roles`) must contain a mandatory, indexed foreign key column `organization_id`.
  - Every backend query must be strictly scoped to the active tenant ID extracted from the authenticated user's security context (using Hibernate filters or Spring Data JPA specifications).
  - Cross-tenant data leakage is prevented at the database query boundary; no query may fetch or mutate rows without an explicit `WHERE organization_id = :tenantId` predicate.

---

## 4. Enterprise Authentication & Identity Requirements

### 4.1 Token Architecture: JWT + Refresh Token
- **Access Token:**
  - Cryptographically signed JSON Web Token (HMAC-SHA256 or RSA-256).
  - Short-lived duration (e.g., 15 minutes) carrying the user's `userId`, `username`, active `organizationId`, and assigned `permissions`.
- **Refresh Token:**
  - Opaque or signed token stored securely in the database (`refresh_tokens` table) with a **strict 1-day (24-hour) expiration time**.
  - Endpoint `POST /api/auth/refresh` issues a new access token when provided a valid refresh token.
  - Refresh tokens are revoked upon user logout or manual session invalidation.

### 4.2 Multi-Factor Verification: Gmail SMTP OTP
- **Trigger Points:**
  1. **Super Admin Authentication:** Mandatory 6-digit numeric OTP sent via Gmail SMTP upon login.
  2. **Client / Organization Onboarding:** Mandatory OTP verification to confirm the organization administrator's official contact email before activating a new school.
- **OTP Specifications:**
  - 6-digit cryptographically random numeric string.
  - Expiry: 5 minutes from generation.
  - Rate limiting: Maximum 3 attempts per OTP generation; maximum 5 OTP requests per hour per email.

### 4.3 School User Registration & Approval Workflow
- When a new user signs up or registers into a school:
  1. The user account is created with status `PENDING_APPROVAL` within that school's membership roster.
  2. The user has **zero resource access** until an authorized school staff member (e.g., School Admin or HR/RBAC Manager) approves their registration.
  3. The school staff assigns the user to appropriate **Departments/Groups** and assigns relevant **Roles**.

---

## 5. Group Hierarchy & RBAC Requirements

### 5.1 RBAC Structural Mapping
To eliminate role explosion and support scalable, autonomous school management, the system enforces a four-tier mapping hierarchy:

```
[User] ──(1:N)──> [Organization Membership]
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
[Direct Role Mapping]           [Group Mapping]
         │                               │
         │                               ▼
         │                        [School Group] ──(N:M)──> [Group Role Mapping]
         │                                                        │
         └───────────────────────────────┬────────────────────────┘
                                         ▼
                                  [Assigned Role] ──(N:M)──> [Permissions / Capabilities]
```

1. **User & Organization Membership (`memberships`):**
   - Connects a global `User` to a specific `Organization` with membership status (`ACTIVE`, `PENDING_APPROVAL`, `SUSPENDED`).
2. **School Groups (`groups`):**
   - Organizational units within a school (e.g., *"Science Department"*, *"Grade 10 Teachers"*, *"Examination Board"*, *"Administrative Staff"*).
3. **Membership to Group Mapping (`membership_group_mapping`):**
   - Assigns a school member into one or more groups.
4. **Group to Role Mapping (`group_role_mapping`):**
   - Assigns roles to an entire group so all group members automatically inherit those roles.
5. **Direct Member Role Mapping (`member_role_mapping`):**
   - Allows assigning exceptional or custom roles directly to individual members where group inheritance is insufficient.
6. **Role to Permission Mapping (`role_permissions`):**
   - Roles group granular capability permissions (e.g., `student:create`, `student:read`, `student:update`, `student:delete`, `course:assign`, `rbac:manage`).

---

## 6. Platform Super Admin Control Panel Requirements

### 6.1 Purpose & Access Restriction
- Dedicated administrative portal accessible **exclusively** to Platform Super Admins (us / platform operators).
- Normal school administrators and school staff cannot access or view this control panel.

### 6.2 Key Functional Capabilities
1. **Client / School Onboarding:**
   - Create and provision a new school/organization with organization name, slug, domain, contact person, and billing plan.
   - Triggers Gmail OTP verification to onboard the primary school administrator.
2. **Organization Status Management (Enable / Disable):**
   - Instant toggle to change school status between `ACTIVE`, `SUSPENDED` (e.g., payment overdue or administrative hold), and `INACTIVE`.
   - Any request originating from a `SUSPENDED` or `INACTIVE` tenant is immediately rejected by the tenant interceptor with `403 Organization Suspended`.
3. **Subscription Plan Management & Quotas:**
   - Enforce plan tiers (`FREE`, `STANDARD`, `ENTERPRISE`).
   - Define and enforce resource quotas per plan:
     - `max_students` (e.g., Free: 100, Standard: 1,000, Enterprise: Unlimited).
     - `max_staff_members`.
     - Feature flags (e.g., advanced reporting, SMS alerts, attendance automation).
4. **Tenant Data Isolation Inspection:**
   - View aggregated analytics per tenant (active student count, storage usage, last login activity) without breaching private student academic records.

---

## 7. Autonomous School Management Roadmap

The long-term vision is an **autonomous school management ecosystem** where:
- Routine administrative workflows (attendance collation, promotion between semesters, grade computations, notification dispatches) run autonomously based on configured school policies.
- School staff use intuitive RBAC interfaces to define custom departmental workflows without engineering intervention.
- The platform control panel provides centralized health monitoring, billing automation, and tenant provisioning.
