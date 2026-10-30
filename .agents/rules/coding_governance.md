# Coding Governance & Mandatory Alignment Rules

## 0. Mandatory Documentation Review (Every Interaction)
- **At every interaction and before executing any task or writing code, the agent MUST go through and strictly comply with all documentation in the `docs/` directory:**
  - `docs/01_rules_and_regulations.md` (Coding standards, SOLID principles, frontend & backend architecture)
  - `docs/02_limitations_document.md` (System limitations & operational boundaries)
  - `docs/03_component_requirements_discussion.md` (Functional & non-functional requirements)
  - `docs/04_component_design_document.md` (Design tokens, wireframes, Bounded Contexts, ER schema)
  - `docs/05_technology_stack_document.md` (Java 21, Spring Boot 4, PostgreSQL, Next.js React 19)
  - `docs/06_implementation_modules_document.md` (Module breakdowns & request lifecycles)
  - `docs/07_real_life_staff_workflow_and_rbac_guide.md` (Real-world school workflows & group RBAC)
  - `docs/08_cloud_and_private_cloud_migration_guide.md` (Database & object storage cloud migration)

## 1. Mandatory Discussion Before Execution (No Autonomous Decisions)
- BEFORE writing or modifying any code, the agent MUST discuss all scenarios, approaches, and tradeoffs with the USER.
- Never make unilateral decisions. Always propose options and let the user decide.

## 2. SOLID Principles Across Backend & Frontend
- Every class, service, repository, component, hook, and utility MUST adhere to the SOLID principles (Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion).
- Components handle UI rendering and user interactions only; Services handle API communication only.

## 3. Modular Architecture, Reusability & Naming Conventions
- Maintain a strictly modular folder structure (`src/app/`, `src/components/`, `src/services/`, `src/hooks/`, `src/styles/`).
- **File Naming:**
  - React components: `PascalCase.jsx` (e.g., `CourseCards.jsx`, `StudentList.jsx`).
  - Services & Utilities: `camelCase.js` (e.g., `studentService.js`, `authService.js`).
  - App Router route directories: `lowercase-kebab-case` (e.g., `control-panel/page.jsx`, `settings/rbac/page.jsx`).
