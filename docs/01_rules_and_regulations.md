# Rules, Regulations & Coding Governance Standards

## 1. Prime Directive: Collaborative Alignment & Zero Unilateral Decisions

> [!IMPORTANT]
> **MANDATORY RULE 1: NO AUTONOMOUS DECISIONS.**
> Before any code is written, modified, or deleted, all design scenarios, approaches, and tradeoffs **MUST be discussed with and approved by the USER**.
> - The assistant/developer must analyze options, lay out tradeoffs clearly, and seek explicit user confirmation.
> - No architectural or structural decision shall be taken independently without user alignment.

---

## 2. Fundamental Engineering Principles

### 2.1 Full Adherence to SOLID Principles
Every module, service, component, class, and method must strictly embody the five SOLID principles:

1. **Single Responsibility Principle (SRP):**
   - Each class and component must have one, and only one, reason to change.
   - Controllers handle HTTP routing/status codes only; Services handle business rules only; Repositories handle database operations only; UI components handle presentation and local user events only.
2. **Open/Closed Principle (OCP):**
   - Code must be open for extension, but closed for modification. Extend behavior via interfaces, inheritance, or composition without rewriting existing tested logic.
3. **Liskov Substitution Principle (LSP):**
   - Subtypes and implementations must be completely substitutable for their base types and interfaces without altering the correctness of the program.
4. **Interface Segregation Principle (ISP):**
   - Clients must never be forced to depend on methods or interfaces they do not use. Keep interfaces focused, purposeful, and lightweight.
5. **Dependency Inversion Principle (DIP):**
   - High-level modules must not depend on low-level modules; both must depend on abstractions. Depend on interfaces (e.g., `StudentRepository`), injected via Spring's dependency injection (`@Autowired` / constructor injection).

---

## 3. Strict Code Quality & Minimalism Rules

