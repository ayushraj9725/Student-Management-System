# System Limitations and Operational Boundaries

## 1. Introduction
This document defines the technical boundaries, architectural limitations, and operational constraints of the **Student Management System**. It also sets the governance limitations enforced on all development activities.

---

## 2. Current System Limitations

### 2.1 Authentication & Session Management
- **Token Mechanism:** Currently uses a secure token in browser `localStorage`.
- **Roadmap Resolution (Agreed Specification):** Transitioning to Spring Security JWT with asymmetric signature verification, a database-persisted **Refresh Token (strict 1-day / 24-hour validity)**, and **Gmail SMTP OTP verification** for client onboarding and Super Admin login.
- **Session Expiry:** Managed via short-lived JWT access tokens and 24-hour rotating refresh tokens.
- **Password Recovery:** Automated OTP verification via Gmail SMTP.

### 2.2 Role-Based Access Control (RBAC) & Multi-Tenancy
- **Current State:** Single organization prototype with unified admin privileges.
- **Roadmap Resolution (Agreed Specification):**
  - **Multi-Tenancy:** Shared database with discriminator column (`organization_id`) enforcing strict query isolation (Decision 1).
  - **Super Admin Control Panel:** Dedicated portal to onboard, enable/disable schools, and enforce subscription plan quotas.
  - **Group & Capability RBAC:** User -> Membership -> Groups (Departments) -> Roles -> Capability Permissions. School staff manage roles and assign memberships dynamically.

### 2.3 Data Volume & Pagination
- **Client-Side Rendering:** The backend returns full or filtered lists (`List<Student>`), and the React interface displays the active records.
- **Limitation:** Suitable for up to a few thousand students. Large enterprise scale (100,000+ records) requires backend server-side pagination (`org.springframework.data.domain.Pageable`).

### 2.4 Document & File Uploads
- **Text & Metadata Only:** Records include Student ID, Full Name, Email, Course, and Semester.
- **Limitation:** Profile photos, marksheet attachments, admission PDFs, and identity documents are not supported in the initial version.

### 2.5 Audit Trails & History
- **Direct Update/Delete:** Modifying or deleting a student record alters or removes the database row directly.
- **Limitation:** No historical change log or soft-deletion (`is_deleted = true`) mechanism is currently enabled.

### 2.6 Deployment & Security
- **Local Network Deployment:** Configured for `localhost` operation over HTTP (Ports `8085` and `4000`).
- **Limitation:** Production TLS/SSL termination (`https://`) and CORS domain whitelisting must be configured before deploying to public cloud servers.

### 2.7 Operational & Development Governance Boundaries
- **No Unilateral Decision-Making:** Neither the AI assistant nor developers may make autonomous architectural or design decisions. All scenarios and tradeoffs must be presented to and approved by the user first.
- **No Direct Database-Level Bypasses:** No raw or ad-hoc CRUD operations may be performed directly on the database engine. All mutations must strictly pass through the layered application architecture (Controller -> Service -> Repository).
- **Strict Code Minimization:** No unnecessary lines of code, speculative logic, dead code, or unusual patterns may be introduced. All implementations must be maintainable, reusable, and compliant with SOLID principles.

---

## 3. Future Scope & Enhancement Roadmap

| Phase | Enhancement Feature | Description |
| :--- | :--- | :--- |
| **Phase 2** | JWT & Refresh Token Auth | Implement asymmetric JWT signing with expiration headers |
| **Phase 3** | Server-Side Pagination | Integrate Spring Data `Page<Student>` with sorting and page size controls |
| **Phase 4** | Attendance Tracking Module | Record daily attendance per semester and course |
| **Phase 5** | Academic Marks & Grading | Support GPA/CGPA computation, exam results, and report card generation |
| **Phase 6** | Export & Reporting | Export student rosters and filtered views to Excel (XLSX) and PDF |
| **Phase 7** | Soft Deletes & Audit Log | Retain deleted records with deletion timestamp and actor username |
| **Phase 8** | Cloud Deployment | Dockerize with `docker-compose.yml` for AWS/GCP/Azure deployment |
