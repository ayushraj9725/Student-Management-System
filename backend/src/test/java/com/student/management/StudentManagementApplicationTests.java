package com.student.management;

import com.student.management.entity.Student;
import com.student.management.exception.DuplicateResourceException;
import com.student.management.exception.ResourceNotFoundException;
import com.student.management.repository.StudentRepository;
import com.student.management.service.StudentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("h2")
class StudentManagementApplicationTests {

    @Autowired
    private StudentService studentService;

    @Autowired
    private StudentRepository studentRepository;

    @BeforeEach
    void setUp() {
        studentRepository.deleteAll();
    }

    @Test
    void testCreateStudentSuccess() {
        Student student = new Student(201L, "Rahul Sharma", "rahul@example.com", "Computer Science", 3);
        Student created = studentService.createStudent(student);

        assertNotNull(created);
        assertEquals(201L, created.getId());
        assertEquals("Rahul Sharma", created.getFullName());
    }

    @Test
    void testCreateDuplicateStudentThrowsException() {
        Student student1 = new Student(202L, "Neha Roy", "neha@example.com", "IT", 4);
        studentService.createStudent(student1);

        Student duplicate = new Student(202L, "Neha Roy Duplicate", "neha2@example.com", "IT", 4);

        DuplicateResourceException exception = assertThrows(DuplicateResourceException.class, () -> {
            studentService.createStudent(duplicate);
        });

        assertTrue(exception.getMessage().contains("already exists"));
    }

    @Test
    void testGetStudentById() {
        Student student = new Student(203L, "Kavita Sen", "kavita@example.com", "Data Science", 2);
        studentService.createStudent(student);

        Student found = studentService.getStudentById(203L);
        assertNotNull(found);
        assertEquals("Kavita Sen", found.getFullName());
    }

    @Test
    void testUpdateStudent() {
        Student student = new Student(204L, "Amit Kumar", "amit@example.com", "Electronics", 1);
        studentService.createStudent(student);

        Student updateDetails = new Student(204L, "Amit Kumar Updated", "amit.updated@example.com", "Electronics", 2);
        Student updated = studentService.updateStudent(204L, updateDetails);

        assertEquals("Amit Kumar Updated", updated.getFullName());
        assertEquals("amit.updated@example.com", updated.getEmail());
        assertEquals(2, updated.getSemester());
    }

    @Test
    void testDeleteStudent() {
        Student student = new Student(205L, "Pooja Das", "pooja@example.com", "Mechanical", 5);
        studentService.createStudent(student);

        studentService.deleteStudent(205L);

        assertThrows(ResourceNotFoundException.class, () -> {
            studentService.getStudentById(205L);
        });
    }

    @Test
    void testSearchStudents() {
        studentService.createStudent(new Student(301L, "Sunil Joshi", "sunil@example.com", "Civil Engineering", 1));
        studentService.createStudent(new Student(302L, "Anita Rao", "anita@example.com", "Computer Science", 2));

        List<Student> results = studentService.getAllStudents("Civil");
        assertEquals(1, results.size());
        assertEquals("Sunil Joshi", results.get(0).getFullName());

        List<Student> idResults = studentService.getAllStudents("302");
        assertEquals(1, idResults.size());
        assertEquals("Anita Rao", idResults.get(0).getFullName());
    }
}
