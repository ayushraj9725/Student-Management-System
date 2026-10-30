'use client';

import React, { useState, useEffect } from 'react';
import HomeHeader from './HomeHeader';
import QuickActions from './QuickActions';
import ApplicationCard from './ApplicationCard';
import AboutSection from './AboutSection';
import HomeFooter from './HomeFooter';
import AuthPage from '../AuthPage';
import { authService } from '../../services/authService';
import { platformService } from '../../services/platformService';
import { applicationService } from '../../services/applicationService';
import { getActiveTenantSlug, setActiveTenantId, setActiveTenantSlug, clearTenantContext } from '../../services/apiClient';
import {
  Building2,
  Users,
  GraduationCap,
  Calendar,
  Award,
  CreditCard,
  AlertTriangle
} from 'lucide-react';

export default function HomeDashboard() {
  const [user, setUser] = useState(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeOrg, setActiveOrg] = useState(null);
  const [entitlements, setEntitlements] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationMsg, setNotificationMsg] = useState(null);

  const fetchEntitlements = (slug) => {
    const params = slug ? { orgSlug: slug } : {};
    applicationService.getUserEntitlements(params)
      .then((res) => {
        if (res && res.applications) {
          setEntitlements(res);
        }
      })
      .catch((err) => {
        // High stability fallback: console warning only, UI never breaks
        console.debug('Dynamic entitlement resolution falling back to local credentials:', err?.message);
      });
  };

  const loadUserContext = (currentUser) => {
    if (!currentUser) return;
    const isSuper = Boolean(
      currentUser.isSuperAdmin ||
      currentUser.role === 'PLATFORM_SUPER_ADMIN' ||
      currentUser.username === 'superadmin'
    );

    if (isSuper) {
      // Platform Super Admin is global root: NO tenant headers, NO school API calls
      clearTenantContext();
      setActiveOrg(null);
      fetchEntitlements(null);
    } else {
      // School user: load assigned school tenant context
      const slug = currentUser.organizationSlug || getActiveTenantSlug();
      if (slug) {
        fetchEntitlements(slug);
        platformService.getOrganizationBySlug(slug)
          .then((org) => {
            if (org) {
              setActiveOrg(org);
              setActiveTenantId(org.id);
              setActiveTenantSlug(org.slug);
            }
          })
          .catch(() => {
            if (currentUser.organizationName) {
              setActiveOrg({ name: currentUser.organizationName, slug: currentUser.organizationSlug, id: currentUser.organizationId });
            }
          });
      } else {
        fetchEntitlements(null);
      }
    }
  };

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    setIsHydrated(true);

    if (currentUser) {
      loadUserContext(currentUser);
    }
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
  };

  const showToast = (text) => {
    setNotificationMsg(text);
    setTimeout(() => setNotificationMsg(null), 3500);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getUserDisplayName = () => {
    if (!user) return '';
    if (user.username === 'superadmin') return 'Ayush';
    if (user.fullName && !user.fullName.toLowerCase().includes('platform')) {
      return user.fullName.split(' ')[0];
    }
    if (user.username && user.username !== 'superadmin') {
      return user.username;
    }
    return 'Ayush';
  };

  if (!isHydrated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' }}>
        <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>
          Loading My School Care workspace...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthPage
        onLoginSuccess={(auth) => {
          setUser(auth);
          loadUserContext(auth);
        }}
      />
    );
  }

  const isSuperAdmin = Boolean(
    user?.isSuperAdmin ||
    user?.role === 'PLATFORM_SUPER_ADMIN' ||
    user?.username === 'superadmin'
  );

  const canAccessIam = Boolean(
    isSuperAdmin ||
    user?.role === 'SCHOOL_ADMIN' ||
    user?.role === 'HEAD_MASTER' ||
    user?.username === 'admin'
  );

  const activeTenantSlug = isSuperAdmin
    ? null
    : (activeOrg?.slug || user?.organizationSlug || getActiveTenantSlug() || '');
  const workspaceTitle = isSuperAdmin
    ? 'Platform Administration'
    : (activeOrg?.name || user?.organizationName || 'Institutional Workspace');

  const applications = [
    {
      id: 'app-platform',
      code: 'PLATFORM_CONTROL',
      title: 'Platform Control Panel',
      description: 'Onboard schools, manage tenants and subscription plans.',
      icon: Building2,
      iconColor: '#2563eb',
      route: '/platform',
      isAuthorized: isSuperAdmin,
      isAvailable: true,
      category: 'Platform',
    },
    {
      id: 'app-iam',
      code: 'IAM_GOVERNANCE',
      title: 'Identity & Access (IAM)',
      description: 'Manage institutional roles, permissions, staff groups and access visibility.',
      icon: Users,
      iconColor: '#059669',
      route: `/${activeTenantSlug}/admin`,
      isAuthorized: canAccessIam,
      isAvailable: true,
      category: 'Governance',
    },
    {
      id: 'app-students',
      code: 'STUDENT_MANAGEMENT',
      title: 'Staff & Student Records',
      description: 'Enrolled student records, course directories and curriculum semester assignments.',
      icon: GraduationCap,
      iconColor: '#4f46e5',
      route: '/students',
      isAuthorized: true,
      isAvailable: true,
      category: 'Academics',
    },
    {
      id: 'app-attendance',
      code: 'ATTENDANCE',
      title: 'Attendance Management',
      description: 'Daily student roll call, staff biometric tracking and leave management.',
      icon: Calendar,
      iconColor: '#9333ea',
      route: null,
      isAuthorized: true,
      isAvailable: false,
      comingSoon: true,
      category: 'Operations',
    },
    {
      id: 'app-examination',
      code: 'EXAMINATION',
      title: 'Examination & Results',
      description: 'Exam scheduling, term grade books, marks moderation and report cards.',
      icon: Award,
      iconColor: '#ea580c',
      route: null,
      isAuthorized: true,
      isAvailable: false,
      comingSoon: true,
      category: 'Academics',
    },
    {
      id: 'app-finance',
      code: 'FINANCE',
      title: 'Fee & Finance Management',
      description: 'Tuition invoices, fee structure collection, concessions and accounting ledgers.',
      icon: CreditCard,
      iconColor: '#0d9488',
      route: null,
      isAuthorized: true,
      isAvailable: false,
      comingSoon: true,
      category: 'Finance',
    },
  ];

  // Enforce attribute-based and role-based visibility with fail-safe fallback
  const visibleApplications = applications.filter((app) => {
    // 1. Search Query Filter (if active)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      if (!app.title.toLowerCase().includes(query) && !app.description.toLowerCase().includes(query)) {
        return false;
      }
    }

    // 2. Dynamic Server Entitlements Resolution (Attribute-Based & Role-Based Control)
    if (entitlements && Array.isArray(entitlements.applications) && entitlements.applications.length > 0) {
      const matched = entitlements.applications.find(
        (a) => a.code === app.code || a.id === app.id
      );
      if (matched) {
        return Boolean(matched.isAuthorized);
      }
    }

    // 3. Fallback: Role-based client-side policy (Ensures high availability and zero user-facing errors)
    if (isSuperAdmin) {
      return app.category === 'Platform';
    }

    // School Users never see platform administration
    if (app.id === 'app-platform' || app.code === 'PLATFORM_CONTROL') return false;

    // School IAM governance is restricted to authorized heads/admins
    if ((app.id === 'app-iam' || app.code === 'IAM_GOVERNANCE') && !canAccessIam) return false;

    // Fast-path: Check user.authorizedApplications stored in login token response
    if (user?.authorizedApplications && Array.isArray(user.authorizedApplications)) {
      if (app.code && !user.authorizedApplications.includes(app.code)) {
        return false;
      }
    }

    return true;
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', color: '#0f172a', display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Toast Notification */}
      {notificationMsg && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            padding: '12px 20px',
            borderRadius: '12px',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            fontWeight: 500,
            fontSize: '0.85rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
          }}
        >
          {notificationMsg}
        </div>
      )}

      {/* Top Header - Full desktop breadth */}
      <HomeHeader
        user={user}
        onLogout={handleLogout}
        onShowToast={showToast}
      />

      {/* Main Full-Width Responsive Container */}
      <main
        style={{
          width: '100%',
          maxWidth: '1440px',
          margin: '0 auto',
          padding: '36px clamp(16px, 3vw, 48px)',
          flex: 1,
        }}
      >
        {/* Welcome Section Banner - Aesthetic Light Pink with Light Corner Radius */}
        <section
          style={{
            marginBottom: '28px',
            background: 'linear-gradient(135deg, #fdf2f8 0%, #fff5f7 50%, #ffffff 100%)',
            border: '1px solid #fbcfe8',
            borderRadius: '10px',
            padding: '22px 26px',
            boxShadow: '0 2px 8px -2px rgba(219, 39, 119, 0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 'clamp(1.4rem, 2.2vw, 1.85rem)',
                fontWeight: 800,
                color: '#0f172a',
                marginBottom: '6px',
                letterSpacing: '-0.025em',
              }}
            >
              {getGreeting()}, {getUserDisplayName()}!
            </h1>
            <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
              Welcome to My School Care. Your connected school management workspace.
            </p>
          </div>

          {/* Active Workspace Badge - Light Corner */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#ffffff',
              border: '1px solid #fce7f3',
              padding: '6px 14px',
              borderRadius: '8px',
              boxShadow: '0 1px 2px rgba(219, 39, 119, 0.05)',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#db2777',
              }}
            />
            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
              Workspace:
            </span>
            <strong style={{ fontSize: '0.84rem', color: '#0f172a', fontWeight: 700 }}>
              {workspaceTitle}
            </strong>
          </div>
        </section>

        {/* Suspended Read-Only Warning Banner */}
        {activeOrg?.status === 'SUSPENDED' && (
          <div
            style={{
              marginBottom: '28px',
              padding: '14px 20px',
              borderRadius: '10px',
              backgroundColor: '#fff1f2',
              border: '1.5px solid #fecdd3',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              boxShadow: '0 2px 6px rgba(225, 29, 72, 0.05)',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#ffe4e6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={18} color="#e11d48" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <strong style={{ fontSize: '0.88rem', color: '#9f1239', fontWeight: 700 }}>
                  Institution Suspended (Read-Only Mode)
                </strong>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    backgroundColor: '#ffe4e6',
                    color: '#be123c',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    letterSpacing: '0.04em',
                  }}
                >
                  READ-ONLY
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#be123c', lineHeight: 1.4 }}>
                {activeOrg.name} has been suspended by platform administration. You can view all academic directories and reports, but creating new records or making edits is restricted.
              </p>
            </div>
          </div>
        )}

        {/* Quick Actions Section */}
        <QuickActions
          isSuperAdmin={isSuperAdmin}
          canAccessIam={canAccessIam}
          activeTenantSlug={activeTenantSlug}
          onShowToast={showToast}
          isSuspended={activeOrg?.status === 'SUSPENDED'}
        />

        {/* Application Directory Section */}
        <section style={{ marginBottom: '48px' }}>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: 'clamp(1.15rem, 1.8vw, 1.35rem)', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
              Your Applications
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#64748b' }}>
              Choose an application to continue.
            </p>
          </div>

          {/* Fully Responsive Grid: 3 columns on wide desktop, 2 on tablet, 1 on mobile */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '20px',
            }}
          >
            {visibleApplications.map((app) => (
              <ApplicationCard key={app.id} application={app} />
            ))}
          </div>
        </section>

        {/* About Section */}
        <AboutSection />
      </main>

      {/* Footer */}
      <HomeFooter />
    </div>
  );
}
