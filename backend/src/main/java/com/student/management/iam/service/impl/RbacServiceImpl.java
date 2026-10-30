package com.student.management.iam.service.impl;

import com.student.management.exception.BadRequestException;
import com.student.management.exception.DuplicateResourceException;
import com.student.management.exception.ResourceNotFoundException;
import com.student.management.iam.dto.request.CreateGroupRequest;
import com.student.management.iam.dto.request.CreateRoleRequest;
import com.student.management.iam.dto.request.CreateStaffUserRequest;
import com.student.management.iam.dto.request.UpdateMembershipStatusRequest;
import com.student.management.iam.dto.response.MemberPermissionSummaryResponse;
import com.student.management.iam.dto.response.PermissionResponse;
import com.student.management.iam.dto.response.RoleResponse;
import com.student.management.iam.dto.response.SchoolGroupResponse;
import com.student.management.iam.entity.*;
import com.student.management.iam.enums.MembershipStatus;
import com.student.management.iam.mapper.RbacMapper;
import com.student.management.iam.repository.*;
import com.student.management.iam.service.OtpService;
import com.student.management.iam.service.RbacService;
import com.student.management.platform.repository.OrganizationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Concrete service implementation for Role-Based Access Control and capability permissions resolution.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RbacServiceImpl implements RbacService {

    private final PermissionRepository permissionRepository;
    private final RoleRepository roleRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final SchoolGroupRepository schoolGroupRepository;
    private final MembershipRepository membershipRepository;
    private final MembershipGroupMappingRepository membershipGroupMappingRepository;
    private final GroupRoleMappingRepository groupRoleMappingRepository;
    private final MemberRoleMappingRepository memberRoleMappingRepository;
    private final RbacMapper rbacMapper;
    private final com.student.management.iam.user.repository.UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final OtpService otpService;
    private final OrganizationRepository organizationRepository;

    @Override
    @Transactional(readOnly = true)
    public List<PermissionResponse> getAllPermissions() {
        log.debug("Fetching all system capability permissions");
        List<Permission> permissions = permissionRepository.findAll();
        return rbacMapper.toPermissionResponseList(permissions);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoleResponse> getRoles(Long orgId) {
        log.debug("Fetching roles for organization ID: {}", orgId);
        List<Role> roles = roleRepository.findAllByOrganizationIdIsNullOrOrganizationId(orgId);
        List<Long> roleIds = roles.stream().map(Role::getId).collect(Collectors.toList());

        List<RolePermission> rolePermissions = rolePermissionRepository.findAllByRoleIdIn(roleIds);
        Map<Long, List<Long>> roleToPermIds = rolePermissions.stream()
                .collect(Collectors.groupingBy(RolePermission::getRoleId,
                        Collectors.mapping(RolePermission::getPermissionId, Collectors.toList())));

        Map<Long, PermissionResponse> permResponseMap = permissionRepository.findAll().stream()
                .collect(Collectors.toMap(Permission::getId, rbacMapper::toResponse));

        return roles.stream().map(role -> {
            List<Long> permIds = roleToPermIds.getOrDefault(role.getId(), Collections.emptyList());
            List<PermissionResponse> assignedPerms = permIds.stream()
                    .map(permResponseMap::get)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());

            return RoleResponse.builder()
                    .id(role.getId())
                    .name(role.getName())
                    .description(role.getDescription())
                    .organizationId(role.getOrganizationId())
                    .isSystemTemplate(role.getOrganizationId() == null)
                    .permissions(assignedPerms)
                    .createdAt(role.getCreatedAt())
                    .updatedAt(role.getUpdatedAt())
                    .createdBy(role.getCreatedBy())
                    .updatedBy(role.getUpdatedBy())
                    .build();
        }).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public RoleResponse createCustomRole(Long orgId, CreateRoleRequest request) {
        log.info("Creating custom role '{}' for organization ID: {}", request.getName(), orgId);
        if (roleRepository.findByNameAndOrganizationId(request.getName(), orgId).isPresent()) {
            throw new DuplicateResourceException("Role '" + request.getName() + "' already exists for this organization.");
        }

        Role role = rbacMapper.toEntity(request);
        role.setOrganizationId(orgId);
        Role savedRole = roleRepository.save(role);

        List<PermissionResponse> assignedPermissions = new ArrayList<>();
        for (Long permId : request.getPermissionIds()) {
            Permission perm = permissionRepository.findById(permId)
                    .orElseThrow(() -> new ResourceNotFoundException("Permission ID " + permId + " does not exist."));
            rolePermissionRepository.save(new RolePermission(savedRole.getId(), perm.getId()));
            assignedPermissions.add(rbacMapper.toResponse(perm));
        }

        log.info("Custom role '{}' created with ID: {}", savedRole.getName(), savedRole.getId());
        return RoleResponse.builder()
                .id(savedRole.getId())
                .name(savedRole.getName())
                .description(savedRole.getDescription())
                .organizationId(savedRole.getOrganizationId())
                .isSystemTemplate(false)
                .permissions(assignedPermissions)
                .createdAt(savedRole.getCreatedAt())
                .updatedAt(savedRole.getUpdatedAt())
                .createdBy(savedRole.getCreatedBy())
                .updatedBy(savedRole.getUpdatedBy())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<SchoolGroupResponse> getGroups(Long orgId) {
        log.debug("Fetching groups for organization ID: {}", orgId);
        List<SchoolGroup> groups = schoolGroupRepository.findAllByOrganizationId(orgId);
        return rbacMapper.toGroupResponseList(groups);
    }

    @Override
    @Transactional
    public SchoolGroupResponse createGroup(Long orgId, CreateGroupRequest request) {
        log.info("Creating school group '{}' for organization ID: {}", request.getName(), orgId);
        if (schoolGroupRepository.existsByOrganizationIdAndName(orgId, request.getName())) {
            throw new DuplicateResourceException("Department/Group '" + request.getName() + "' already exists in this organization.");
        }

        SchoolGroup group = rbacMapper.toEntity(request);
        group.setOrganizationId(orgId);
        SchoolGroup saved = schoolGroupRepository.save(group);

        log.info("School group '{}' created with ID: {}", saved.getName(), saved.getId());
        return rbacMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public void assignRolesToGroup(Long groupId, List<Long> roleIds) {
        log.info("Assigning roles {} to group ID: {}", roleIds, groupId);
        SchoolGroup group = schoolGroupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("School Group ID " + groupId + " not found."));

        for (Long roleId : roleIds) {
            if (!roleRepository.existsById(roleId)) {
                throw new ResourceNotFoundException("Role ID " + roleId + " not found.");
            }
            if (!groupRoleMappingRepository.existsByGroupIdAndRoleId(group.getId(), roleId)) {
                groupRoleMappingRepository.save(new GroupRoleMapping(group.getId(), roleId));
            }
        }
    }

    @Override
    @Transactional
    public void assignGroupsToMember(Long membershipId, List<Long> groupIds) {
        log.info("Assigning groups {} to membership ID: {}", groupIds, membershipId);
        Membership member = membershipRepository.findById(membershipId)
                .orElseThrow(() -> new ResourceNotFoundException("Membership ID " + membershipId + " not found."));

        for (Long groupId : groupIds) {
            SchoolGroup group = schoolGroupRepository.findById(groupId)
                    .orElseThrow(() -> new ResourceNotFoundException("School Group ID " + groupId + " not found."));
            if (!group.getOrganizationId().equals(member.getOrganizationId())) {
                throw new IllegalArgumentException("Cannot assign group from a different organization.");
            }
            if (!membershipGroupMappingRepository.existsByMembershipIdAndGroupId(membershipId, groupId)) {
                membershipGroupMappingRepository.save(new MembershipGroupMapping(membershipId, groupId));
            }
        }
    }

    @Override
    @Transactional
    public void assignRolesToMember(Long membershipId, List<Long> roleIds) {
        log.info("Assigning direct roles {} to membership ID: {}", roleIds, membershipId);
        Membership member = membershipRepository.findById(membershipId)
                .orElseThrow(() -> new ResourceNotFoundException("Membership ID " + membershipId + " not found."));

        for (Long roleId : roleIds) {
            Role role = roleRepository.findById(roleId)
                    .orElseThrow(() -> new ResourceNotFoundException("Role ID " + roleId + " not found."));
            if (role.getOrganizationId() != null && !role.getOrganizationId().equals(member.getOrganizationId())) {
                throw new IllegalArgumentException("Cannot assign custom role from another organization.");
            }
            if (!memberRoleMappingRepository.existsByMembershipIdAndRoleId(membershipId, roleId)) {
                memberRoleMappingRepository.save(new MemberRoleMapping(membershipId, roleId));
            }
        }
    }

    @Override
    @Transactional(readOnly = true)
    public MemberPermissionSummaryResponse getMemberPermissionSummary(Long membershipId) {
        log.debug("Calculating effective permissions for membership ID: {}", membershipId);
        Membership member = membershipRepository.findById(membershipId)
                .orElseThrow(() -> new ResourceNotFoundException("Membership ID " + membershipId + " not found."));

        // 1. Direct roles
        List<MemberRoleMapping> directRoleMappings = memberRoleMappingRepository.findAllByMembershipId(membershipId);
        List<Long> directRoleIds = directRoleMappings.stream().map(MemberRoleMapping::getRoleId).collect(Collectors.toList());
        List<Role> directRoles = roleRepository.findAllById(directRoleIds);
        List<String> directRoleNames = directRoles.stream().map(Role::getName).collect(Collectors.toList());

        // 2. Department groups
        List<MembershipGroupMapping> groupMappings = membershipGroupMappingRepository.findAllByMembershipId(membershipId);
        List<Long> groupIds = groupMappings.stream().map(MembershipGroupMapping::getGroupId).collect(Collectors.toList());
        List<SchoolGroup> groups = schoolGroupRepository.findAllById(groupIds);
        List<String> groupNames = groups.stream().map(SchoolGroup::getName).collect(Collectors.toList());

        // 3. Group-inherited roles
        List<GroupRoleMapping> groupRoleMappings = groupRoleMappingRepository.findAllByGroupIdIn(groupIds);
        List<Long> groupRoleIds = groupRoleMappings.stream().map(GroupRoleMapping::getRoleId).collect(Collectors.toList());
        List<Role> groupRoles = roleRepository.findAllById(groupRoleIds);
        List<String> groupRoleNames = groupRoles.stream().map(Role::getName).collect(Collectors.toList());

        // 4. Combined distinct role IDs
        Set<Long> allRoleIds = new HashSet<>(directRoleIds);
        allRoleIds.addAll(groupRoleIds);

        // 5. Gather capabilities
        List<RolePermission> rolePermissions = rolePermissionRepository.findAllByRoleIdIn(new ArrayList<>(allRoleIds));
        List<Long> permIds = rolePermissions.stream().map(RolePermission::getPermissionId).distinct().collect(Collectors.toList());
        List<Permission> permissions = permissionRepository.findAllById(permIds);
        Set<String> capabilityCodes = permissions.stream().map(Permission::getCode).collect(Collectors.toSet());

        Optional<com.student.management.iam.user.entity.User> userOpt = userRepository.findById(member.getUserId());
        String fullName = userOpt.map(com.student.management.iam.user.entity.User::getFullName).orElse("Staff Member");
        String username = userOpt.map(com.student.management.iam.user.entity.User::getUsername).orElse("user-" + member.getUserId());
        String email = userOpt.map(com.student.management.iam.user.entity.User::getEmail).orElse("");

        return MemberPermissionSummaryResponse.builder()
                .membershipId(member.getId())
                .userId(member.getUserId())
                .fullName(fullName)
                .username(username)
                .email(email)
                .organizationId(member.getOrganizationId())
                .status(member.getStatus())
                .directRoles(directRoleNames)
                .groupNames(groupNames)
                .groupInheritedRoles(groupRoleNames)
                .effectivePermissions(capabilityCodes)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<MemberPermissionSummaryResponse> getMembershipsByStatus(Long orgId, MembershipStatus status) {
        log.debug("Fetching memberships for org ID {} with status: {}", orgId, status);
        List<Membership> members = (status == null)
                ? membershipRepository.findAllByOrganizationId(orgId)
                : membershipRepository.findAllByOrganizationIdAndStatus(orgId, status);

        return members.stream()
                .map(m -> getMemberPermissionSummary(m.getId()))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public MemberPermissionSummaryResponse approveStaffMembership(Long membershipId, Long approvedByUserId, List<Long> roleIds, List<Long> groupIds) {
        log.info("Approving staff membership ID: {} by approver: {}", membershipId, approvedByUserId);
        Membership member = membershipRepository.findById(membershipId)
                .orElseThrow(() -> new ResourceNotFoundException("Membership ID " + membershipId + " not found."));

        member.setStatus(MembershipStatus.ACTIVE);
        member.setApprovedBy(approvedByUserId);
        member.setApprovedAt(java.time.ZonedDateTime.now());
        membershipRepository.save(member);

        if (groupIds != null && !groupIds.isEmpty()) {
            assignGroupsToMember(membershipId, groupIds);
        }
        if (roleIds != null && !roleIds.isEmpty()) {
            assignRolesToMember(membershipId, roleIds);
        }

        return getMemberPermissionSummary(membershipId);
    }

    @Override
    @Transactional
    public MemberPermissionSummaryResponse rejectStaffMembership(Long membershipId) {
        log.info("Rejecting staff membership ID: {}", membershipId);
        Membership member = membershipRepository.findById(membershipId)
                .orElseThrow(() -> new ResourceNotFoundException("Membership ID " + membershipId + " not found."));

        member.setStatus(MembershipStatus.REJECTED);
        membershipRepository.save(member);

        return getMemberPermissionSummary(membershipId);
    }

    @Override
    @Transactional
    public MemberPermissionSummaryResponse provisionStaffUser(Long orgId, CreateStaffUserRequest request) {
        log.info("Provisioning staff user '{}' for organization ID: {} in mode: {}",
                request.getEmail(), orgId, request.getProvisionMode());

        if (orgId == null) {
            throw new BadRequestException("Organization ID must be provided.");
        }

        if (!organizationRepository.existsById(orgId)) {
            throw new ResourceNotFoundException("Organization with ID " + orgId + " not found.");
        }

        String cleanEmail = request.getEmail().trim().toLowerCase();

        // 1. Strictly enforce global and organizational uniqueness: No duplicate email or username allowed
        if (userRepository.existsByEmailIgnoreCase(cleanEmail)) {
            throw new DuplicateResourceException("Cannot add user. An account with email '" + cleanEmail + "' already exists in the system.");
        }

        // Determine username
        String usernameCandidate = request.getUsername() != null && !request.getUsername().trim().isEmpty()
                ? request.getUsername().trim().toLowerCase()
                : cleanEmail.split("@")[0].replaceAll("[^a-zA-Z0-9._-]", "");

        if (userRepository.existsByUsername(usernameCandidate)) {
            throw new DuplicateResourceException("Cannot add user. An account with username '" + usernameCandidate + "' already exists in the system.");
        }

        // Determine password
        String encodedPassword;
        boolean isInstant = "INSTANT".equalsIgnoreCase(request.getProvisionMode());
        if (isInstant) {
            if (request.getPassword() == null || request.getPassword().trim().length() < 6) {
                throw new BadRequestException("Password of at least 6 characters is required for instant credential provisioning.");
            }
            encodedPassword = passwordEncoder.encode(request.getPassword().trim());
        } else {
            // Email invite mode: temporary randomized password
            encodedPassword = passwordEncoder.encode(UUID.randomUUID().toString());
        }

        com.student.management.iam.user.entity.User newUser = com.student.management.iam.user.entity.User.builder()
                .username(usernameCandidate)
                .email(cleanEmail)
                .password(encodedPassword)
                .fullName(request.getFullName().trim())
                .role("STAFF")
                .isSuperAdmin(false)
                .build();

        com.student.management.iam.user.entity.User user = userRepository.save(newUser);
        log.info("Created new user account ID {} with username '{}'", user.getId(), user.getUsername());

        // 2. Create Membership in target organization
        Membership membership = Membership.builder()
                .userId(user.getId())
                .organizationId(orgId)
                .status(MembershipStatus.ACTIVE)
                .build();
        Membership savedMembership = membershipRepository.save(membership);

        // 3. Assign Direct Roles
        if (request.getRoleIds() != null && !request.getRoleIds().isEmpty()) {
            assignRolesToMember(savedMembership.getId(), request.getRoleIds());
        }

        // 4. Assign Groups
        if (request.getGroupIds() != null && !request.getGroupIds().isEmpty()) {
            assignGroupsToMember(savedMembership.getId(), request.getGroupIds());
        }

        // 5. If Email Invite mode, dispatch OTP email onboarding handshake
        if ("EMAIL_INVITE".equalsIgnoreCase(request.getProvisionMode())) {
            try {
                otpService.generateAndSendOtp(cleanEmail, "ONBOARDING_SETUP");
                log.info("Onboarding invitation OTP successfully dispatched to {}", cleanEmail);
            } catch (Exception ex) {
                log.error("Failed to send onboarding email to {}: {}", cleanEmail, ex.getMessage());
                // Non-fatal to transaction so membership is created, but log error
            }
        }

        return getMemberPermissionSummary(savedMembership.getId());
    }

    @Override
    @Transactional
    public MemberPermissionSummaryResponse updateMembershipStatus(Long orgId, Long membershipId, UpdateMembershipStatusRequest request) {
        log.info("Updating membership ID {} in organization ID {} to status: {}",
                membershipId, orgId, request.getStatus());

        if (orgId == null) {
            throw new BadRequestException("Organization ID must be provided.");
        }

        // Enforce anti-enumeration: return 404 if not found within this organization
        Membership membership = membershipRepository.findByIdAndOrganizationId(membershipId, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Staff membership ID " + membershipId + " not found in organization ID " + orgId));

        if (request.getStatus() != null) {
            membership.setStatus(request.getStatus());
            membershipRepository.save(membership);
        }

        return getMemberPermissionSummary(membership.getId());
    }
}
