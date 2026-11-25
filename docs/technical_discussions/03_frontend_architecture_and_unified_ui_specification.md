# Unified Frontend Layout & Module UI/UX Architecture Specification
## Multi-Tenant AppShell, Dynamic Permission-Driven Navigation & Module Implementation Blueprints

**System:** My School Care (Multi-Tenant SaaS)  
**Author:** Ayush Raj & Principal Engineering Team  
**Document Location:** `docs/technical_discussions/03_frontend_architecture_and_unified_ui_specification.md`  
**Classification:** Authoritative UI/UX Architecture & Planning Blueprint  
**Status:** Planning & Requirements Gathering (Pre-Implementation Phase)  

---

## 1. Executive Summary & Design Vision

The user interface of **My School Care** must cater to diverse institutional actors—from the Platform SuperAdmin and School Principal to Department Heads, Teachers, Accountants, and Administrative Clerks.

Rather than fragmenting the user experience with disjointed, role-specific portals, the platform implements a **Single Unified AppShell & Design System**. Every user experiences the same clean, responsive layout. What changes dynamically is the **Navigation Visibility Layer** and **Action Capabilities**, strictly governed by:
1. **Platform Subscription Entitlements**: Whether the school has licensed the application module.
2. **Organization Head Feature Toggles**: Institutional configuration allowing the Principal to show/hide specific functional modules.
3. **Granular RBAC Permissions**: User-level permissions (`STUDENT_VIEW`, `STUDENT_CREATE`, `STAFF_VIEW`, etc.) dictating sidebar items, table row actions, and field editability.

```
┌────────────────────────────────────────────────────────────────────────┐
│               THREE-TIER DYNAMIC NAVIGATION VISIBILITY LAYER           │
├────────────────────────────────────────────────────────────────────────┤
│ Tier 1: Platform Entitlement   │ School licensed for "Student Module"? │
│ Tier 2: School Head Toggles    │ Principal enabled "Online Admission"? │
│ Tier 3: User RBAC Permissions  │ User has "STUDENT_CREATE" permission? │
├────────────────────────────────────────────────────────────────────────┤
│           RESULT: Dynamic, Tailored, Zero-Clutter Sidebar              │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Global Shell & Unified Layout Architecture

Based on the validated dashboard layout (inspired by the EduDash architectural pattern), the viewport is structured into three persistent zones:

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│ TOP EXECUTIVE NAVBAR: School Badge | Global Search | Notifications | Profile Pill │
├──────────────────┬─────────────────────────────────────────────────────────────────┤
│ GLOBAL SIDEBAR   │ MAIN CONTENT AREA (Clean Slate)                                 │
│ • Home           │ ┌─────────────────────────────────────────────────────────────┐ │
│ • Students (v)   │ │ Page Header (Title + Breadcrumbs + Primary Action Button)   │ │
│   - Directory    │ ├─────────────────────────────────────────────────────────────┤ │
│   - Admission    │ │ Filters & Search Bar (Debounced search, Status/Class filter)│ │
│   - Categories   │ ├─────────────────────────────────────────────────────────────┤ │
│ • Teachers (v)   │ │ Primary Content Container:                                  │ │
│   - Directory    │ │ • Data Table (Scannable, paginated, row action menu)        │ │
│   - Profile      │ │ • Sectioned Form (Clean white cards, logical field groups)  │ │
│ • Attendance     │ │ • Profile View (Header summary + conceptual tab sections)   │ │
│ • Fees & Billing │ └─────────────────────────────────────────────────────────────┘ │
│ • Role & Access  │                                                                 │
│ • Settings       │                                                                 │
└──────────────────┴─────────────────────────────────────────────────────────────────┘
```

### 2.1 The Dynamic Navigation Engine
The sidebar is configured via a declarative menu registry. Every menu item defines its gating criteria:
```typescript
interface MenuItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  requiredAppCode: string;          // e.g., 'STUDENT_MANAGEMENT' (Tier 1)
  schoolToggleKey?: string;         // e.g., 'ENABLE_ONLINE_ADMISSION' (Tier 2)
  requiredPermission?: string;      // e.g., 'STUDENT_VIEW' (Tier 3)
  children?: MenuItem[];
}
```

If any condition fails, the item is completely hidden from the DOM. This ensures a teacher only sees relevant educational workflows, an accountant only sees fee ledgers, and the school head retains complete administrative oversight.

---

## 3. Mandatory UI State Protocol (Zero Layout Shift)

Every screen across the platform must implement the **8 Core UI States** without jarring layout jumps:

