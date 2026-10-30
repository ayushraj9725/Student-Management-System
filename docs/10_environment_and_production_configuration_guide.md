# Environment Separation & Production Routing Guide

## 1. Executive Summary

This guide explains how the **Student Management System** dynamically and cleanly separates **Localhost Development** from **Cloud / Deployed Production**.

Zero hardcoded URLs exist in the codebase. The system uses **Spring Boot Profiles** and **Next.js Environment Rewrites** to route traffic automatically based on where it is executing.

---

## 2. Environment Matrix: Localhost vs. Deployed

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        ENVIRONMENT SEPARATION ARCHITECTURE                            │
├──────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│ Property / Behavior      │ LOCALHOST (Development)     │ DEPLOYED (Production)         │
├──────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ Active Spring Profile    │ `dev` (Default)             │ `prod`                        │
│ Activation Trigger       │ Automatic when run locally  │ Set `SPRING_PROFILES_ACTIVE=prod` │
├──────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ Backend Server Port      │ Fixed: `8085`               │ Dynamic: `${PORT:8085}`       │
│                          │                             │ (Auto-injected by Render/AWS) │
├──────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ Frontend Server Port     │ Fixed: `4000`               │ Edge CDN / Port 3000 / Vercel │
├──────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ Frontend API Routing     │ Next.js rewrites to:        │ Next.js rewrites to:          │
│                          │ `http://localhost:8085/api` │ `${BACKEND_URL}/api`          │
├──────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ CORS Allowed Origins     │ `http://localhost:4000`     │ `${ALLOWED_ORIGINS}`          │
│                          │ `http://127.0.0.1:4000`     │ (e.g. `https://school.edu`)   │
├──────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ Database DDL Strategy    │ `ddl-auto=update`           │ `ddl-auto=validate`           │
│                          │ (Creates missing columns)   │ (Strict protection against    │
│                          │                             │ accidental schema mutations)  │
├──────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ Hibernate SQL Logging    │ `show-sql=true` (Verbose)   │ `show-sql=false` (Secure)     │
├──────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ HikariCP Connection Pool │ Default pool                │ Optimized: 5 min idle, 20 max │
└──────────────────────────┴─────────────────────────────┴───────────────────────────────┘
```

---

## 3. How the Backend Separates Environments

In `backend/src/main/resources/`:

### 1. `application.properties` (Base Configuration)
Contains database credentials and activates the profile:
```properties
spring.application.name=student-management
spring.profiles.active=${SPRING_PROFILES_ACTIVE:dev}
```

### 2. `application-dev.properties` (Activated on Localhost)
```properties
server.port=8085
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
cors.allowed-origins=http://localhost:4000,http://127.0.0.1:4000
```

### 3. `application-prod.properties` (Activated in Cloud)
```properties
# Reads dynamic port from cloud environment (Render, Railway, AWS ECS)
server.port=${PORT:8085}

# Production safety: Validate schema only, never auto-alter live database
spring.jpa.hibernate.ddl-auto=validate
spring.jpa.show-sql=false

# High-concurrency connection pool
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.maximum-pool-size=20

# Dynamic production CORS
cors.allowed-origins=${ALLOWED_ORIGINS:https://your-production-domain.com}
```

---

## 4. How the Frontend (Next.js) Separates Environments

In `frontend/next.config.mjs`:

```javascript
// Automatically routes API calls:
// - On Localhost: defaults to 'http://localhost:8085'
// - In Production: set environment variable BACKEND_URL=https://api.yourdomain.com
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8085';

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
```

* **On Localhost:** When you open `http://localhost:4000`, any API request to `/api/students` is forwarded to `http://localhost:8085/api/students`.
* **When Deployed:** You set `BACKEND_URL=https://api.schoolapp.com` in your Vercel or cloud dashboard. Next.js automatically rewrites `/api/students` to your live production API over HTTPS.

---

## 5. Deployment Commands Quick Reference

### Running in Localhost Mode:
```bash
# 1. Backend (runs 'dev' profile on port 8085)
./mvnw.cmd spring-boot:run

# 2. Frontend (runs on port 4000)
npm run dev
```

### Running in Production Mode (Docker / Cloud):
```bash
# 1. Backend (injects 'prod' profile via environment variable)
java -Dspring.profiles.active=prod -jar target/student-management-0.0.1-SNAPSHOT.jar

# 2. Frontend (builds and runs Next.js production server)
npm run build
npm run start
```
