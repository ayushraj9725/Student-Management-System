package com.student.management.iam.repository;

import com.student.management.iam.entity.SchoolGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SchoolGroupRepository extends JpaRepository<SchoolGroup, Long> {

    @Query("SELECT g FROM SchoolGroup g WHERE g.organizationId = :organizationId ORDER BY g.name ASC")
    List<SchoolGroup> findAllByOrganizationId(@Param("organizationId") Long organizationId);

    @Query("SELECT g FROM SchoolGroup g WHERE g.id = :id AND g.organizationId = :organizationId")
    Optional<SchoolGroup> findByIdAndOrganizationId(@Param("id") Long id, @Param("organizationId") Long organizationId);

    @Query("SELECT g FROM SchoolGroup g WHERE g.organizationId = :organizationId AND LOWER(g.name) = LOWER(:name)")
    Optional<SchoolGroup> findByOrganizationIdAndName(@Param("organizationId") Long organizationId, @Param("name") String name);

    @Query("SELECT COUNT(g) > 0 FROM SchoolGroup g WHERE g.organizationId = :organizationId AND LOWER(g.name) = LOWER(:name)")
    boolean existsByOrganizationIdAndName(@Param("organizationId") Long organizationId, @Param("name") String name);
}
