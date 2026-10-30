package com.student.management.iam.repository;

import com.student.management.iam.entity.SchoolGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SchoolGroupRepository extends JpaRepository<SchoolGroup, Long> {

    List<SchoolGroup> findAllByOrganizationId(Long organizationId);

    Optional<SchoolGroup> findByIdAndOrganizationId(Long id, Long organizationId);

    Optional<SchoolGroup> findByOrganizationIdAndName(Long organizationId, String name);

    boolean existsByOrganizationIdAndName(Long organizationId, String name);
}
