# Implementation Modules & Architecture Execution Document

## 1. Overview
This document details the functional implementation modules of the **Student Management System**, mapping each module across the database schema, Spring Boot backend, and React frontend.

---

## 2. Module Breakdown

```
┌────────────────────────────────────────────────────────────────────────┐
│                      STUDENT MANAGEMENT SYSTEM                         │
├─────────────────────┬────────────────────┬─────────────────────────────┤
│ 1. Auth Module      │ 2. Student CRUD    │ 3. Metrics & Analytics      │
│ - User Registration │ - Add Student      │ - Course-wise Breakdown     │
│ - Member Login      │ - Search Students  │ - Real-Time Count Cards     │
│ - Password Hashing  │ - Update Details   │ - Interactive Dept Filter   │
│ - Session Guard     │ - Delete Record    │                             │
├─────────────────────┴────────────────────┴─────────────────────────────┤
│ 4. Cross-Cutting Infrastructure                                        │
│ - CORS WebMvcConfigurer, GlobalExceptionHandler, DataInitializer      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Module Details

### 3.1 Module 1: Management Authentication Module

#### Responsibilities
1. Secure account registration for administrative staff and management personnel.
2. Credential verification against the database using salted SHA-256 hash digests.
3. Client-side session management to gate access to student records.

#### Key Source Files
- **Backend Entity:** `com.student.management.entity.User.java`
- **Backend Repository:** `com.student.management.repository.UserRepository.java`
- **Backend Service:** `com.student.management.service.AuthService.java`
- **Backend Controller:** `com.student.management.controller.AuthController.java`
- **Security Utility:** `com.student.management.config.PasswordUtil.java`
- **Frontend Component:** `frontend/src/components/AuthPage.jsx`

#### Endpoints
- `POST /api/auth/register` — Accepts `{ username, password, fullName }` → Returns `AuthResponse` (`201 Created`).
- `POST /api/auth/login` — Accepts `{ username, password }` → Returns `AuthResponse` (`200 OK`).

---

### 3.2 Module 2: Student Record CRUD Module

#### Responsibilities
1. Adding new students with custom Student ID and duplicate-check protection.
2. Retrieving all student records or searching across multiple attributes.
3. Updating existing student details while safeguarding the primary key ID.
4. Safe deletion of records with explicit client-side confirmation.

#### Key Source Files
- **Backend Entity:** `com.student.management.entity.Student.java`
- **Backend Repository:** `com.student.management.repository.StudentRepository.java`
- **Backend Service:** `com.student.management.service.StudentService.java`
- **Backend Controller:** `com.student.management.controller.StudentController.java`
- **Frontend Components:**
  - `frontend/src/components/StudentList.jsx`
  - `frontend/src/components/StudentFormModal.jsx`
  - `frontend/src/components/DeleteConfirmModal.jsx`

#### Endpoints
| HTTP Method | Route | Description |
| :--- | :--- | :--- |
| `POST` | `/api/students` | Inserts new student; rejects duplicate IDs with `409 Conflict`. |
| `GET` | `/api/students` | Returns list of all students; supports `?search=keyword`. |
| `GET` | `/api/students/{id}` | Returns single student record; `404 Not Found` if absent. |
| `PUT` | `/api/students/{id}` | Updates name, email, course, and semester. |
| `DELETE` | `/api/students/{id}` | Deletes record from MySQL. |

---

### 3.3 Module 3: Course Metrics & Dynamic Analytics Module

#### Responsibilities
1. Computes live enrollment counts across each academic department.
2. Renders interactive summary cards in the dashboard header.
3. Provides one-click course filtering on the main student records table.

#### Key Source Files
- **Frontend Component:** `frontend/src/components/CourseCards.jsx`
- **Integration Point:** `frontend/src/App.jsx` (`selectedCourse` state hook).

---

### 3.4 Module 4: Infrastructure & Data Initialization Module

#### Responsibilities
1. **CORS Configuration:** `CorsConfig.java` enables secure cross-origin communication from `http://localhost:5173`.
2. **Seed Data:** `DataInitializer.java` populates initial sample records and the default admin user upon first startup if tables are empty.
3. **Centralized Error Handling:** `GlobalExceptionHandler.java` converts Java exceptions into standardized HTTP JSON status codes.

---

## 4. Database Relational Design (MySQL)

### Database: `student_db`

#### Table: `students`
```sql
CREATE TABLE IF NOT EXISTS students (
    id BIGINT NOT NULL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NULL,
    course VARCHAR(100) NOT NULL,
    semester INT NOT NULL
);
```

#### Table: `users`
```sql
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NULL,
    role VARCHAR(50) DEFAULT 'ADMIN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 5. End-to-End Request Lifecycle Example

### Example: Adding a New Student
1. **User Action:** Management user fills the *"Add New Student"* modal in React and clicks *"Save Student"*.
2. **Client Validation:** React validates that ID > 0, Name is non-empty, and semester is between 1 and 8.
3. **HTTP Dispatch:** `studentService.createStudent()` sends `POST http://localhost:8085/api/students` with JSON payload.
4. **Controller Interception:** `StudentController.createStudent()` validates Jakarta constraints (`@Valid`).
5. **Business Logic:** `StudentService.createStudent()` invokes `studentRepository.existsById(student.getId())`.
   - *If ID exists:* Throws `DuplicateResourceException` → Handled by `GlobalExceptionHandler` returning `409 Conflict`.
   - *If ID is unique:* Invokes `studentRepository.save(student)`.
6. **Database Persistence:** Hibernate generates and executes `INSERT INTO students (...) VALUES (...)` in MySQL.
7. **Response & UI Refresh:** Backend returns `201 Created` with the saved entity JSON. React closes the modal, triggers a success alert, and refreshes the student directory and course metric cards.
