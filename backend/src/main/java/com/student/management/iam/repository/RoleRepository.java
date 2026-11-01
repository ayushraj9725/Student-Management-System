package com.student.management.iam.repository;

import com.student.management.iam.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {

    // Returns template roles (organizationId is NULL) + custom roles for the specified organization
    @Query("SELECT r FROM Role r WHERE (r.organizationId IS NULL OR r.organizationId = :organizationId) ORDER BY r.name ASC")
    List<Role> findAllByOrganizationIdIsNullOrOrganizationId(@Param("organizationId") Long organizationId);

    @Query("SELECT r FROM Role r WHERE r.id = :id AND (r.organizationId IS NULL OR r.organizationId = :organizationId)")
    Optional<Role> findByIdAndOrganizationId(@Param("id") Long id, @Param("organizationId") Long organizationId);

    @Query("SELECT r FROM Role r WHERE r.name = :name AND r.organizationId IS NULL")
    Optional<Role> findByNameAndOrganizationIdIsNull(@Param("name") String name);

    @Query("SELECT r FROM Role r WHERE r.name = :name AND r.organizationId = :organizationId")
    Optional<Role> findByNameAndOrganizationId(@Param("name") String name, @Param("organizationId") Long organizationId);

    @Query("SELECT COUNT(r) > 0 FROM Role r WHERE r.name = :name AND r.organizationId IS NULL")
    boolean existsByNameAndOrganizationIdIsNull(@Param("name") String name);
}
