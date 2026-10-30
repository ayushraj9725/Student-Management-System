# Technology Stack & Environment Architecture Document

## 1. Overview
The **Student Management System** is engineered using modern, industry-standard, LTS (Long Term Support) open-source technologies organized into a clean 3-tier architecture.

---

## 2. Technology Stack Matrix

| Layer | Technology | Version | Purpose in Project |
| :--- | :--- | :--- | :--- |
| **Backend Language** | Java (JDK) | 21 LTS (Oracle / OpenJDK) | Object-oriented core backend execution |
| **Framework** | Spring Boot | 4.1.x | Auto-configuration, dependency injection, and REST runtime |
| **Web Layer** | Spring Web MVC | 7.0.x | DispatcherServlet, REST controllers, HTTP endpoints |
| **ORM / Data Access** | Hibernate / Spring Data JPA | 7.4.x / 4.x | Object-Relational Mapping and JPA Repository abstraction |
| **Validation** | Jakarta Bean Validation | 3.1.x | Annotations (`@NotBlank`, `@Min`, `@Max`, `@Email`) |
| **Database** | PostgreSQL Server | 16.x / Cloud (Neon / Supabase) | Multi-tenant persistent relational storage with RLS & JSONB |
| **Test Database** | H2 Database Engine | 2.x | Optional in-memory database for offline testing |
| **Build & Dependencies** | Apache Maven Wrapper | 3.10.x | Self-contained, portable build tool (`mvnw.cmd`) |
| **Frontend Framework** | Next.js (React 19) | 15.x / 16.x | Full-stack React framework with App Router, SSR, and API proxy |
| **Styling** | Vanilla CSS3 | Standard | Custom CSS variables and responsive design system tokens |
| **Icons** | Lucide React | 1.x | Clean vector icons for UI actions |
| **Package Management**| Node.js & npm | Node 26.x / npm 12.x | JavaScript package resolution |


---

## 3. Backend Dependency Specifications (`pom.xml`)

1. **`spring-boot-starter-webmvc`**:
   - Provides embedded Tomcat 11 web server.
   - Provides Spring MVC controllers (`@RestController`, `@RequestMapping`).
   - Jackson JSON serializer for Java object to JSON conversion.

2. **`spring-boot-starter-data-jpa`**:
   - Simplifies database interactions via repository interfaces extending `JpaRepository`.
   - Manages JDBC Connection pooling using HikariCP.
   - Leverages Hibernate for automated schema generation (`spring.jpa.hibernate.ddl-auto=update`).

3. **`postgresql` (`org.postgresql:postgresql`)**:
   - High-performance official Type 4 JDBC driver for PostgreSQL communication.
   - Fully compatible with cloud connection pools (Neon, Supabase, AWS RDS).

4. **`spring-boot-starter-validation`**:
   - Enforces field constraints on incoming JSON payloads before controller execution.

5. **`h2` (Runtime / Test)**:
   - Zero-configuration in-memory database profile (`application-h2.properties`) for instant testing.

---

## 4. Frontend Dependency Specifications (`Next.js / package.json`)

1. **`next`**:
   - Production React framework with App Router, server-side rendering, and automated code-splitting.
   - Configured with API rewrites to proxy `/api/*` requests to the Spring Boot backend (`http://localhost:8085`).

2. **`react` & `react-dom`**:
   - React 19 core library with concurrent features and server/client component boundaries (`'use client'`).

3. **`lucide-react`**:
   - Lightweight tree-shakable iconography.

---

## 5. System Requirements

### Hardware Requirements
- **RAM:** Minimum 4 GB; 8 GB recommended for concurrent IDE, MySQL, and browser execution.
- **Disk Space:** 500 MB free storage for JDK, Maven dependencies (`.m2`), and Node packages (`node_modules`).
- **Network:** Localhost loopback connection (`127.0.0.1`).

### Software Requirements
- **Operating System:** Windows 10/11, macOS, or Linux.
- **Java:** JDK 21 installed (`java -version`).
- **Node.js:** Node.js 18+ and npm (`node -v`).
- **MySQL:** MySQL Server 8.0 running as a system service.
- **Web Browser:** Google Chrome, Edge, Firefox, or Safari.