1. **Loading State**: Render pulse skeleton screens matching the exact geometry of tables or cards. Avoid generic centered spinners that cause content flashing.
2. **Empty State**: When no data exists, display a clear, friendly illustration with explanatory text and a permitted primary call-to-action (e.g. *"No students enrolled yet. [Admit First Student]"*).
3. **No Search Results State**: When filters yield zero records, explicitly display *"No records matched your search filters"* with a single-click *"Clear Filters"* button.
4. **Error State**: Informative error banner explaining what failed, with a *"Retry"* action button; never expose raw backend stack traces or database errors.
5. **Success State**: Non-blocking toast confirmation (e.g. *"Student admitted successfully"*), immediately reflecting the updated record in the view.
6. **Pending / Inactive State**: Clear status badges indicating workflow progress (e.g., `PENDING_VERIFICATION`, `SUSPENDED`, `TRANSFERRED`).
7. **Permission Denied State**: Graceful lock-screen or inline card (*"You do not have permission to view financial details. Contact your administrator."*), ensuring zero unauthorized data leakage.
8. **Destructive Action Confirmation**: Red-themed confirmation modal clearly detailing downstream impact (e.g., *"Withdrawing this student will archive their academic records and disable portal access. Are you sure?"*).

---

## 4. The 6-Phase Implementation Sequence & Blueprints

Following the recommended implementation sequence:
`Business Requirement → Screen Specification → Low-Fi Wireframe → Permission Rules → API Requirements → Implementation → Ground-Level Testing`.

---

### Screen 1: Student List (Directory)

#### 1. Business Purpose
The School Registrar, Principal, and Class Teachers use this screen daily to locate students, review enrollment statuses, filter by class/section, and trigger profile reviews or status updates.

#### 2. Layout & Wireframe Pattern
- **Top Header**: Title (*"Student Directory"*), total student count badge, and *"New Admission"* primary action button (visible only if user has `STUDENT_CREATE`).
- **Filter Row**:
  - Global debounced search bar (matches Student Name, Admission Number, Roll Number).
  - Class dropdown (e.g. Grade 1 to 12).
  - Section dropdown (A, B, C).
  - Status dropdown (`ACTIVE`, `SUSPENDED`, `TRANSFERRED`, `GRADUATED`).
- **Table Columns**:
  1. `Admission No` (Bold mono font)
  2. `Student Name` (Avatar thumbnail + Full Name + Gender)
  3. `Class & Section` (e.g. `Grade 10 - A`)
  4. `Roll No`
  5. `Parent / Guardian Name` + Phone Number
  6. `Enrollment Status` (Badge: Active = Green, Suspended = Yellow, Transferred = Grey)
  7. `Actions` (Three-dots dropdown menu: View Profile, Edit Details, Academic Record, Suspend/Transfer)
- **Pagination & Footer**: Page size selector (10, 25, 50), current page index, total count.

#### 3. RBAC Permissions
- `STUDENT_VIEW`: Required to access the page and search records.
- `STUDENT_CREATE`: Required to see the *"New Admission"* button.
- `STUDENT_EDIT`: Required to access the *"Edit Details"* action.
- `STUDENT_STATUS_UPDATE`: Required to trigger suspension, withdrawal, or transfer.

---

### Screen 2: Add Student / Admission Form

#### 1. Business Purpose
Allows admission officers to onboard new students, capturing identity, legal guardianship, medical notes, and initial academic enrollment.

#### 2. Form Layout & UX Pattern
The form follows a **Section-based Card Architecture** (as shown in the reference architecture), with an optional 5-step stepper for public parent applications:
- **Card 1: Academic Enrollment**:
  - Academic Year, Class, Section, Roll Number, Admission Date.
- **Card 2: Personal Information**:
  - First Name, Last Name, Date of Birth, Gender, Blood Group, Aadhar/National ID, Nationality, Mother Tongue, Student Photo.
- **Card 3: Parent & Legal Guardian Info**:
  - Father's Name, Phone, Occupation.
  - Mother's Name, Phone, Occupation.
  - Primary Contact Designation (Father / Mother / Guardian).
  - Emergency Contact Phone & Address.
- **Card 4: Residential Address**:
  - Current Address, Permanent Address, City, Postal Code.
- **Card 5: Medical & Health Details**:
  - Blood Group, Known Allergies, Dietary Restrictions, Emergency Hospital/Physician Contact.
- **Card 6: Document Uploads**:
  - Birth Certificate, Previous Transfer Certificate (TC), Aadhaar Card Copy.

