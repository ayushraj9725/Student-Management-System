package com.student.management.applications.registry;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

/**
 * Master catalog of application modules available on the My School Care platform.
 * Defines module identity, route, categories, and permission prerequisites.
 */
@Getter
@RequiredArgsConstructor
public enum ApplicationModule {

    PLATFORM_CONTROL(
            "app-platform",
            "PLATFORM_CONTROL",
            "Platform Control Panel",
            "Onboard schools, manage tenants and subscription plans.",
            "/platform",
            "Platform",
            "#2563eb",
            true,
            false,
            Collections.singleton("platform:super_admin")
    ),

    IAM_GOVERNANCE(
            "app-iam",
            "IAM_GOVERNANCE",
            "Identity & Access (IAM)",
            "Manage institutional roles, permissions, staff groups and access visibility.",
            "/{slug}/admin",
            "Governance",
            "#059669",
            true,
            false,
            new HashSet<>(Arrays.asList("rbac:manage", "role:admin"))
    ),

    STUDENT_MANAGEMENT(
            "app-students",
            "STUDENT_MANAGEMENT",
            "Staff & Student Records",
            "Enrolled student records, course directories and curriculum semester assignments.",
            "/students",
            "Academics",
            "#4f46e5",
            true,
            false,
            new HashSet<>(Arrays.asList("student:read", "student:create", "STUDENT_CRUD"))
    ),

    ATTENDANCE(
            "app-attendance",
            "ATTENDANCE",
            "Attendance Management",
            "Daily student roll call, staff biometric tracking and leave management.",
            null,
            "Operations",
            "#9333ea",
            false,
            true,
            new HashSet<>(Arrays.asList("attendance:mark", "ATTENDANCE_MODULE"))
    ),

    EXAMINATION(
            "app-examination",
            "EXAMINATION",
            "Examination & Results",
            "Exam scheduling, term grade books, marks moderation and report cards.",
            null,
            "Academics",
            "#ea580c",
            false,
            true,
            new HashSet<>(Arrays.asList("grade:enter", "exam:manage"))
    ),

    FINANCE(
            "app-finance",
            "FINANCE",
            "Fee & Finance Management",
            "Tuition invoices, fee structure collection, concessions and accounting ledgers.",
            null,
            "Finance",
            "#0d9488",
            false,
            true,
            new HashSet<>(Arrays.asList("finance:read", "finance:manage", "fee:read"))
    );

    private final String id;
    private final String code;
    private final String title;
    private final String description;
    private final String route;
    private final String category;
    private final String iconColor;
    private final boolean available;
    private final boolean comingSoon;
    private final Set<String> requiredPermissions;
}

