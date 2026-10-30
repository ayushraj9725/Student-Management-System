package com.student.management.iam.repository;

import com.student.management.iam.entity.MembershipGroupMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MembershipGroupMappingRepository extends JpaRepository<MembershipGroupMapping, Long> {

    List<MembershipGroupMapping> findAllByMembershipId(Long membershipId);

    List<MembershipGroupMapping> findAllByGroupId(Long groupId);

    boolean existsByMembershipIdAndGroupId(Long membershipId, Long groupId);
}
