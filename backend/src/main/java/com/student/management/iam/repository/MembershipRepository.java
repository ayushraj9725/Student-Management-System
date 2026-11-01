package com.student.management.iam.repository;

import com.student.management.iam.entity.Membership;
import com.student.management.iam.enums.MembershipStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MembershipRepository extends JpaRepository<Membership, Long> {

    @Query("SELECT m FROM Membership m WHERE m.id = :id AND m.organizationId = :organizationId")
    Optional<Membership> findByIdAndOrganizationId(@Param("id") Long id, @Param("organizationId") Long organizationId);

    @Query("SELECT m FROM Membership m WHERE m.userId = :userId AND m.organizationId = :organizationId")
    Optional<Membership> findByUserIdAndOrganizationId(@Param("userId") Long userId, @Param("organizationId") Long organizationId);

    @Query("SELECT m FROM Membership m WHERE m.organizationId = :organizationId ORDER BY m.createdAt DESC")
    List<Membership> findAllByOrganizationId(@Param("organizationId") Long organizationId);

    @Query("SELECT m FROM Membership m WHERE m.organizationId = :organizationId AND m.status = :status ORDER BY m.createdAt DESC")
    List<Membership> findAllByOrganizationIdAndStatus(@Param("organizationId") Long organizationId, @Param("status") MembershipStatus status);

    @Query("SELECT m FROM Membership m WHERE m.userId = :userId ORDER BY m.createdAt DESC")
    List<Membership> findAllByUserId(@Param("userId") Long userId);

    @Query("SELECT COUNT(m) > 0 FROM Membership m WHERE m.userId = :userId AND m.organizationId = :organizationId")
    boolean existsByUserIdAndOrganizationId(@Param("userId") Long userId, @Param("organizationId") Long organizationId);

    @Query("SELECT COUNT(m) FROM Membership m WHERE m.organizationId = :organizationId")
    long countByOrganizationId(@Param("organizationId") Long organizationId);
}