#### 3. Save & Validation Behavior
- Client-side validation using Zod/React Hook Form for instant inline error messaging.
- Draft vs Submit workflow: Officers can save incomplete entries as `DRAFT` and finalize when documents arrive.
- Idempotency guard: Prevents double-submission on slow network connections.

---

### Screen 3: Student Profile

#### 1. Business Purpose
Serves as the comprehensive 360-degree single-source-of-truth for an enrolled student.

#### 2. Layout & Conceptual Sections
- **Executive Profile Banner**:
  - Student Photo, Full Name, Admission Number, Current Class/Section, House/Group, Active Status Badge.
  - Quick Contact Pills (Parent Phone, Emergency Phone).
  - Top Action Buttons: *"Edit Profile"*, *"Print ID Card"*, *"Generate Transfer Certificate"*.
- **Tab Navigation**:
  1. **Overview Tab**: Key demographic details, guardian summary, attendance rate percentage, current fee dues badge.
  2. **Personal & Family Tab**: Comprehensive biological, guardian, and residential address data.
  3. **Academic Tab**: Current subjects enrolled, assigned class teacher, classroom location.
  4. **Medical & Special Needs Tab**: Doctor contact, allergies, emergency protocol.
  5. **Uploaded Documents Tab**: Downloadable file repository (Birth certificate, prior report cards).

---

### Screen 4: Student Academic History & Lifecycle

#### 1. Business Purpose
Maintains the immutable historical record of the student across their years in the school, tracking promotions, grade retentions, section transfers, and alumni graduation.

#### 2. Layout & Data Specifications
- **Current Enrollment Card**: Highlights current active grade and section.
- **Lifecycle Timeline / Table**:
  - Academic Year (e.g. `2024-2025`, `2025-2026`).
  - Class & Section completed.
  - Final Grade / Percentage / GPA.
  - Annual Attendance Record.
  - Outcome (`PROMOTED_TO_NEXT_GRADE`, `RETAINED`, `TRANSFERRED`).
  - Promotion Date & Approving Official.

---

### Screen 5: Staff Directory & Staff Profile

#### 1. Business Purpose
Human Resources, Principal, and Department Heads manage the institutional workforce (Teachers, Administrative Staff, Counselors, Support Staff).

#### 2. Staff Profile Conceptual Sections (Per Approved Wireframe)
- **Staff Header**:
  - Avatar, Staff Full Name, Employee ID (e.g., `EMP-1042`), Designation (e.g., `Senior Mathematics Teacher`), Status (`ACTIVE`), Department (`Science & Mathematics`).
- **Nine Conceptual Sections**:
  1. `Overview`: Quick summary card of active assignments and tenure.
  2. `Personal Information`: DOB, Gender, Blood Group, Marital Status.
  3. `Contact & Emergency Contact`: Mobile, Official Email, Emergency Contact Person & Phone.
  4. `Employment Details`: Date of Joining, Employment Type (Permanent / Contract), Designation, Reporting Manager.
  5. `Professional Qualifications`: Degrees, Certifications, B.Ed/M.Ed details, Specializations.
  6. `Class & Subject Assignments`: Matrix of grades and subjects taught (e.g., Grade 9-B Algebra, Grade 10-A Geometry).
  7. `Attendance & Leave`: Monthly attendance percentage, Leave balances (Casual, Sick, Earned).
  8. `Documents`: Resume, Degree Certificates, Government ID copies.
  9. `Employment History`: Prior school experience, promotions, and commendations.

---

### Screen 6: Dashboard & Executive Reports

#### 1. Business Purpose
Provides high-level, actionable KPIs tailored to the user's role without unnecessary visual decoration.

#### 2. Role-Specific Dashboards
- **Principal / Management Dashboard**:
  - Total Active Students & Staff count.
  - Daily Attendance Percentage (Student vs Staff).
  - Pending Admissions Queue count.
  - Fee Collection summary (Today vs Monthly Target).
- **Teacher Dashboard**:
  - Today's Class Schedule (Periods, Classrooms, Subjects).
  - Unrecorded Attendance Alerts for assigned homerooms.
  - Quick action: *"Mark Class Attendance"*.

---

## 5. Architectural Checklist for Implementation

Before any line of frontend code is authored:
- [ ] User persona and primary task identified for the specific screen.
- [ ] Table/Form/Profile patterns chosen strictly from the approved design system.
- [ ] Columns, fields, and validations approved; no invented fields.
- [ ] Dynamic sidebar visibility mapped to application entitlements and RBAC permissions.
- [ ] All 8 UI states (Loading, Empty, No Results, Error, Success, Pending, Denied, Destructive) defined.
- [ ] Real backend APIs and query parameters mapped with `:organizationId` enforcement.
