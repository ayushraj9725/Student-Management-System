-- ==========================================================
-- Student Management System MySQL Schema
-- Database Name: student_db
-- ==========================================================

CREATE DATABASE IF NOT EXISTS student_db;
USE student_db;

-- 1. Students Table (from Project Proposal Page 5)
CREATE TABLE IF NOT EXISTS students (
    id BIGINT NOT NULL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NULL,
    course VARCHAR(100) NOT NULL,
    semester INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Users Table for Authentication & Registration
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NULL,
    role VARCHAR(50) DEFAULT 'ADMIN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sample Seed Data
INSERT IGNORE INTO students (id, full_name, email, course, semester) VALUES
(101, 'Aarav Sharma', 'aarav.sharma@example.edu', 'Computer Science', 3),
(102, 'Priya Patel', 'priya.patel@example.edu', 'Information Technology', 4),
(103, 'Rohan Verma', 'rohan.verma@example.edu', 'Computer Science', 3),
(104, 'Ananya Gupta', 'ananya.gupta@example.edu', 'Electronics & Comm.', 2),
(105, 'Vikram Malhotra', 'vikram.m@example.edu', 'Data Science', 5);
