package com.student.management.iam.repository;

import com.student.management.iam.entity.RolePermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RolePermissionRepository extends JpaRepository<RolePermission, Long> {

    List<RolePermission> findAllByRoleId(Long roleId);

    List<RolePermission> findAllByRoleIdIn(List<Long> roleIds);

    boolean existsByRoleIdAndPermissionId(Long roleId, Long permissionId);
}
