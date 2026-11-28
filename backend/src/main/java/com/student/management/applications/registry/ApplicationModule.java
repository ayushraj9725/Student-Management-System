package com.student.management.applications.registry;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

/**
 * Master catalog of application modules available on the My School Care platform.
 * Represents modular business capabilities that can be entitled to schools via feature flags.
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

    STUDENT_MANAGEMENT(
            "app-students",
            "STUDENT_MANAGEMENT",
            "Student Management (SIS)",
            "Central student profile, enrollment history, family/guardians, documents, and lifecycle status.",
            "/{slug}/students",
            "Academics",
            "#4f46e5",
            true,
            false,
            new HashSet<>(Arrays.asList("student:read", "student:create", "STUDENT_CRUD"))
    ),

    ADMISSIONS(
            "app-admissions",
            "ADMISSIONS",
            "Admissions & Registration",
            "Enquiry desk, application forms, document verification, and admission approval workflow.",
            "/{slug}/admissions",
            "Operations",
            "#0284c7",
            true,
            false,
            new HashSet<>(Arrays.asList("admission:manage", "admission:read"))
    ),

    STAFF_MANAGEMENT(
            "app-staff",
            "STAFF_MANAGEMENT",
            "Staff Management",
            "Employee records, designations, departments, staff documents, and institutional credentials.",
            "/{slug}/staff",
            "Operations",
            "#059669",
            true,
            false,
            new HashSet<>(Arrays.asList("staff:read", "staff:manage"))
    ),

    ACADEMIC_MANAGEMENT(
            "app-academics",
            "ACADEMIC_MANAGEMENT",
            "Academic Management",
            "Academic years, classes, sections, subjects, timetable schedules, and teacher assignments.",
            "/{slug}/academics",
            "Academics",
            "#2563eb",
            true,
            false,
            new HashSet<>(Arrays.asList("academic:manage", "academic:read"))
    ),

    ATTENDANCE(
            "app-attendance",
            "ATTENDANCE",
            "Attendance Management",
            "Daily student roll-call register, staff biometric logs, and monthly attendance reports.",
            "/{slug}/attendance",
            "Operations",
            "#9333ea",
            true,
            false,
            new HashSet<>(Arrays.asList("attendance:mark", "ATTENDANCE_MODULE"))
    ),

    FEES_FINANCE(
            "app-finance",
            "FEES_FINANCE",
            "Fees & Finance",
            "Fee structures, tuition invoices, collection receipts, concessions, and dues ledgers.",
            "/{slug}/fees",
            "Finance",
            "#0d9488",
            true,
            false,
            new HashSet<>(Arrays.asList("finance:read", "finance:manage", "fee:read"))
    ),

    EXAMINATIONS(
            "app-examination",
            "EXAMINATIONS",
            "Examinations & Results",
            "Exam scheduling, assessment grading rules, marks entry, and term report card generation.",
            "/{slug}/examinations",
            "Academics",
            "#ea580c",
            true,
            false,
            new HashSet<>(Arrays.asList("grade:enter", "exam:manage"))
    ),

    LIBRARY(
            "app-library",
            "LIBRARY",
            "Library Management",
            "Book inventory catalog, ISBN indexing, issue/return circulation, and overdue fine records.",
            "/{slug}/library",
            "Operations",
            "#d97706",
            true,
            false,
            new HashSet<>(Arrays.asList("library:read", "library:manage"))
    ),

    COMMUNICATION(
            "app-communication",
            "COMMUNICATION",
            "Communication & Notices",
            "School circulars, emergency announcements, and parent-staff broadcast communication.",
            "/{slug}/communication",
            "Governance",
            "#7c3aed",
            true,
            false,
            new HashSet<>(Arrays.asList("communication:broadcast", "notice:create"))
    ),

    REPORTS_ANALYTICS(
            "app-reports",
            "REPORTS_ANALYTICS",
            "Reports & Analytics",
            "Cross-modular institutional reporting across enrollment, attendance, dues, and academics.",
            "/{slug}/reports",
            "Executive",
            "#db2777",
            true,
            false,
            new HashSet<>(Arrays.asList("report:read", "analytics:view"))
    ),

    IAM_GOVERNANCE(
            "app-iam",
            "IAM_GOVERNANCE",
            "Identity & Access (IAM)",
            "Manage institutional roles, permissions, staff groups, and access security.",
            "/{slug}/admin",
            "Governance",
            "#059669",
            true,
            false,
            new HashSet<>(Arrays.asList("rbac:manage", "role:admin"))
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
