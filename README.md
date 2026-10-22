# Student Management System

A full-stack web application designed for academic student records management built using **Java Spring Boot**, **React.js**, and **MySQL**.

---

## 🛠️ Technology Stack

- **Backend:** Java 21, Spring Boot 4, Spring Web, Spring Data JPA, Hibernate
- **Database:** MySQL Server 8.0+ (`student_db`)
- **Frontend:** React 19, Vite, Vanilla CSS (White, Black & Blue theme)
- **API Communication:** RESTful JSON endpoints (`http://localhost:8081/api`)

---

## 🗄️ Database Setup (MySQL)

### Step 1: Ensure MySQL Server is Running
Make sure your MySQL service is running on default port `3306`.

### Step 2: Create the Database
Open MySQL Workbench, phpMyAdmin, or your terminal:
```sql
CREATE DATABASE IF NOT EXISTS student_db;
USE student_db;
```

### Step 3: Table Schema
Spring Boot (`spring.jpa.hibernate.ddl-auto=update`) automatically creates the tables on startup. If you wish to create them manually:

```sql
-- Students Table
CREATE TABLE IF NOT EXISTS students (
    id BIGINT NOT NULL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    course VARCHAR(100) NOT NULL,
    semester INT NOT NULL
);

-- Users Table (Management Authentication)
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'ADMIN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Step 4: Verify Database Credentials
Check `backend/src/main/resources/application.properties`:
```properties
spring.datasource.url=jdbc:mysql://localhost:3306/student_db?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true&createDatabaseIfNotExist=true
spring.datasource.username=root
spring.datasource.password=@Ascent1225
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

server.port=8081
spring.jpa.hibernate.ddl-auto=update
```
*(If your MySQL root password differs, simply update `spring.datasource.password`)*.

---

## 🚀 How to Run the Project

You need two terminal windows: one for the **Backend** and one for the **Frontend**.

### 1️⃣ Run Backend (Spring Boot)

Open a terminal in the project directory:
```powershell
cd backend
.\mvnw.cmd spring-boot:run
```
- **Backend Port:** `http://localhost:8081`
- **Health Check:** Open `http://localhost:8081/api/students` in your browser.
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
