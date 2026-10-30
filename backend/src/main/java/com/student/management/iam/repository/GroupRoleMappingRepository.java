package com.student.management.iam.repository;

import com.student.management.iam.entity.GroupRoleMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GroupRoleMappingRepository extends JpaRepository<GroupRoleMapping, Long> {

    List<GroupRoleMapping> findAllByGroupId(Long groupId);

    List<GroupRoleMapping> findAllByGroupIdIn(List<Long> groupIds);

    boolean existsByGroupIdAndRoleId(Long groupId, Long roleId);
}
