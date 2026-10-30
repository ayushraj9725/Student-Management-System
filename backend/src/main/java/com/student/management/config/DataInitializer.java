package com.student.management.config;

import com.student.management.entity.Student;
import com.student.management.iam.user.entity.User;
import com.student.management.iam.user.repository.UserRepository;
import com.student.management.iam.entity.Membership;
import com.student.management.iam.entity.Permission;
import com.student.management.iam.entity.Role;
import com.student.management.iam.entity.RolePermission;
import com.student.management.iam.enums.MembershipStatus;
import com.student.management.iam.repository.MembershipRepository;
import com.student.management.iam.repository.PermissionRepository;
import com.student.management.iam.repository.RolePermissionRepository;
import com.student.management.iam.repository.RoleRepository;
import com.student.management.platform.entity.Organization;
import com.student.management.platform.entity.SubscriptionPlan;
import com.student.management.platform.enums.OrganizationStatus;
import com.student.management.platform.repository.OrganizationRepository;
import com.student.management.platform.repository.SubscriptionPlanRepository;
import com.student.management.repository.StudentRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.*;

/**
 * Data initializer bootstrapping seed data for plans, permissions, template roles, and default tenant.
 */
@Slf4j
@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner initDatabase(
            UserRepository userRepository,
            StudentRepository studentRepository,
            SubscriptionPlanRepository subscriptionPlanRepository,
            OrganizationRepository organizationRepository,
            PermissionRepository permissionRepository,
            RoleRepository roleRepository,
            RolePermissionRepository rolePermissionRepository,
            MembershipRepository membershipRepository,
            PasswordEncoder passwordEncoder
    ) {
        return args -> {
            // 1. Seed Subscription Plans (FREE, STANDARD, ENTERPRISE)
            SubscriptionPlan standardPlan = null;
            if (subscriptionPlanRepository.count() == 0) {
                subscriptionPlanRepository.save(new SubscriptionPlan(
                        "FREE", 100, 10, 0,
                        "[\"STUDENT_CRUD\", \"COURSE_VIEW\"]"
                ));
                standardPlan = subscriptionPlanRepository.save(new SubscriptionPlan(
                        "STANDARD", 1000, 50, 4900,
                        "[\"STUDENT_CRUD\", \"COURSE_VIEW\", \"ATTENDANCE_MODULE\", \"EXPORT_REPORTS\"]"
                ));
                subscriptionPlanRepository.save(new SubscriptionPlan(
                        "ENTERPRISE", 100000, 500, 19900,
                        "[\"ALL_MODULES\", \"ADVANCED_ANALYTICS\", \"CUSTOM_ROLES\", \"PRIORITY_SUPPORT\"]"
                ));
                log.info("Seeded 3 subscription plans: FREE, STANDARD, ENTERPRISE");
            } else {
                standardPlan = subscriptionPlanRepository.findByName("STANDARD").orElse(null);
            }

            // 2. Seed Default Organization / School (Delhi Public School)
            Organization defaultOrg = null;
            if (organizationRepository.count() == 0 && standardPlan != null) {
                defaultOrg = organizationRepository.save(new Organization(
                        "Delhi Public School",
                        "delhi-public-school",
                        standardPlan.getId(),
                        OrganizationStatus.ACTIVE,
                        "principal@dps.edu"
                ));
                log.info("Seeded default organization: Delhi Public School (delhi-public-school)");
            } else {
                defaultOrg = organizationRepository.findBySlug("delhi-public-school").orElse(null);
            }

            // 3. Seed System Permission Capabilities Catalog
            Map<String, Permission> permMap = new HashMap<>();
            if (permissionRepository.count() == 0) {
                List<Permission> standardPerms = Arrays.asList(
                        new Permission("student:read", "View student records and rosters"),
                        new Permission("student:create", "Enroll new students"),
                        new Permission("student:update", "Modify student details"),
                        new Permission("student:delete", "Remove student records"),
                        new Permission("course:read", "View academic courses"),
                        new Permission("course:manage", "Create and modify academic courses"),
                        new Permission("rbac:manage", "Manage roles, groups, and staff memberships"),
                        new Permission("attendance:mark", "Record daily student attendance"),
                        new Permission("grade:enter", "Submit academic marks and grades"),
                        new Permission("report:export", "Export student and academic reports")
                );
                for (Permission p : standardPerms) {
                    permMap.put(p.getCode(), permissionRepository.save(p));
                }
                log.info("Seeded 10 standard capability permissions");
            } else {
                for (Permission p : permissionRepository.findAll()) {
                    permMap.put(p.getCode(), p);
                }
            }

            // 4. Seed Standard Template Roles (SCHOOL_ADMIN, TEACHER, REGISTRAR)
            if (roleRepository.count() == 0) {
                Role adminRole = roleRepository.save(new Role(null, "SCHOOL_ADMIN", "Full administrative control within the school"));
                Role teacherRole = roleRepository.save(new Role(null, "TEACHER", "Instructional faculty with grading and attendance privileges"));
                Role registrarRole = roleRepository.save(new Role(null, "REGISTRAR", "Academic records manager for enrollments and transcripts"));

                for (Permission p : permMap.values()) {
                    rolePermissionRepository.save(new RolePermission(adminRole.getId(), p.getId()));
                }

                for (String code : Arrays.asList("student:read", "course:read", "attendance:mark", "grade:enter")) {
                    Permission p = permMap.get(code);
                    if (p != null) {
                        rolePermissionRepository.save(new RolePermission(teacherRole.getId(), p.getId()));
                    }
                }

                for (String code : Arrays.asList("student:read", "student:create", "student:update", "course:read", "report:export")) {
                    Permission p = permMap.get(code);
                    if (p != null) {
                        rolePermissionRepository.save(new RolePermission(registrarRole.getId(), p.getId()));
                    }
                }
                log.info("Seeded 3 template roles: SCHOOL_ADMIN, TEACHER, REGISTRAR with capabilities");
            }

            // 5. Seed Default Admin User & Platform Super Admin
            User defaultAdmin = null;
            if (userRepository.count() == 0) {
                defaultAdmin = new User(
                        "admin",
                        "admin@myeducare.internal",
                        passwordEncoder.encode("admin123"),
                        "System Administrator",
                        "ADMIN",
                        false
                );
                userRepository.save(defaultAdmin);
                log.info("Seeded default user: admin");

                User platformSuperAdmin = new User(
                        "superadmin",
                        "superadmin@myeducare.internal",
                        passwordEncoder.encode("SuperAdmin@2026"),
                        "Platform Operator",
                        "PLATFORM_SUPER_ADMIN",
                        true
                );
                userRepository.save(platformSuperAdmin);
                log.info("Seeded platform super admin: superadmin");
            } else {
                defaultAdmin = userRepository.findByUsername("admin").orElse(null);
                if (defaultAdmin != null) {
                    if (defaultAdmin.getPassword() == null || !defaultAdmin.getPassword().startsWith("$2")) {
                        defaultAdmin.setPassword(passwordEncoder.encode("admin123"));
                    }
                    if (defaultAdmin.getEmail() == null) {
                        defaultAdmin.setEmail("admin@myeducare.internal");
                    }
                    userRepository.save(defaultAdmin);
                    log.info("Synchronized admin user credentials with BCrypt encoding");
                }

                User platformSuperAdmin = userRepository.findByUsername("superadmin").orElse(null);
                if (platformSuperAdmin == null) {
                    platformSuperAdmin = new User(
                            "superadmin",
                            "superadmin@myeducare.internal",
                            passwordEncoder.encode("SuperAdmin@2026"),
                            "Platform Operator",
                            "PLATFORM_SUPER_ADMIN",
                            true
                    );
                    userRepository.save(platformSuperAdmin);
                    log.info("Seeded platform super admin: superadmin");
                } else if (platformSuperAdmin.getPassword() == null || !platformSuperAdmin.getPassword().startsWith("$2")) {
                    platformSuperAdmin.setPassword(passwordEncoder.encode("SuperAdmin@2026"));
                    userRepository.save(platformSuperAdmin);
                    log.info("Synchronized platform super admin password with BCrypt encoding");
                }
            }

            // 6. Link defaultAdmin to Default Organization via Membership
            if (defaultAdmin != null && defaultOrg != null) {
                if (!membershipRepository.existsByUserIdAndOrganizationId(defaultAdmin.getId(), defaultOrg.getId())) {
                    membershipRepository.save(new Membership(
                            defaultAdmin.getId(),
                            defaultOrg.getId(),
                            MembershipStatus.ACTIVE
                    ));
                    log.info("Linked user 'admin' to 'Delhi Public School' as ACTIVE member");
                }
            }

            // 7. Seed initial sample students if table is empty
            if (studentRepository.count() == 0) {
                studentRepository.saveAll(Arrays.asList(
                        new Student(101L, "Aarav Sharma", "aarav.sharma@example.edu", "Computer Science", 3),
                        new Student(102L, "Priya Patel", "priya.patel@example.edu", "Information Technology", 4),
                        new Student(103L, "Rohan Verma", "rohan.verma@example.edu", "Computer Science", 3),
                        new Student(104L, "Ananya Gupta", "ananya.gupta@example.edu", "Electronics & Comm.", 2),
                        new Student(105L, "Vikram Malhotra", "vikram.m@example.edu", "Data Science", 5)
                ));
                log.info("Seeded 5 initial sample student records");
            }
        };
    }
}
