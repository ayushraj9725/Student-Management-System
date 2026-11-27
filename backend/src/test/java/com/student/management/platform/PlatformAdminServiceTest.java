package com.student.management.platform;

import com.student.management.exception.ResourceNotFoundException;
import com.student.management.platform.dto.request.UpdateOrganizationApplicationsRequest;
import com.student.management.platform.dto.response.ApplicationModuleCatalogDto;
import com.student.management.platform.dto.response.OrganizationResponse;
import com.student.management.platform.entity.Organization;
import com.student.management.platform.entity.SubscriptionPlan;
import com.student.management.platform.enums.OrganizationStatus;
import com.student.management.platform.mapper.OrganizationMapper;
import com.student.management.platform.mapper.SubscriptionPlanMapper;
import com.student.management.platform.repository.OrganizationRepository;
import com.student.management.platform.repository.SubscriptionPlanRepository;
import com.student.management.platform.service.impl.PlatformServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PlatformAdminServiceTest {

    @Mock
    private OrganizationRepository organizationRepository;

    @Mock
    private SubscriptionPlanRepository subscriptionPlanRepository;

    @Mock
    private OrganizationMapper organizationMapper;

    @Mock
    private SubscriptionPlanMapper subscriptionPlanMapper;

    @InjectMocks
    private PlatformServiceImpl platformService;

    private Organization testOrg;
    private SubscriptionPlan testPlan;

    @BeforeEach
    void setUp() {
        testPlan = SubscriptionPlan.builder()
                .id(1L)
                .name("ENTERPRISE")
                .maxStudents(5000)
                .maxStaff(500)
                .build();

        testOrg = Organization.builder()
                .id(10L)
                .name("Greenwood High International")
                .slug("greenwood")
                .planId(1L)
                .status(OrganizationStatus.ACTIVE)
                .contactEmail("contact@greenwood.edu")
                .enabledApplications(new HashSet<>(Arrays.asList("STUDENT_MANAGEMENT", "IAM_GOVERNANCE")))
                .build();
    }

    @Test
    @DisplayName("Platform Super Admin: Successfully update entitled applications for a tenant")
    void testUpdateOrganizationApplications_Success() {
        when(organizationRepository.findById(10L)).thenReturn(Optional.of(testOrg));
        when(subscriptionPlanRepository.findById(1L)).thenReturn(Optional.of(testPlan));
        when(organizationRepository.save(any(Organization.class))).thenAnswer(inv -> inv.getArgument(0));

        Set<String> newApps = new HashSet<>(Arrays.asList("STUDENT_MANAGEMENT", "ATTENDANCE", "EXAMINATION", "FINANCE"));
        UpdateOrganizationApplicationsRequest request = new UpdateOrganizationApplicationsRequest(newApps);

        OrganizationResponse expectedResponse = OrganizationResponse.builder()
                .id(10L)
                .name("Greenwood High International")
                .slug("greenwood")
                .planName("ENTERPRISE")
                .status(OrganizationStatus.ACTIVE)
                .enabledApplications(newApps)
                .build();

        when(organizationMapper.toResponse(any(Organization.class), eq("ENTERPRISE"))).thenReturn(expectedResponse);

        OrganizationResponse response = platformService.updateOrganizationApplications(10L, request);

        assertNotNull(response);
        assertEquals(10L, response.getId());
        assertEquals(4, response.getEnabledApplications().size());
        assertTrue(response.getEnabledApplications().contains("ATTENDANCE"));
        assertTrue(response.getEnabledApplications().contains("EXAMINATION"));
        assertTrue(response.getEnabledApplications().contains("FINANCE"));

        verify(organizationRepository, times(1)).save(testOrg);
        assertEquals(newApps, testOrg.getEnabledApplications());
    }

    @Test
    @DisplayName("Platform Super Admin: Updating non-existent organization throws ResourceNotFoundException")
    void testUpdateOrganizationApplications_NotFound() {
        when(organizationRepository.findById(999L)).thenReturn(Optional.empty());

        UpdateOrganizationApplicationsRequest request = new UpdateOrganizationApplicationsRequest(
                new HashSet<>(Collections.singletonList("STUDENT_MANAGEMENT"))
        );

        assertThrows(ResourceNotFoundException.class, () ->
                platformService.updateOrganizationApplications(999L, request)
        );

        verify(organizationRepository, never()).save(any());
    }

    @Test
    @DisplayName("Catalog Directory: Returns all available modules and strictly excludes PLATFORM_CONTROL")
    void testGetApplicationCatalog_ExcludesPlatformControl() {
        List<ApplicationModuleCatalogDto> catalog = platformService.getApplicationCatalog();

        assertNotNull(catalog);
        assertEquals(5, catalog.size(), "Catalog should contain exactly 5 tenant-operable modules");

        // Verify PLATFORM_CONTROL is never offered to school tenants
        boolean hasPlatformControl = catalog.stream().anyMatch(m -> "PLATFORM_CONTROL".equals(m.getCode()));
        assertFalse(hasPlatformControl, "PLATFORM_CONTROL must never be in tenant application catalog");

        // Verify core modules exist
        Set<String> codes = new HashSet<>();
        catalog.forEach(m -> codes.add(m.getCode()));
        assertTrue(codes.contains("STUDENT_MANAGEMENT"));
        assertTrue(codes.contains("IAM_GOVERNANCE"));
        assertTrue(codes.contains("ATTENDANCE"));
        assertTrue(codes.contains("EXAMINATION"));
        assertTrue(codes.contains("FINANCE"));
    }
}
