package com.student.management.iam.repository;

import com.student.management.iam.entity.Membership;
import com.student.management.iam.enums.MembershipStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MembershipRepository extends JpaRepository<Membership, Long> {

    Optional<Membership> findByIdAndOrganizationId(Long id, Long organizationId);

    Optional<Membership> findByUserIdAndOrganizationId(Long userId, Long organizationId);

    List<Membership> findAllByOrganizationId(Long organizationId);

    List<Membership> findAllByOrganizationIdAndStatus(Long organizationId, MembershipStatus status);

    List<Membership> findAllByUserId(Long userId);

    boolean existsByUserIdAndOrganizationId(Long userId, Long organizationId);

    long countByOrganizationId(Long organizationId);
}
