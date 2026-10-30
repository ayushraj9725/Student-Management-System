'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PlatformDashboard from '../../components/platform/PlatformDashboard';
import AuthPage from '../../components/AuthPage';
import { authService } from '../../services/authService';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';

export default function PlatformAdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [message, setMessage] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);
    setIsHydrated(true);
  }, []);

  const showToast = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleLogout = async () => {
    await authService.logout();
    setCurrentUser(null);
    router.push('/');
  };

  if (!isHydrated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' }}>
        <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>
          Loading Platform Control Panel...
        </div>
      </div>
    );
  }

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

  const isSuperAdmin = Boolean(
    currentUser?.isSuperAdmin ||
    currentUser?.role === 'PLATFORM_SUPER_ADMIN' ||
    currentUser?.username === 'superadmin'
  );

  if (!isSuperAdmin) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: 24 }}>
        <div style={{ maxWidth: 480, textAlign: 'center', background: '#ffffff', padding: 32, borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <ShieldAlert size={42} color="#dc2626" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Restricted Platform Scope</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 20 }}>
            Platform Control Panel is restricted to Platform Super Administrators. Your active account ({currentUser.username}) does not hold platform governance rights.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <Link href="/" className="btn-executive-secondary" style={{ padding: '8px 16px', borderRadius: 8, textDecoration: 'none' }}>
              Return to Home
            </Link>
            <button type="button" onClick={handleLogout} className="btn-executive-primary" style={{ padding: '8px 16px', borderRadius: 8 }}>
              Sign In as Superadmin
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
          {/* Left: Back to Home + Brand */}
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
                · Platform Control Panel
              </span>
            </div>
          </div>

          {/* Right: Super admin scope badge & User profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
              <ShieldAlert size={14} />
              <span>Platform Super Admin</span>
            </div>

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
      {message && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            padding: '12px 20px',
            borderRadius: '12px',
            backgroundColor: message.type === 'error' ? '#ef4444' : '#10b981',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '0.88rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
          }}
        >
          {message.text}
        </div>
      )}

      {/* Main Platform Control Plane */}
      <main style={{ maxWidth: '1280px', width: '100%', margin: '0 auto', padding: '28px 24px', flex: 1 }}>
        <PlatformDashboard showToast={showToast} />
      </main>
    </div>
  );
}
