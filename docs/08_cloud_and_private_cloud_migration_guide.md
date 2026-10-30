# Cloud & Private Cloud Migration Guide

## 1. Executive Overview

This document provides step-by-step instructions for shifting the **Student Management System** from public serverless cloud providers (**Neon PostgreSQL + Neon S3 Object Storage**) to a **Private Cloud** (e.g., dedicated AWS VPC, GCP, Azure, DigitalOcean, or an On-Premises Bare-Metal Server).

---

## 2. Decoupled Architecture: Zero-Code-Change Guarantee

Because all database and storage connection parameters are externalized through Spring Boot environment variables, **you will never need to rewrite or recompile Java code** to move between cloud providers.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        ENVIRONMENT-DRIVEN PERSISTENCE CONFIGURATION                    │
├──────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│ Property Name            │ Neon Cloud (Current)        │ Private Cloud (Example: AWS)  │
├──────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ `SPRING_DATASOURCE_URL`  │ Neon pooler URL (SSL mode)  │ `jdbc:postgresql://db.internal:5432/school_db` │
│ `SPRING_DATASOURCE_USERNAME` | `school-management-db_owner` | `app_user`                   │
│ `SPRING_DATASOURCE_PASSWORD` | `npg_YUf6AunR...`           │ `SecretMasterPassword123`     │
│ `AWS_ENDPOINT_URL_S3`    │ Neon Storage URL            │ `https://s3.ap-south-1.amazonaws.com` (or MinIO) │
│ `AWS_ACCESS_KEY_ID`      │ Neon S3 Key                 │ AWS IAM Access Key            │
│ `AWS_SECRET_ACCESS_KEY`  │ Neon S3 Secret              │ AWS IAM Secret Key            │
│ `AWS_S3_BUCKET`          │ `school-management-storage` │ `company-private-school-bucket`│
└──────────────────────────┴─────────────────────────────┴───────────────────────────────┘
```

---

## 3. Database Migration: Shifting PostgreSQL Data

### Step 3.1: Export Backup from Neon
Run `pg_dump` from your terminal to generate a complete binary backup containing schema, tables, and records:

```bash
pg_dump \
  -h ep-winter-rice-aorpr84f-pooler.c-2.ap-southeast-1.aws.neon.tech \
  -U school-management-db_owner \
  -d school-management-db \
  -F c \
  -b \
  -v \
  -f school_db_backup.dump
```
*(Enter password when prompted: `npg_YUf6AunR3JrL`)*

---

### Step 3.2: Restore Backup into Private Cloud PostgreSQL
Connect to your private cloud database (e.g., AWS RDS PostgreSQL, self-hosted Docker PostgreSQL) and restore:

```bash
pg_restore \
  -h <your-private-cloud-db-host> \
  -p 5432 \
  -U <private_db_user> \
  -d <private_database_name> \
  -v \
  school_db_backup.dump
```

* **Outcome:** All organizations, users, roles, permissions, students, and courses are instantly transferred with zero data loss and identical relational constraints.

---

## 4. Object Storage Migration: Shifting S3 Files & Buckets

For transferring files (student photos, ID proofs, syllabus PDFs) from Neon S3 to a private cloud storage solution (AWS S3, MinIO, or Cloudflare R2):

### Step 4.1: Install `rclone` (Industry Standard Object Sync Tool)
```bash
# On Linux / macOS / Windows
rclone config
```

### Step 4.2: Define Remotes in `rclone.conf`:
```ini
[neon_source]
type = s3
provider = Other
endpoint = https://br-holy-band-ao78ni4l.storage.c-2.ap-southeast-1.aws.neon.tech
access_key_id = nak_live_0aa7f0e5fc424a45b1794acdecb68e01
secret_access_key = nsk_live_183dd4e9ce92378c24e4c3d55816be20ff3eccf99ec3c926ce791a0e47be469a
region = ap-southeast-1

[private_dest]
type = s3
provider = AWS
endpoint = https://s3.ap-south-1.amazonaws.com
access_key_id = <YOUR_PRIVATE_AWS_KEY>
secret_access_key = <YOUR_PRIVATE_AWS_SECRET>
region = ap-south-1
```

### Step 4.3: Synchronize All Buckets in One Command
```bash
rclone sync neon_source:school-management-storage private_dest:company-private-school-bucket --progress
```

---

## 5. Private Cloud Self-Hosted Deployment (Docker Compose)

If deploying to a completely private, air-gapped corporate server (e.g., inside an on-premises school datacenter or private VPC), you can run the entire ecosystem using Docker Compose:

```yaml
version: '3.8'

services:
  # 1. Private PostgreSQL Database
  postgres-db:
    image: postgres:16-alpine
    container_name: private_school_db
    restart: always
    environment:
      POSTGRES_DB: school-management-db
      POSTGRES_USER: school_admin
      POSTGRES_PASSWORD: SecretPrivatePassword123
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  # 2. Private MinIO Object Storage (Self-Hosted S3)
  minio-storage:
    image: minio/minio:latest
    container_name: private_school_storage
    restart: always
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minio_admin
      MINIO_ROOT_PASSWORD: MinioPrivateSecretKey123
    volumes:
      - miniodata:/data
    ports:
      - "9000:9000"
      - "9001:9001"

  # 3. Spring Boot Backend
  backend-api:
    build: ./backend
    container_name: private_school_backend
    restart: always
    depends_on:
      - postgres-db
      - minio-storage
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres-db:5432/school-management-db
      SPRING_DATASOURCE_USERNAME: school_admin
      SPRING_DATASOURCE_PASSWORD: SecretPrivatePassword123
      AWS_ENDPOINT_URL_S3: http://minio-storage:9000
      AWS_ACCESS_KEY_ID: minio_admin
      AWS_SECRET_ACCESS_KEY: MinioPrivateSecretKey123
      AWS_S3_BUCKET: school-management-storage
    ports:
      - "8085:8085"

  # 4. Next.js Frontend
  frontend-web:
    build: ./frontend
    container_name: private_school_frontend
    restart: always
    depends_on:
      - backend-api
    ports:
      - "4000:4000"

volumes:
  pgdata:
  miniodata:
```

---

## 6. Migration Checklist & Safety Rules

1. **Perform Backup Verification:** Always verify that `school_db_backup.dump` is non-empty before initiating cutover.
2. **TTL Reduction:** Lower DNS TTL to 60 seconds 24 hours prior to domain migration so client browsers switch instantly.
3. **Read-Only Maintenance Window:** Set tenant status to `MAINTENANCE` during migration so no new records are inserted while `pg_dump` runs.
4. **Environment Secrets:** Store production passwords in AWS Secrets Manager, HashiCorp Vault, or encrypted `.env` files — never commit production secrets into public GitHub repositories.
