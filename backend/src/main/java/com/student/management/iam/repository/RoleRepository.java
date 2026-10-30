package com.student.management.iam.repository;

import com.student.management.iam.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {

    // Returns template roles (organizationId is NULL) + custom roles for the specified organization
    List<Role> findAllByOrganizationIdIsNullOrOrganizationId(Long organizationId);

    Optional<Role> findByIdAndOrganizationId(Long id, Long organizationId);

    Optional<Role> findByNameAndOrganizationIdIsNull(String name);

    Optional<Role> findByNameAndOrganizationId(String name, Long organizationId);

    boolean existsByNameAndOrganizationIdIsNull(String name);
}
