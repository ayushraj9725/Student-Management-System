-- ==========================================================
-- Student Management System - PostgreSQL Schema
-- Database Name: school-management-db (Neon Cloud / PostgreSQL)
-- ==========================================================

-- ----------------------------------------------------------
-- 1. Platform & Tenant Management Context (module.platform)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscription_plans (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,          -- 'FREE', 'STANDARD', 'ENTERPRISE'
    max_students INT NOT NULL DEFAULT 100,
    max_staff INT NOT NULL DEFAULT 10,
    price_cents INT NOT NULL DEFAULT 0,
    features_json TEXT,                         -- JSON array of enabled feature keys
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NULL,
    updated_by UUID NULL
);

CREATE TABLE IF NOT EXISTS organizations (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,          -- School identifier (e.g. 'delhi-public-school')
    plan_id BIGINT NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'SUSPENDED', 'INACTIVE'
    contact_email VARCHAR(150) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NULL,
    updated_by UUID NULL
);

-- ----------------------------------------------------------
-- 2. Identity & Access Management Context (module.iam)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    is_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- Strict 24-hour (1-day) expiry
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS otp_verifications (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(150) NOT NULL,
    otp_code VARCHAR(10) NOT NULL,
    purpose VARCHAR(50) NOT NULL,                -- 'SUPER_ADMIN_LOGIN', 'CLIENT_ONBOARDING'
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- 5-minute validity
    attempt_count INT DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS memberships (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_APPROVAL', -- 'PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED'
    approved_by BIGINT NULL,
    approved_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_user_org UNIQUE (user_id, organization_id)
);

CREATE TABLE IF NOT EXISTS school_groups (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,                  -- 'Science Department', 'Admin Staff'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_org_group_name UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS membership_group_mapping (
    membership_id BIGINT NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
    group_id BIGINT NOT NULL REFERENCES school_groups(id) ON DELETE CASCADE,
    PRIMARY KEY (membership_id, group_id)
);

CREATE TABLE IF NOT EXISTS roles (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NULL REFERENCES organizations(id) ON DELETE CASCADE, -- NULL for system templates
    name VARCHAR(100) NOT NULL,                  -- 'SCHOOL_ADMIN', 'TEACHER', 'REGISTRAR'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,           -- 'student:create', 'student:read', 'rbac:manage'
    description VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS group_role_mapping (
    group_id BIGINT NOT NULL REFERENCES school_groups(id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (group_id, role_id)
);

CREATE TABLE IF NOT EXISTS member_role_mapping (
    membership_id BIGINT NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (membership_id, role_id)
);

-- ----------------------------------------------------------
-- 3. Academic Core Context (module.academic) - Loosely Coupled
-- ----------------------------------------------------------
-- Stored with scalar organization_id to allow clean physical DB separation in future
CREATE TABLE IF NOT EXISTS students (
    id BIGINT NOT NULL PRIMARY KEY,
    organization_id BIGINT NOT NULL DEFAULT 1,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NULL,
    course VARCHAR(100) NOT NULL,
    semester INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_student_org ON students(organization_id);

CREATE TABLE IF NOT EXISTS courses (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL DEFAULT 1,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(30) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_course_org ON courses(organization_id);

-- ----------------------------------------------------------
-- 4. Enterprise Audit Column Idempotent Migration
-- ----------------------------------------------------------
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS created_by UUID NULL;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS updated_by UUID NULL;

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS created_by UUID NULL;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS updated_by UUID NULL;

ALTER TABLE memberships ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS created_by UUID NULL;
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS updated_by UUID NULL;

ALTER TABLE school_groups ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE school_groups ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE school_groups ADD COLUMN IF NOT EXISTS created_by UUID NULL;
ALTER TABLE school_groups ADD COLUMN IF NOT EXISTS updated_by UUID NULL;

ALTER TABLE roles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS created_by UUID NULL;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS updated_by UUID NULL;

ALTER TABLE permissions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS created_by UUID NULL;
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS updated_by UUID NULL;

ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS created_by UUID NULL;
ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS updated_by UUID NULL;

ALTER TABLE group_role_mapping ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE group_role_mapping ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE group_role_mapping ADD COLUMN IF NOT EXISTS created_by UUID NULL;
ALTER TABLE group_role_mapping ADD COLUMN IF NOT EXISTS updated_by UUID NULL;

ALTER TABLE member_role_mapping ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE member_role_mapping ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE member_role_mapping ADD COLUMN IF NOT EXISTS created_by UUID NULL;
ALTER TABLE member_role_mapping ADD COLUMN IF NOT EXISTS updated_by UUID NULL;

ALTER TABLE membership_group_mapping ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE membership_group_mapping ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE membership_group_mapping ADD COLUMN IF NOT EXISTS created_by UUID NULL;
ALTER TABLE membership_group_mapping ADD COLUMN IF NOT EXISTS updated_by UUID NULL;

ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(150);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'ADMIN';
ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by UUID NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_by UUID NULL;

