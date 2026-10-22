package com.student.management.config;

import com.student.management.entity.Student;
import com.student.management.entity.User;
import com.student.management.repository.StudentRepository;
import com.student.management.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Arrays;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner initDatabase(UserRepository userRepository, StudentRepository studentRepository) {
        return args -> {
            // Seed default admin user if none exists
            if (userRepository.count() == 0) {
                User defaultAdmin = new User(
                        "admin",
                        PasswordUtil.hashPassword("admin123"),
                        "System Administrator",
                        "ADMIN"
                );
                userRepository.save(defaultAdmin);
                System.out.println(">>> [DataInitializer] Seeded default user: username='admin', password='admin123'");
            }

            // Seed initial sample students if table is empty
            if (studentRepository.count() == 0) {
                studentRepository.saveAll(Arrays.asList(
                        new Student(101L, "Aarav Sharma", "aarav.sharma@example.edu", "Computer Science", 3),
                        new Student(102L, "Priya Patel", "priya.patel@example.edu", "Information Technology", 4),
                        new Student(103L, "Rohan Verma", "rohan.verma@example.edu", "Computer Science", 3),
                        new Student(104L, "Ananya Gupta", "ananya.gupta@example.edu", "Electronics & Comm.", 2),
                        new Student(105L, "Vikram Malhotra", "vikram.m@example.edu", "Data Science", 5)
                ));
                System.out.println(">>> [DataInitializer] Seeded 5 initial student records for demonstration.");
            }
        };
    }
}
