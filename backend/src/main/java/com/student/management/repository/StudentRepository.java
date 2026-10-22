package com.student.management.repository;

import com.student.management.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long> {

    @Query("SELECT s FROM Student s WHERE " +
           "LOWER(s.fullName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(s.email) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(s.course) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "CAST(s.id AS string) LIKE CONCAT('%', :keyword, '%')")
    List<Student> searchStudents(@Param("keyword") String keyword);

    @Query("SELECT COALESCE(MAX(s.id), 1000) FROM Student s")
    Long findMaxStudentId();
}
