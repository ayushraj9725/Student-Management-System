'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldCheck,
  BookOpen,
  Users,
  Sliders,
  LogOut,
  Search,
  Bell,
  Building2,
  ChevronDown,
  Menu,
  X,
  User as UserIcon,
  BarChart3,
  Sparkles
} from 'lucide-react';
import { authService } from '../../services/authService';
import { platformService } from '../../services/platformService';
import {
  getActiveTenantId,
  setActiveTenantId,
  getActiveTenantSlug,
  setActiveTenantSlug
} from '../../services/apiClient';

export default function AppShell({ children, currentTab, onTabChange }) {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState(getActiveTenantId() || 1);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setCurrentUser(authService.getCurrentUser());

    platformService.getAllOrganizations()
      .then((orgs) => {
        if (Array.isArray(orgs)) {
          setOrganizations(orgs);
          const current = getActiveTenantId();
          if (!current && orgs.length > 0) {
            setSelectedTenantId(orgs[0].id);
            setActiveTenantId(orgs[0].id);
            setActiveTenantSlug(orgs[0].slug);
          }
        }
      })
      .catch(() => {
        // Fallback gracefully
      });
  }, []);

  const currentOrg = organizations.find((o) => o.id === selectedTenantId) || organizations[0];

  const handleTenantChange = (e) => {
    const id = parseInt(e.target.value, 10);
    const org = organizations.find((o) => o.id === id);
    setSelectedTenantId(id);
    setActiveTenantId(id);
    if (org) {
      setActiveTenantSlug(org.slug);
      if (typeof window !== 'undefined' && window.location.pathname.endsWith('/admin')) {
        window.location.href = `/${org.slug}/admin`;
        return;
      }
    }
    window.location.reload();
  };

  const handleLogout = async () => {
    await authService.logout();
    setCurrentUser(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  // Determine active route/tab
  const isPlatformActive = pathname === '/platform' || currentTab === 'platform';
  const isIamActive = (pathname && pathname.includes('/admin')) || currentTab === 'iam';
  const isStudentsActive = (!isPlatformActive && !isIamActive) || currentTab === 'students';

  return (
    <div className="app-shell-layout">
      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(4px)',
            zIndex: 45,
          }}
        />
      )}

      {/* Modern Left Sidebar (MeloSalon / FinTrack Layout) */}
      <aside className={`app-shell-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-brand-box">
          <div className="sidebar-logo-icon">
            <ShieldCheck size={22} strokeWidth={2.5} />
          </div>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', display: 'block', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              My Edu Care
            </span>
            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 500 }}>
              Institutional SaaS
            </span>
          </div>
          {isMobileMenuOpen && (
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              style={{ background: 'none', border: 'none', color: '#64748b', marginLeft: 'auto', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Sidebar Nav Links */}
        <div className="sidebar-nav-scroll">
          {/* Main Navigation Group */}
          <div>
            <div className="sidebar-section-title">Main</div>
            <div className="sidebar-nav-list">
              <Link
                href="/"
                onClick={() => {
                  if (onTabChange) onTabChange('students');
                  setIsMobileMenuOpen(false);
                }}
                className={`sidebar-nav-pill ${isStudentsActive ? 'active' : ''}`}
              >
                <BookOpen size={18} />
                <span>Staff Workspace</span>
              </Link>
            </div>
          </div>

          {/* Governance & Control Group */}
          <div>
            <div className="sidebar-section-title">Governance & IAM</div>
            <div className="sidebar-nav-list">
              <Link
                href={currentOrg?.slug ? `/${currentOrg.slug}/admin` : '/admin'}
                onClick={() => {
                  if (onTabChange) onTabChange('iam');
                  setIsMobileMenuOpen(false);
                }}
                className={`sidebar-nav-pill ${isIamActive ? 'active' : ''}`}
              >
                <Users size={18} />
                <span>School Head Admin</span>
              </Link>

              <Link
                href="/platform"
                onClick={() => {
                  if (onTabChange) onTabChange('platform');
                  setIsMobileMenuOpen(false);
                }}
                className={`sidebar-nav-pill ${isPlatformActive ? 'active' : ''}`}
              >
                <Sliders size={18} />
                <span>Platform Control</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Sidebar Bottom User & Logout Card */}
        {currentUser && (
          <div
            style={{
              padding: '14px',
              borderTop: '1px solid #f1f5f9',
              backgroundColor: '#fafbfd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #e0f2fe 0%, #fce7f3 100%)',
                  color: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  border: '1px solid rgba(2, 132, 199, 0.2)',
                  flexShrink: 0,
                }}
              >
                {currentUser.username ? currentUser.username.substring(0, 2).toUpperCase() : 'ME'}
              </div>
              <div style={{ minWidth: 0 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentUser.fullName || currentUser.username}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>
                  {currentUser.role}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </aside>

      {/* Main App Content Canvas */}
      <div className="app-shell-canvas">
        {/* Modern Topbar */}
        <header className="app-shell-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              style={{
                display: 'none',
                background: 'none',
                border: 'none',
                color: '#334155',
                cursor: 'pointer',
                padding: '4px',
              }}
              className="mobile-hamburger-btn"
            >
              <Menu size={22} />
            </button>

            {/* Global Search Bar (Sample Benchmark) */}
            <div className="topbar-search-box">
              <Search size={16} color="#94a3b8" />
              <input
                type="text"
                className="topbar-search-input"
                placeholder="Search students, staff, departments..."
                aria-label="Search"
              />
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="topbar-actions-group">
            {/* Active School Tenant Context Pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 'var(--radius-pill)',
                padding: '6px 14px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <Building2 size={15} color="#0284c7" />
              <select
                value={selectedTenantId}
                onChange={handleTenantChange}
                aria-label="Active School Tenant Context"
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#0f172a',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {organizations.length > 0 ? (
                  organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.slug})
                    </option>
                  ))
                ) : (
                  <option value="">No Active Organization</option>
                )}
              </select>
              <ChevronDown size={14} color="#94a3b8" />
            </div>

            {/* Notification Bell with indicator */}
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                position: 'relative',
                cursor: 'pointer',
              }}
              title="System Alerts"
            >
              <Bell size={17} />
              <span
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: '#0284c7',
                }}
              />
            </div>

            {/* User Pill */}
            {currentUser && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-pill)',
                  padding: '4px 12px 4px 6px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #e0f2fe 0%, #fce7f3 100%)',
                    color: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                  }}
                >
                  {currentUser.username ? currentUser.username.substring(0, 1).toUpperCase() : 'U'}
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a' }}>
                  {currentUser.username}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Content Canvas */}
        <main style={{ flex: 1, padding: '24px 28px', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
