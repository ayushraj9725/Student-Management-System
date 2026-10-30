'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import IamDashboard from '../../../components/iam/IamDashboard';
import AuthPage from '../../../components/AuthPage';
import { platformService } from '../../../services/platformService';
import { authService } from '../../../services/authService';
import { setActiveTenantId, setActiveTenantSlug } from '../../../services/apiClient';
import {
  School,
  ShieldCheck,
  AlertCircle,
  RotateCw,
  ArrowLeft,
  LogOut,
  Building2,
  Lock,
  AlertTriangle
} from 'lucide-react';

export default function SchoolHeadAdminPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug;

  const [currentUser, setCurrentUser] = useState(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);
    setIsHydrated(true);

    if (!user) {
      setLoading(false);
      return;
    }

    if (!slug) return;

    const isSuper = Boolean(
      user.isSuperAdmin ||
      user.role === 'PLATFORM_SUPER_ADMIN' ||
      user.username === 'superadmin'
    );

    // Prevent cross-tenant data loading and token pollution
    if (!isSuper && user.organizationSlug && user.organizationSlug !== slug) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    async function loadSchoolContext() {
      setLoading(true);
      setError('');
      try {
        const org = await platformService.getOrganizationBySlug(slug);
        if (isMounted) {
          setOrganization(org);
          setActiveTenantId(org.id);
          setActiveTenantSlug(org.slug);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || `Unable to load school with slug "${slug}".`);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadSchoolContext();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  const handleLogout = async () => {
    await authService.logout();
    setCurrentUser(null);
    router.push('/');
  };

  // 1. Loading hydration barrier
  if (!isHydrated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <RotateCw size={28} color="#0284c7" className="spin" />
          <div style={{ fontSize: '0.88rem', color: '#64748b', fontWeight: 500 }}>
            Verifying administrator session...
          </div>
        </div>
      </div>
    );
  }

  // 2. Strict Authentication Guard: Force Login if unauthenticated
  if (!currentUser) {
    return (
      <AuthPage
        onLoginSuccess={(auth) => {
          setCurrentUser(auth);
          showToast(`Authenticated as ${auth.fullName || auth.username}`, 'success');
        }}
      />
    );
  }

  // 3. Authorization Guard: Verify Administrative Authority
  const isSuperAdmin = Boolean(
    currentUser?.isSuperAdmin ||
    currentUser?.role === 'PLATFORM_SUPER_ADMIN' ||
    currentUser?.username === 'superadmin'
  );

  const isAuthorizedAdmin = isSuperAdmin || Boolean(
    currentUser?.role === 'SCHOOL_ADMIN' ||
    currentUser?.role === 'HEAD_MASTER' ||
    currentUser?.role === 'ADMIN' ||
    currentUser?.username === 'admin'
  );

  if (!isAuthorizedAdmin) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: 24 }}>
        <div style={{ maxWidth: 480, textAlign: 'center', background: '#ffffff', padding: 32, borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Lock size={28} color="#e11d48" />
          </div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
            Administrator Privileges Required
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 20, lineHeight: 1.5 }}>
            You are signed in as <strong>{currentUser.username}</strong> ({currentUser.role || 'Staff Member'}), but your account does not hold administrative governance rights for this school workspace.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <Link href="/" className="btn-executive-secondary" style={{ padding: '8px 16px', borderRadius: 8, textDecoration: 'none' }}>
              Return to Home
            </Link>
            <button type="button" onClick={handleLogout} className="btn-executive-primary" style={{ padding: '8px 16px', borderRadius: 8 }}>
              Sign In with Another Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Strict Multi-Tenant Isolation Guard: Prevent Cross-Tenant Viewing / Data Leaks
  const isCrossTenant = !isSuperAdmin && Boolean(currentUser?.organizationSlug) && currentUser.organizationSlug !== slug;
  if (isCrossTenant) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: 24 }}>
        <div style={{ maxWidth: 520, textAlign: 'center', background: '#ffffff', padding: 36, borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', backgroundColor: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <ShieldCheck size={32} color="#e11d48" />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>
            Strict Tenant Isolation Guard
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: 16, lineHeight: 1.6 }}>
            You are authenticated as administrator for <strong>{currentUser.organizationName || currentUser.organizationSlug}</strong>, but are attempting to access the workspace of <strong>{slug}</strong>.
          </p>
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 8, padding: '12px 16px', marginBottom: 24, fontSize: '0.82rem', color: '#991b1b', textAlign: 'left', lineHeight: 1.5 }}>
            <strong>Enterprise Multi-Tenant Boundary:</strong> Cross-institutional administrative data viewing, role inspection, and staff management are strictly restricted at both the cryptographic token layer and API gateway.
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Link
              href={`/${currentUser.organizationSlug}/admin`}
              className="btn-executive-primary"
              style={{ padding: '10px 20px', borderRadius: 8, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <span>Go to {currentUser.organizationName || 'My School'} Admin</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="btn-executive-secondary"
              style={{ padding: '10px 16px', borderRadius: 8 }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <header
        style={{
          background: 'linear-gradient(90deg, #e0f2fe 0%, #eff6ff 25%, #ffffff 50%, #fdf2f8 75%, #fce7f3 100%)',
          borderBottom: '1px solid #cbd5e1',
          boxShadow: '0 2px 10px -2px rgba(2, 132, 199, 0.08), 0 4px 12px -4px rgba(219, 39, 119, 0.06)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        {/* 3px Vibrant Gradient Accent Bar at Top */}
        <div
          style={{
            height: '3px',
            width: '100%',
            background: 'linear-gradient(90deg, #0284c7 0%, #38bdf8 35%, #f472b6 65%, #db2777 100%)',
          }}
        />
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Left: Back button + Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: '8px',
                backgroundColor: '#f1f5f9',
                color: '#334155',
                fontSize: '0.85rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <ArrowLeft size={16} />
              <span>Back to Home</span>
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img
                src="/logo.png"
                alt="My School Care"
                style={{ width: '32px', height: '32px', objectFit: 'contain' }}
              />
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                My School Care
              </span>
              <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                · Identity & Access Management
              </span>
            </div>
          </div>

          {/* Right: Tenant badge & User profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {organization && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#e0f2fe',
                  color: '#0284c7',
                  padding: '5px 12px',
                  borderRadius: '9999px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                <School size={14} />
                <span>{organization.name}</span>
              </div>
            )}

            {currentUser && (
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'none',
                    border: '1px solid #e2e8f0',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    cursor: 'pointer',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    {currentUser.username ? currentUser.username.substring(0, 1).toUpperCase() : 'U'}
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a' }}>
                    {currentUser.username}
                  </span>
                </button>

                {isProfileOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '42px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                      width: '200px',
                      padding: '8px',
                      zIndex: 50,
                    }}
                  >
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                        {currentUser.fullName || currentUser.username}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {currentUser.role}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        border: 'none',
                        background: 'none',
                        color: '#ef4444',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        borderRadius: '6px',
                        marginTop: '4px',
                      }}
                    >
                      <LogOut size={14} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            padding: '12px 20px',
            borderRadius: '12px',
            backgroundColor: toastMessage.type === 'error' ? '#ef4444' : '#10b981',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '0.88rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
          }}
        >
          {toastMessage.text}
        </div>
      )}

      {/* Main Content Area */}
      <main style={{ maxWidth: '1280px', width: '100%', margin: '0 auto', padding: '28px 24px', flex: 1 }}>
        {loading ? (
          <div style={{ margin: '80px auto', textAlign: 'center', color: '#64748b' }}>
            <RotateCw size={28} className="spin" style={{ margin: '0 auto 12px' }} />
            <div>Resolving institutional tenant "{slug}"...</div>
          </div>
        ) : error ? (
          <div
            style={{
              maxWidth: '560px',
              margin: '60px auto',
              padding: '32px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              textAlign: 'center',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#fce7f3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <AlertCircle size={24} color="#db2777" />
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
              Institution Not Found or Inactive
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '20px' }}>
              {error}
            </p>
            <Link
              href="/"
              className="btn-executive-primary"
              style={{ display: 'inline-flex', textDecoration: 'none' }}
            >
              Return to Home Dashboard
            </Link>
          </div>
        ) : (
          <>
            {organization?.status === 'SUSPENDED' && (
              <div
                style={{
                  marginBottom: '24px',
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
                      IAM Governance in Read-Only Mode
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
                      SUSPENDED
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#be123c', lineHeight: 1.4 }}>
                    {organization.name} is currently suspended by platform administration. You can inspect roles, groups, staff rosters, and permissions, but role modifications and staff approvals are restricted.
                  </p>
                </div>
              </div>
            )}
            <IamDashboard showToast={showToast} organization={organization} />
          </>
        )}
      </main>
    </div>
  );
}