### 3.1 Maintainability and Reusability
- **Self-Documenting Code:** Write clear, expressive method and variable names that reveal intent without requiring cryptic comments.
- **DRY (Don't Repeat Yourself):** Logic must never be copy-pasted across files or components. Common validation routines, formatting helpers, and API handlers must be modularized into reusable units.
- **Separation of Concerns:** Keep presentation, business logic, and persistence strictly isolated across distinct layers.

### 3.2 Zero Bloat — No Unnecessary or Unusual Code
- **No Unnecessary Lines:** Never write speculative code, unused helper methods, commented-out dead code, or redundant abstractions.
- **No Unusual Dependencies or Hacks:** Do not introduce third-party libraries, complex design patterns, or exotic configurations unless specifically discussed, evaluated, and explicitly approved by the user.
- **Minimalist Footprint:** Every single line of code must serve a direct, verifiable requirement.

---

## 4. Layered Architectural Integrity & Database Rules

### 4.1 Strict Layer Flow
```
User Action / UI View (React Component)
         │
         ▼
API Service Layer (`studentService.js`)
         │
         ▼  [JSON / HTTP REST]
Spring Boot REST Controller (`StudentController.java`)
         │
         ▼
Spring Boot Service Layer (`StudentService.java`)
         │
         ▼
Spring Data JPA Repository (`StudentRepository.java`)
         │
         ▼
Database Storage Engine (`MySQL - student_db`)
```

### 4.2 Database CRUD Discipline
- **Rule 4.1: No Raw / Ad-Hoc Database-Level CRUD Operations.**
  - Direct database modifications, manual bypasses, or ad-hoc table mutations outside the application lifecycle are strictly prohibited.
  - All CRUD operations must execute through the formal application pipeline: `Controller -> Service -> Repository -> JPA -> MySQL`.
  - Database schema alterations must be tracked, reviewed, and approved prior to application.
- **Rule 4.2: Data Integrity & Validation at Both Client and Server:**
  - Client-side validation for instant user feedback.
  - Server-side Jakarta validation (`@Valid`, `@NotBlank`, `@Min`, `@Max`, `@Email`) to ensure database constraints cannot be bypassed.
  - Duplicate checks (e.g., Student ID uniqueness) must be executed in the Service layer before attempting persistence.

### 4.3 Mandatory API Versioning (`/api/v1/*`)
- **Strict Rule:** Every REST API controller must be versioned through `application.properties`:
  ```properties
  api.version=v1
  api.prefix=/api/${api.version}
  ```
- **Controller Implementation:** All controllers must use the property placeholder:
  `@RequestMapping("${api.prefix:/api/v1}/resource-name")`
- **Frontend Integration:** All frontend services (`studentService.js`, `authService.js`) must route calls to `/api/v1/*`.
- **Future Versioning:** When breaking changes occur in future milestones, a new version (e.g. `v2`) can be introduced seamlessly without breaking legacy consumers.

---

## 5. Security & Exception Handling Standards

- **Centralized Exception Handling:** All backend errors must be caught by `GlobalExceptionHandler` (`@RestControllerAdvice`). Never expose raw stack traces or internal SQL errors.
- **Predictable Error Payloads:** Return standardized JSON error envelopes:
  ```json
  {
    "timestamp": "2026-10-23T12:00:00",
    "status": 409,
    "error": "Conflict",
    "message": "Student with ID 101 already exists."
  }
  ```
- **Password Security:** All credentials must be salted and hashed before storing. Plaintext passwords must never touch the database.

---

## 6. Pre-Implementation Checklist (Before Any Coding)

Before writing any new code or modifying existing files, the developer/assistant must verify:
- [ ] Has the assistant thoroughly reviewed all documents in `docs/` before proceeding?
- [ ] Has the scenario been thoroughly explained to the user?
- [ ] Have the architectural options and tradeoffs been presented?
- [ ] Has the user explicitly approved the chosen direction?
- [ ] Does the proposed code strictly adhere to SOLID principles?
- [ ] Is the proposed code free of unnecessary lines, boilerplate, or unusual patterns?
- [ ] Does the data flow respect the layered architecture without bypassing the Service/Repository layers?

---

## 7. Frontend Modular Architecture & Next.js Coding Standards

### 7.1 Modular Folder Hierarchy (`frontend/src/`)
Frontend code must be strictly partitioned into modular, single-responsibility directories:

```
frontend/
├── next.config.mjs             # API proxy rewrites to Spring Boot (port 8085)
├── package.json                # "dev": "next dev -p 4000"
└── src/
    ├── app/                    # Next.js App Router (Page views & layouts only)
    │   ├── layout.jsx          # Root layout, metadata, global styles import
    │   ├── page.jsx            # Student Directory & Course Metrics Dashboard
    │   ├── login/
    │   │   └── page.jsx        # Authentication & Staff Registration View
    │   ├── admin/
    │   │   └── control-panel/
    │   │       └── page.jsx    # Master Platform Control Panel (Super Admin only)
    │   └── settings/
    │       └── rbac/
    │           └── page.jsx    # School Staff RBAC & Group Management View
    │
    ├── components/             # Reusable, Presentational UI Components
    │   ├── common/             # Buttons, Badges, Loaders, ErrorAlerts
    │   ├── layout/             # Navbar.jsx, Sidebar.jsx, PageHeader.jsx
    │   ├── students/           # StudentList.jsx, CourseCards.jsx
    │   └── modals/             # StudentFormModal.jsx, DeleteConfirmModal.jsx
    │
    ├── services/               # Pure HTTP API Integration Layer (No UI rendering)
    │   ├── apiClient.js        # Centralized Fetch/Axios wrapper with JWT interceptor
    │   ├── studentService.js   # Student & Course CRUD operations
    │   └── authService.js      # Login, Register, Refresh Token, OTP
    │
    ├── hooks/                  # Reusable Custom React Hooks
    │   ├── useStudents.js      # Student state management & filtering
    │   └── useAuth.js          # Authentication context & session state
    │
    └── styles/
        └── index.css           # Minimalist White/Black/Blue Design System Tokens
```

### 7.2 Strict Naming Conventions
- **React Components:** Must be `PascalCase.jsx` (e.g., `CourseCards.jsx`, `StudentList.jsx`, `DeleteConfirmModal.jsx`).
- **Services & Utilities:** Must be `camelCase.js` (e.g., `studentService.js`, `apiClient.js`, `authService.js`).
- **Next.js Route Directories:** Must be `lowercase-kebab-case` (e.g., `control-panel/page.jsx`, `rbac-settings/page.jsx`).
- **Variables & Functions:** Must be `camelCase` (e.g., `studentList`, `fetchStudents`, `handleSubmit`).
- **Constants:** Must be `UPPER_SNAKE_CASE` (e.g., `DEFAULT_PAGE_SIZE`, `API_BASE_URL`).
- **Boolean Variables:** Must be prefixed with `is`, `has`, or `should` (e.g., `isLoading`, `hasError`, `isModalOpen`).

### 7.3 Component Reusability & Architectural Principles
1. **Single Responsibility Principle (SRP):**
   - Each component must do one thing well.
   - Separate container components (fetching data) from presentational components (rendering DOM).
2. **Zero Duplicate UI Code (DRY):**
   - Never duplicate modal structures, table rows, button styles, or card containers.
   - Extract recurring visual elements into reusable components under `src/components/common/`.
3. **Explicit Client Boundaries:**
   - Mark files with `'use client'` strictly when client-side hooks (`useState`, `useEffect`) or browser DOM events are required. Keep layouts as Server Components wherever possible.

---

## 8. Strict Minimalism — Zero Bloat & No Unnecessary Lines of Code

> [!CAUTION]
> **ABSOLUTE BAN ON CODE BLOAT:**
> - Never write unnecessary, speculative, or dead lines of code.
> - No unused variables, dead imports, empty methods, or redundant wrapper elements.
> - Every single line of code written must directly satisfy an explicit, verified functional requirement.

---

## 9. Modular Monolith Architecture & Fixed Bounded Contexts

### 9.1 Preservation of Working Code
- All existing working APIs, controllers, and services (such as existing Student CRUD and Authentication) must be **preserved intact** and not broken or discarded.

### 9.2 Package Separation by Context
All new and evolved modules must strictly reside in their dedicated bounded context package:
1. **`com.student.management.platform`**:
   - Platform Super Admin, Organization (Tenant) provisioning, Subscription Plans, and Quota enforcement.
2. **`com.student.management.iam`**:
   - Identity, Memberships, Groups (Departments), Roles, Permissions, JWT tokens, and OTP verification.
3. **`com.student.management.academic`**:
   - Core student records, courses, and department academic logic.
4. **`com.student.management.shared`**:
   - Cross-cutting kernel (TenantContextHolder, base exceptions, common response wrappers).

### 9.3 Boundary Inviolability Rules
- **Rule 9.1: Zero Cross-Context SQL Joins or Foreign Keys:**
  - Database tables in one context must never declare foreign keys to tables in another context. Reference by scalar `organization_id` or `user_id` BIGINT only.
- **Rule 9.2: Isolated Repositories:**
  - Repositories are private to their context. Contexts must never inject or query another context's internal JPA repositories directly.
- **Rule 9.3: Contract-Based Communication:**
  - Inter-context communication must strictly flow through public Java Service interfaces or DTO contracts.

---

## 10. Enterprise Code Standards & Production Design Principles

### 10.1 Service Layer Interface & Implementation Pattern
- Every business service must be defined as an interface in `service/` and implemented in a nested `service/impl/` package.
- Example:
  - Interface: `com.student.management.platform.service.PlatformService`
  - Implementation: `com.student.management.platform.service.impl.PlatformServiceImpl`
- Controllers and other contexts must inject the Service interface, never the concrete implementation.

### 10.2 Complete Modular Package Layers Per Context
Each bounded context must own its complete vertical slice:
```
com.student.management.<context>/
├── controller/         # REST API endpoints (consumes RequestDTO, returns ResponseDTO)
├── service/            # Public business service interfaces
│   └── impl/           # Concrete business service implementations
├── repository/         # Spring Data JPA repositories
├── entity/             # JPA entity definitions (using Lombok)
├── dto/                # Isolated Request and Response DTOs
└── mapper/             # MapStruct compile-time mappers
```

### 10.3 Strict DTO Encapsulation
- Controllers must **never** return or accept JPA `@Entity` classes directly.
- Every endpoint input must be a validated Request DTO (`@Valid @RequestBody`).
- Every endpoint output must be a dedicated Response DTO.

### 10.4 Lombok & MapStruct Integration
- Entities and DTOs must use **Lombok** (`@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`) to eliminate boilerplate.
- Object transformations must strictly use **MapStruct** (`@Mapper(componentModel = "spring")`). No manual, repetitive mapping methods in controllers or services.

### 10.5 Structured Logging Standard
- All classes requiring logging must use Lombok's `@Slf4j`.
- Absolute ban on `System.out.println` and `System.err.println`.
- Use contextual log levels: `log.debug()` for internal state, `log.info()` for lifecycle events, `log.warn()` for recoverable issues, `log.error()` for failures.

### 10.6 Mandatory Constructor Injection
- All dependencies must be injected via constructor injection using Lombok's `@RequiredArgsConstructor` with `private final` fields.
- Field injection (`@Autowired` on private fields) is strictly forbidden.

### 10.7 Professional Comments & Zero Emojis Policy
- All comments must be clear, concise, professional JavaDoc or inline comments.
- **Absolute ban on emojis** in source code, comments, log statements, commit messages, and documentation.

### 10.8 Enterprise Auditing Columns & Entity Lifecycle Callbacks
- Every entity in the system must incorporate standard enterprise audit tracking:
  - `createdAt` (`ZonedDateTime`): Timestamp with timezone of record insertion (`@PrePersist`, non-updatable).
  - `updatedAt` (`ZonedDateTime`): Timestamp with timezone of latest record modification (`@PrePersist`, `@PreUpdate`).
  - `createdBy` (`UUID`): UUID identifier of the user who created the record.
  - `updatedBy` (`UUID`): UUID identifier of the user who last updated the record.
- **Strict Time Standard:** Always use `ZonedDateTime` across all entities, DTOs, and exception handlers. Do not use `LocalDateTime` or `LocalDate`.
- Use `@PrePersist` and `@PreUpdate` lifecycle callback annotations to automatically guarantee timestamp integrity.
- Encapsulated via standard `@MappedSuperclass` `BaseEntity` under `com.student.management.shared.entity.BaseEntity` to preserve DRY and SOLID principles.

---

## 11. Production-Grade Frontend Architecture & Visual Design Governance

### 11.1 Access Boundaries & Persona Separation
- **Platform Owner Level (`/platform`):**
  - Reserved exclusively for Platform Operators and Super Admins.
  - Used for tenant provisioning, subscription quota governance, and platform-wide telemetry.
  - School staff and organization members must never access the platform administration layer.
- **Organization / School Level (`/iam` and academic workflows):**
  - Dedicated to verified organization members (School Admins, Principals, Teachers, Registrars).
  - Governed by tenant isolation: requests must pass `X-Tenant-ID` and enforce membership approval status (`ACTIVE`).
  - Platform owners cannot access school-specific private data without designated tenant context.

### 11.2 Production Service Layer & Dynamic API Routing
- Every API interaction must reside in dedicated, modular service files under `src/services/` (e.g., `platformService.js`, `rbacService.js`, `studentService.js`).
- **Zero Hardcoded URLs:** All requests must construct paths using the configurable environment base (`process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085'`) and the versioned prefix (`/api/v1`).
- Every visual state, dropdown, and table must be driven directly by backend REST endpoints. Mock data and speculative props are strictly prohibited.

### 11.3 Strict Visual Design & Color Governance
- **Curated Executive Palette:**
  - **Backgrounds & Surface:** Clean White (`#FFFFFF`), Soft Slate/Off-White (`#F8FAFC`, `#F1F5F9`).
  - **Primary & Interactive Accents:** Light Blue (`#E0F2FE` soft tint, `#0284C7` / `#0369A1` primary interactive state).
  - **Secondary Accents & Highlights:** Light Pink / Subtle Rose (`#FCE7F3` soft blush, `#F472B6` / `#DB2777` subtle highlights).
  - **Prohibition on Over-Coloring:** No loud rainbow gradients, neon glows, or arbitrary color schemes. Maintain a disciplined, minimalist, enterprise-grade aesthetic.
- **Absolute Ban on Emojis:**
  - ZERO emojis are permitted in the user interface, navigation bars, sidebars, buttons, badges, modals, empty states, or alerts.
  - All iconography must strictly use crisp vector SVG icons from `lucide-react`.

### 11.4 Official Platform Title
- The system is officially named **"My Edu Care"**.
- The main navigation and UI shell must prominently and consistently display **"My Edu Care"** as the product brand title.

### 11.5 Mandatory UI Typography — Never Use Capital Letter Titles
- **Absolute Prohibition on All-Caps / Uppercase Titles on UI:**
  - Titles, metric card headers, table column headers, labels, and badges must **NEVER** be rendered in ALL CAPS / `uppercase` (e.g. do not write `TOTAL SCHOOLS` or `SCHOOL / TENANT NAME`).
  - Always use standard, readable **Title case** or **Sentence case** (e.g., `Total Schools`, `Active Tenants`, `School Name`, `Subscription Plan`, `Contact Email`).
  - CSS property `text-transform: uppercase;` is strictly forbidden on UI titles and headers.

### 11.6 Balanced Icon Usage — No Over-Iconification
- Keep the interface clean, calm, and readable.
- Do not overuse decorative icons or wrap every piece of text in colored icon boxes.
- Icons must be used sparingly and purposefully where they add functional clarity.

### 11.7 Zero Database IDs in Public URLs — Mandatory Slug-Based Routing
- **Absolute Ban on Numeric Database IDs in URLs:**
  - Public route URLs must **NEVER** expose raw database primary key numbers (e.g., do not use `/organizations/1` or `/1/admin`).
  - All school tenant routes must exclusively use the clean, URL-safe alphanumeric **slug** (e.g., `/delhi-public-school/admin` or `/delhi-public-school`).
- **Standardized URL Scope Hierarchy:**
  - **Platform Control Plane:** `/platform` (accessible exclusively to Platform Super Admins for global tenant provisioning and plans).
  - **School Head Admin Portal:** `/[slug]/admin` (School Heads type their school's unique slug with `/admin` to access their institution's executive dashboard, staff approvals, and role mapping, strictly segregated by their tenant boundary).
  - **Staff & Student Portal:** Default home `/` or `/[slug]` (for staff and students to access academic workspaces).

### 11.8 Absolute Prohibition on Half-Done Work — Complete Edge-Case Governance
- **Mandatory Complete Implementation Guarantee:**
  - Never leave code half-implemented, incomplete, or as a superficial stub.
  - Every single requirement, feature, API flow, and security mechanism must be designed, written, and verified completely with **all edge cases explicitly handled** (e.g., token rotation, concurrent request deduplication, silent retry interceptors, network error fallbacks, database revocation, and session invalidation).
- **Zero Premature Claims of Completion:**
  - Never confirm that a phase or task is "ready", "complete", or "working fine" unless every component has been tested end-to-end and verified against real execution.
- **Zero Stealth-Patching & Full Transparency:**
  - When the user asks a clarifying question or reviews an architecture, never quietly patch missing code in the background while pretending it was always implemented.
  - Be 100% upfront, transparent, and direct about what is implemented, what is pending, and how each component operates.

