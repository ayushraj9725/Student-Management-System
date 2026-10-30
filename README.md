# Student Management System

A full-stack web application designed for academic student records management built using **Java Spring Boot**, **React.js**, and **MySQL**.

---

## 📖 Project Documentation Directory
Complete project specifications and architectural guides are available in the **[`docs/`](./docs/README.md)** directory:
- 📜 [01. Rules & Regulations Document](./docs/01_rules_and_regulations.md) — Coding conventions, architecture, and security rules.
- ⚠️ [02. System Limitations Document](./docs/02_limitations_document.md) — Scope boundaries, constraints, and future scope.
- 📋 [03. Component Requirements Discussion](./docs/03_component_requirements_discussion.md) — Detailed functional requirements per component.
- 🎨 [04. Component Design Document](./docs/04_component_design_document.md) — UI/UX wireframes and White/Black/Blue design tokens.
- 🛠️ [05. Technology Stack Document](./docs/05_technology_stack_document.md) — Framework versions, dependency details, and environment setup.
- 📦 [06. Implementation Modules Document](./docs/06_implementation_modules_document.md) — Module architecture, MySQL schema, and execution lifecycles.

---

## 🛠️ Technology Stack

- **Backend:** Java 21, Spring Boot 4, Spring Web, Spring Data JPA, Hibernate
- **Database:** MySQL Server 8.0+ (`student_db`)
- **Frontend:** React 19, Vite, Vanilla CSS (White, Black & Blue theme)
- **API Communication:** RESTful JSON endpoints (`http://localhost:8085/api/v1`)

---

## 🗄️ Database Setup (Neon PostgreSQL)

### Step 1: Ensure Neon Database Connection
The application connects to the cloud Neon PostgreSQL database configured in `application.properties`.

### Step 2: Verify Configuration
Check `backend/src/main/resources/application.properties`:
```properties
server.port=8085
spring.profiles.active=dev
```

---

## 🚀 How to Run the Project

You need two terminal windows: one for the **Backend** and one for the **Frontend**.

### 1️⃣ Run Backend (Spring Boot)

Open a terminal in the project directory:
```powershell
cd backend
.\mvnw.cmd spring-boot:run
```
- **Backend Port:** `http://localhost:8085`
- **Health Check:** Open `http://localhost:8085/api/v1/auth/login` or test endpoints.
*(Or double-click `start_backend.bat`)*

---

### 2️⃣ Run Frontend (React)

Open a **new separate terminal** in the project directory:
```powershell
cd frontend
npm run dev
```
- **Frontend URL:** Open `http://localhost:5173` in your browser.
*(Or double-click `start_frontend.bat`)*

---

## 🔐 How to Use the Application

1. **Authentication First:**
   - When you open `http://localhost:5173`, the clean **Login / Register** page is displayed.
   - Any management member can click the **Register** tab to create their account (`Full Name`, `Username`, `Password`).
   - Or click **Login** and sign in with default credentials:
     - **Username:** `admin`
     - **Password:** `admin123`
2. **Student Management Dashboard:**
   - Once logged in, the student table appears with all registered students.
   - Click **`+ Add Student`** to enter a new student (`Student ID`, `Full Name`, `Email`, `Course`, `Semester`).
   - Use the **Search bar** to search students by ID, Name, or Course in real time.
   - Click **`Edit`** on any row to modify details.
   - Click **`Delete`** to remove a record after confirmation.
   - Click **`Logout`** in the top navigation bar to exit.

---

## 📡 REST API Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **POST** | `/api/auth/register` | Register new management user |
| **POST** | `/api/auth/login` | Login and receive authentication token |
| **GET** | `/api/students` | Get all students (supports `?search=query`) |
| **GET** | `/api/students/{id}` | Get student by ID |
| **POST** | `/api/students` | Add new student (prevents duplicate IDs) |
| **PUT** | `/api/students/{id}` | Update existing student |
| **DELETE** | `/api/students/{id}` | Delete student record |

---

## 🧪 Automated Tests

To run the backend test suite:
```powershell
cd backend
.\mvnw.cmd test
```
Verifies student creation, duplicate ID rejection, search, fetch by ID, update, and deletion.
