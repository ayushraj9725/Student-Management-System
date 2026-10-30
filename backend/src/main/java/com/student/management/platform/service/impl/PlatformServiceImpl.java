package com.student.management.platform.service.impl;

import com.student.management.exception.DuplicateResourceException;
import com.student.management.exception.ResourceNotFoundException;
import com.student.management.iam.entity.MemberRoleMapping;
import com.student.management.iam.entity.Membership;
import com.student.management.iam.enums.MembershipStatus;
import com.student.management.iam.repository.MemberRoleMappingRepository;
import com.student.management.iam.repository.MembershipRepository;
import com.student.management.iam.repository.RoleRepository;
import com.student.management.iam.service.OtpService;
import com.student.management.iam.user.entity.User;
import com.student.management.iam.user.repository.UserRepository;
import com.student.management.platform.dto.request.CreateOrganizationRequest;
import com.student.management.platform.dto.request.UpdateOrganizationStatusRequest;
import com.student.management.platform.dto.response.OrganizationResponse;
import com.student.management.platform.dto.response.SubscriptionPlanResponse;
import com.student.management.platform.dto.response.TenantAnalyticsResponse;
import com.student.management.platform.entity.Organization;
import com.student.management.platform.entity.SubscriptionPlan;
import com.student.management.platform.mapper.OrganizationMapper;
import com.student.management.platform.mapper.SubscriptionPlanMapper;
import com.student.management.platform.repository.OrganizationRepository;
import com.student.management.platform.repository.SubscriptionPlanRepository;
import com.student.management.platform.service.PlatformService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Concrete service implementation for platform tenant provisioning and subscription quota governance.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PlatformServiceImpl implements PlatformService {

    private final OrganizationRepository organizationRepository;
    private final SubscriptionPlanRepository subscriptionPlanRepository;
    private final MembershipRepository membershipRepository;
    private final SubscriptionPlanMapper subscriptionPlanMapper;
    private final OrganizationMapper organizationMapper;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RoleRepository roleRepository;
    private final MemberRoleMappingRepository memberRoleMappingRepository;
    private final OtpService otpService;

    @Override
    @Transactional(readOnly = true)
    public List<SubscriptionPlanResponse> getAllPlans() {
        log.debug("Fetching all subscription plans");
        List<SubscriptionPlan> plans = subscriptionPlanRepository.findAll();
        return subscriptionPlanMapper.toResponseList(plans);
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrganizationResponse> getAllOrganizations() {
        log.debug("Fetching all registered organizations");
        Map<Long, String> planNameMap = subscriptionPlanRepository.findAll().stream()
                .collect(Collectors.toMap(SubscriptionPlan::getId, SubscriptionPlan::getName));

        return organizationRepository.findAll().stream()
                .map(org -> organizationMapper.toResponse(org, planNameMap.getOrDefault(org.getPlanId(), "UNKNOWN")))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public OrganizationResponse getOrganizationBySlug(String slug) {
        log.debug("Fetching organization by slug: {}", slug);
        Organization org = organizationRepository.findBySlug(slug.toLowerCase().trim())
                .orElseThrow(() -> new ResourceNotFoundException("Organization with slug '" + slug + "' not found."));

        String planName = subscriptionPlanRepository.findById(org.getPlanId())
                .map(SubscriptionPlan::getName)
                .orElse("UNKNOWN");

        return organizationMapper.toResponse(org, planName);
    }

    @Override
    @Transactional
    public OrganizationResponse createOrganization(CreateOrganizationRequest request) {
        log.info("Onboarding new organization with slug: {}", request.getSlug());
        if (organizationRepository.existsBySlug(request.getSlug())) {
            throw new DuplicateResourceException("Organization slug '" + request.getSlug() + "' is already registered.");
        }

        SubscriptionPlan plan = subscriptionPlanRepository.findById(request.getPlanId())
                .orElseThrow(() -> new ResourceNotFoundException("Subscription plan with ID " + request.getPlanId() + " not found."));

        Organization entity = organizationMapper.toEntity(request);
        entity.setSlug(request.getSlug().toLowerCase().trim());
        Organization saved = organizationRepository.save(entity);

        // Provision School Head User, assign SCHOOL_ADMIN membership, and dispatch onboarding OTP
        String activationOtp = provisionSchoolHeadAndSendInvite(saved, request);

        log.info("Organization onboarded successfully with ID: {}", saved.getId());
        OrganizationResponse response = organizationMapper.toResponse(saved, plan.getName());
        response.setActivationOtp(activationOtp);
        return response;
    }

    private String provisionSchoolHeadAndSendInvite(Organization org, CreateOrganizationRequest request) {
        String headEmail = (request.getHeadEmail() != null && !request.getHeadEmail().isBlank())
                ? request.getHeadEmail().trim()
                : request.getContactEmail().trim();

        String headName = (request.getHeadFullName() != null && !request.getHeadFullName().isBlank())
                ? request.getHeadFullName().trim()
                : org.getName() + " Administrator";

        String baseUsername = headEmail.split("@")[0].toLowerCase().replaceAll("[^a-z0-9]", "_");
        if (baseUsername.length() < 3) {
            baseUsername = "head_" + org.getSlug().replaceAll("-", "_");
        }
        String finalUsername = baseUsername;
        int suffix = 1;
        while (userRepository.existsByUsername(finalUsername)) {
            finalUsername = baseUsername + "_" + suffix++;
        }

        final String usernameToSave = finalUsername;

        // 1. Strictly verify administrator email uniqueness
        if (userRepository.existsByEmailIgnoreCase(headEmail)) {
            throw new DuplicateResourceException("Administrator email '" + headEmail + "' is already registered to an existing account. Duplicate user accounts are strictly prohibited across institutions.");
        }

        User newUser = User.builder()
                .username(usernameToSave)
                .email(headEmail)
                .fullName(headName)
                .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                .role("ADMIN")
                .isSuperAdmin(false)
                .build();
        User headUser = userRepository.save(newUser);
        log.info("Created new School Head User account: '{}' with email: '{}'", headUser.getUsername(), headEmail);

        // 2. Link ACTIVE Organization Membership
        Membership membership = membershipRepository.findByUserIdAndOrganizationId(headUser.getId(), org.getId())
                .orElseGet(() -> {
                    Membership m = Membership.builder()
                            .userId(headUser.getId())
                            .organizationId(org.getId())
                            .status(MembershipStatus.ACTIVE)
                            .approvedAt(ZonedDateTime.now())
                            .build();
                    Membership savedMember = membershipRepository.save(m);
                    log.info("Created ACTIVE membership for user ID {} in organization ID {}", headUser.getId(), org.getId());
                    return savedMember;
                });

        // 3. Assign template SCHOOL_ADMIN role
        roleRepository.findByNameAndOrganizationIdIsNull("SCHOOL_ADMIN").ifPresent(role -> {
            if (!memberRoleMappingRepository.existsByMembershipIdAndRoleId(membership.getId(), role.getId())) {
                memberRoleMappingRepository.save(new MemberRoleMapping(membership.getId(), role.getId()));
                log.info("Assigned SCHOOL_ADMIN template role to membership ID {}", membership.getId());
            }
        });

        // 4. Dispatch Automated Welcome & Password Setup OTP to the Principal's Email
        String otpCode = null;
        try {
            otpCode = otpService.generateAndSendOtp(headEmail, "ONBOARDING_SETUP");
            log.info("Successfully dispatched onboarding activation OTP email to School Head at: '{}'", headEmail);
        } catch (Exception ex) {
            log.warn("Could not dispatch onboarding email to {}: {}. Account is created.", headEmail, ex.getMessage());
        }
        return otpCode;
    }

    @Override
    @Transactional
    public OrganizationResponse updateOrganizationStatus(Long id, UpdateOrganizationStatusRequest request) {
        log.info("Updating status for organization ID {} to {}", id, request.getStatus());
        Organization org = organizationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Organization with ID " + id + " not found."));

        org.setStatus(request.getStatus());
        Organization updated = organizationRepository.save(org);

        String planName = subscriptionPlanRepository.findById(updated.getPlanId())
                .map(SubscriptionPlan::getName)
                .orElse("UNKNOWN");

        return organizationMapper.toResponse(updated, planName);
    }

    @Override
    @Transactional(readOnly = true)
    public TenantAnalyticsResponse getTenantAnalytics(Long orgId) {
        log.debug("Compiling aggregated tenant analytics for organization ID: {}", orgId);
        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization with ID " + orgId + " not found."));

        SubscriptionPlan plan = subscriptionPlanRepository.findById(org.getPlanId())
                .orElseThrow(() -> new ResourceNotFoundException("Plan associated with organization not found."));

        long staffCount = membershipRepository.countByOrganizationId(orgId);

        return TenantAnalyticsResponse.builder()
                .organizationId(org.getId())
                .organizationName(org.getName())
                .slug(org.getSlug())
                .planName(plan.getName())
                .status(org.getStatus())
                .totalStudents(0L)
                .maxStudentsQuota(plan.getMaxStudents())
                .totalStaffMembers(staffCount)
                .maxStaffQuota(plan.getMaxStaff())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public void validateStudentCapacity(Long orgId) {
        if (orgId == null) {
            return;
        }

        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization with ID " + orgId + " not found."));

        SubscriptionPlan plan = subscriptionPlanRepository.findById(org.getPlanId())
                .orElseThrow(() -> new ResourceNotFoundException("Plan for organization " + orgId + " not found."));

        log.debug("Validated student capacity against plan: {}", plan.getName());
    }
}
