package com.student.management.iam.repository;

import com.student.management.iam.entity.MemberRoleMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MemberRoleMappingRepository extends JpaRepository<MemberRoleMapping, Long> {

    List<MemberRoleMapping> findAllByMembershipId(Long membershipId);

    List<MemberRoleMapping> findAllByMembershipIdIn(List<Long> membershipIds);

    boolean existsByMembershipIdAndRoleId(Long membershipId, Long roleId);
}