- **Variable & Function Naming:**
  - Variables & functions: `camelCase` (e.g., `studentList`, `fetchStudents`, `handleSubmit`).
  - Constants: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_PAGE_SIZE`, `API_BASE_URL`).
  - Booleans: Must prefix with `is`, `has`, `should` (e.g., `isLoading`, `isModalOpen`).
- Components must be highly reusable with zero duplicate visual or logic patterns (DRY).

## 4. Absolute Zero Bloat — No Unnecessary Lines of Code
- **DO NOT write unnecessary lines of code under any circumstance.**
- No speculative abstractions, no dead imports, no unused variables or parameters, and no unrequested features.
- Every single line of code must directly fulfill a stated, verified requirement.

## 5. No Direct Database-Level CRUD Operations
- Never perform direct or ad-hoc database mutations/hacks bypassing the application layers.
- All CRUD must strictly flow through Controller -> Service -> Repository -> JPA -> PostgreSQL.

## 6. Modular Monolith Architecture & Fixed Bounded Contexts
- **Preserve Existing Working Code:** Keep existing working APIs, controllers, and services intact without breaking current functionality.
- **Strict Bounded Context Packaging:** All new implementations must strictly reside within their respective context packages:
  - `com.student.management.platform` (Platform Super Admin, Organizations, Subscription Plans)
  - `com.student.management.iam` (Users, Memberships, Groups, Roles, Permissions, AuthN/AuthZ)
  - `com.student.management.academic` (Student & Course core domain logic)
  - `com.student.management.shared` (Shared kernel, TenantContextHolder, common exceptions/DTOs)
- **Loose Coupling & Fixed Boundaries:** ZERO cross-context SQL joins or foreign keys. Contexts must communicate exclusively via public Java Service interfaces and DTOs.

## 7. Service Layer Interface & Implementation Pattern
- Every business service must be declared as an interface in `service/` and implemented in `service/impl/`.
- Depend on interfaces, not concrete classes.

## 8. Strict DTO Encapsulation
- Controllers must NEVER return or accept `@Entity` classes directly.
- All requests use validated Request DTOs; all responses use dedicated Response DTOs.

## 9. Lombok & MapStruct Production Standards
- All entities and DTOs must use Lombok to eliminate boilerplate (`@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`).
- All object transformations must use compile-time MapStruct mappers (`@Mapper(componentModel = "spring")`).

## 10. Structured Logging & Constructor Injection
- Use `@Slf4j` for all logging. Absolute ban on `System.out.println`.
- Mandatory constructor injection on `private final` fields using `@RequiredArgsConstructor`. No field `@Autowired`.

## 11. Professional Comments & Zero Emojis Policy
- All comments and logs must be clear, professional, and concise.
- Absolute ban on emojis in source code, comments, log messages, commit messages, and documentation.

## 12. Enterprise Auditing Columns & Lifecycle Callbacks
- Every entity must include `createdAt` (`ZonedDateTime`), `updatedAt` (`ZonedDateTime`), `createdBy` (`UUID`), and `updatedBy` (`UUID`).
- **Strict Time Standard:** Always use `ZonedDateTime` across all entities, DTOs, and exception handlers. Do not use `LocalDateTime` or `LocalDate`.
- Use `@PrePersist` and `@PreUpdate` lifecycle callback annotations to automatically populate and maintain timestamps.
- Inherit from `@MappedSuperclass` `BaseEntity` under `com.student.management.shared.entity.BaseEntity`.

## 13. Frontend Persona Boundaries & Access Isolation
- **Platform Owner Boundary:** Dedicated `/platform` management space. Accessible only by Platform Super Admins to provision schools and manage subscription plans. Never exposed to school members.
- **School Member Boundary:** Dedicated `/iam` and academic workspaces. Accessible only by authenticated organization staff with valid `X-Tenant-ID`. Platform owners cannot access school-specific data without tenant context.

## 14. Frontend Service Layer & Dynamic API Routing
- All HTTP calls must reside in `src/services/` (e.g. `platformService.js`, `rbacService.js`).
- Never hardcode API hostnames or static mock data. Consume versioned paths dynamically via `/api/v1/...`.

## 15. Frontend Aesthetics & Zero Emojis Policy
- **Zero Emojis on UI:** Never render emojis in any UI element (navigation, buttons, modals, badges, empty states, or alerts).
- **Icons Only:** Use `lucide-react` vector icons exclusively.
- **Strict Curated Color Palette:** Clean White (`#FFFFFF`, `#F8FAFC`), Light Blue (`#E0F2FE`, `#0284C7`), and Light Pink (`#FCE7F3`, `#DB2777`). No rainbow gradients, dark neon themes, or visual over-coloring.

## 16. Official Platform Brand Name: "My Edu Care"
- The platform is officially titled **"My Edu Care"**.
- Always display "My Edu Care" in header titles, layouts, metadata, and branding.

## 17. UI Typography Standard — Never Use All-Caps Titles
- **Absolute Ban on Capital Letter Titles:** Never use all-caps / uppercase (`UPPERCASE`) for titles, card headers, table headers, labels, or badges on the UI.
- Always use normal, clean **Title case** or **Sentence case** (e.g., "Total Schools", "School Name", "Subscription Plan", "Contact Email").
- Do not apply `text-transform: uppercase;` to titles or headings.

## 18. Balanced Iconography — No Over-Iconification
- Avoid visual clutter from excessive decorative icons or bulky icon boxes.
- Keep typography clean, readable, normal, and non-distracting. Use icons selectively where they provide direct visual value.

## 19. Zero Database IDs in Public URLs — Mandatory Slug-Based Routing
- **Never Reveal IDs in URLs:** Public route URLs must NEVER expose raw database numeric primary keys.
- **Slug-Based Hierarchy:**
  - Platform Control Plane: `/platform` (exclusively for Platform Super Admins).
  - School Head Admin Portal: `/[slug]/admin` (School Heads type their school slug with `/admin` to access their organization console, isolated by tenant ID).
  - Staff & Student Portal: Default home `/` or `/[slug]`.

## 20. Absolute Prohibition on Half-Done Work — Complete Edge-Case Governance
- **Zero Half-Baked or Surface Implementations:** Every feature, service, security filter, and UI workflow must be implemented thoroughly end-to-end, considering all real-world edge cases (e.g. token rotation, race conditions, concurrent request de-duplication, network retries, database revocations, and error scenarios).
- **Zero Premature Claims of Completion:** Never declare a feature or phase as complete until all workflows and edge cases are genuinely coded, compiled, and tested.
- **Zero Stealth-Patching:** Never covertly modify code in the background when asked a question to pretend it was always there. Always provide 100% honesty and transparency on current code status.


