# Student Management System — Project Documentation

Welcome to the centralized project documentation directory for the **Student Management System** (Spring Boot, React, and MySQL).

---

## 📚 Documentation Index

| File | Document Name | Description |
| :--- | :--- | :--- |
| [01_rules_and_regulations.md](./01_rules_and_regulations.md) | **Coding Rules & Regulations** | Architectural standards, clean code principles, REST API standards, Git workflow, and security guidelines. |
| [02_limitations_document.md](./02_limitations_document.md) | **System Limitations & Constraints** | Current scope boundaries, authentication limits, data scale limits, and future enhancement roadmap. |
| [03_component_requirements_discussion.md](./03_component_requirements_discussion.md) | **Component Requirements Discussion** | Detailed functional & non-functional requirements for each component (`AuthPage`, `Navbar`, `CourseCards`, `StudentList`, `StudentFormModal`, `DeleteConfirmModal`). |
| [04_component_design_document.md](./04_component_design_document.md) | **Component Design & UI/UX** | White/Black/Blue design system tokens, visual wireframes, interaction models, and modal transitions. |
| [05_technology_stack_document.md](./05_technology_stack_document.md) | **Technology Stack Document** | Complete matrix of Java 21, Spring Boot 4, Hibernate, MySQL, React 19, Vite, and hardware/software prerequisites. |
| [06_implementation_modules_document.md](./06_implementation_modules_document.md) | **Implementation Modules Document** | Deep-dive into Auth, Student CRUD, Course Metrics modules, MySQL schema DDL, and end-to-end request lifecycles. |
| [07_real_life_staff_workflow_and_rbac_guide.md](./07_real_life_staff_workflow_and_rbac_guide.md) | **Real-Life Staff Workflow & RBAC Guide** | Real-world school entity mapping, step-by-step operational flows, system-defined permissions vs custom roles, and client autonomy. |
| [08_cloud_and_private_cloud_migration_guide.md](./08_cloud_and_private_cloud_migration_guide.md) | **Cloud & Private Cloud Migration Guide** | Zero-code-change migration from Neon serverless to AWS/Private Cloud, pg_dump/pg_restore, S3 rclone sync, and Docker Compose. |
| [09_engineering_learnings_and_decoupling_guide.md](./09_engineering_learnings_and_decoupling_guide.md) | **Engineering Learnings & Decoupling Guide** | Modular Monolith loose coupling rules, Spring AbstractRoutingDataSource for future DB separation, and living technical learnings log. |
| [10_environment_and_production_configuration_guide.md](./10_environment_and_production_configuration_guide.md) | **Environment & Production Routing Guide** | Dynamic profile-driven routing: Localhost (dev) vs Deployed (prod), dynamic CORS, and Next.js proxy rewrites. |
| [11_tenant_onboarding_and_activation_workflow_specification.md](./11_tenant_onboarding_and_activation_workflow_specification.md) | **Tenant Onboarding & Activation Workflow** | Separation of Platform Admin from School Head, zero-prefill OTP security, expired OTP modal, and enterprise email dispatch. |
| [12_email_service_and_production_environment_variables_specification.md](./12_email_service_and_production_environment_variables_specification.md) | **Email Service & Secrets Management** | Live SMTP Google relay setup, brand header spoofing/reply-to routing, and CI/CD production environment variable matrix. |
| [13_iam_module_architecture_and_multi_tenant_data_isolation.md](./13_iam_module_architecture_and_multi_tenant_data_isolation.md) | **IAM Module Architecture & 5-Layer Multi-Tenant Isolation** | Keycloak-style org-level data isolation, 5-layer isolation gates, staff provisioning (Instant vs Email Invite), departments/groups, custom roles, and API contracts. |

---

## 🚀 Quick Links
- **Application Setup & Run Commands:** [Root Project README](../README.md)
- **Database Configuration:** [application.properties](../backend/src/main/resources/application.properties)
- **Database Schema Script:** [schema.sql](../backend/src/main/resources/schema.sql)
