package com.student.management.service;

import com.student.management.entity.Student;
import com.student.management.exception.DuplicateResourceException;
import com.student.management.exception.ResourceNotFoundException;
import com.student.management.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class StudentService {

    private final StudentRepository studentRepository;

    public StudentService(StudentRepository studentRepository) {
        this.studentRepository = studentRepository;
    }

    public List<Student> getAllStudents(String search) {
        if (search != null && !search.trim().isEmpty()) {
            return studentRepository.searchStudents(search.trim());
        }
        return studentRepository.findAll();
    }

    public Student getStudentById(Long id) {
        return studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + id));
    }

    public Student createStudent(Student student) {
        if (student.getId() == null || student.getId() <= 0) {
            Long nextId = studentRepository.findMaxStudentId() + 1;
            student.setId(nextId);
        } else if (studentRepository.existsById(student.getId())) {
            throw new DuplicateResourceException("Student with ID " + student.getId() + " already exists. Duplicate IDs are rejected.");
        }

        return studentRepository.save(student);
    }

    public Student updateStudent(Long id, Student updatedData) {
        Student existing = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cannot update. Student not found with ID: " + id));

        existing.setFullName(updatedData.getFullName());
        existing.setEmail(updatedData.getEmail());
        existing.setCourse(updatedData.getCourse());
        existing.setSemester(updatedData.getSemester());

        return studentRepository.save(existing);
    }

    public void deleteStudent(Long id) {
        if (!studentRepository.existsById(id)) {
            throw new ResourceNotFoundException("Cannot delete. Student not found with ID: " + id);
        }
        studentRepository.deleteById(id);
    }
}
