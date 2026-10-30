import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Users,
  BookOpen,
  Building2,
  ChevronDown,
} from 'lucide-react';
import { platformService } from '../../services/platformService';
import {
  getActiveTenantId,
  setActiveTenantId,
  getActiveTenantSlug,
  setActiveTenantSlug,
} from '../../services/apiClient';

/**
 * Reusable Executive Navbar adhering to strict White, Light Blue, and Light Pink palette.
 * Strictly uses Lucide icons and zero emojis.
 * Supports Persona navigation (Platform vs School Member) and live multi-tenant school switcher.
 */
import { LogOut, User as UserIcon } from 'lucide-react';
import { authService } from '../../services/authService';

export default function ExecutiveNavbar({ activeTab, onTabChange }) {
  const [organizations, setOrganizations] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState(getActiveTenantId() || 1);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    setCurrentUser(authService.getCurrentUser());

    // Fetch registered schools to populate tenant switcher
    platformService
      .getAllOrganizations()
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
        // Fallback gracefully if backend is loading
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

  return (
    <header className="executive-navbar">
      {/* Brand & Title */}
      <div className="executive-brand">
        <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <span style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-dark)', letterSpacing: '-0.01em', display: 'block' }}>
            My Edu Care
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', fontWeight: 400 }}>
            Institutional Portal
          </span>
        </Link>
      </div>

      {/* Persona Navigation Tabs (Platform vs School Head IAM vs Staff/Student Workspace) */}
      <nav className="executive-nav-links">
        <Link
          href="/"
          className={`executive-nav-btn ${activeTab === 'students' ? 'active' : ''}`}
          style={{ textDecoration: 'none' }}
        >
          <BookOpen size={16} />
          <span>Staff Workspace</span>
        </Link>

        <Link
          href={currentOrg?.slug ? `/${currentOrg.slug}/admin` : '/admin'}
          className={`executive-nav-btn ${activeTab === 'iam' ? 'active' : ''}`}
          style={{ textDecoration: 'none' }}
        >
          <Users size={16} />
          <span>School Head Admin</span>
        </Link>

        <Link
          href="/platform"
          className={`executive-nav-btn ${activeTab === 'platform' ? 'active' : ''}`}
          style={{ textDecoration: 'none' }}
        >
          <ShieldCheck size={16} />
          <span>Platform Admin</span>
        </Link>
      </nav>

      {/* Right Controls: Tenant Switcher + User Profile Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Tenant Context Pill Selector */}
        <div className="tenant-context-pill">
          <Building2 size={15} />
          <select
            className="tenant-context-select"
            value={selectedTenantId}
            onChange={handleTenantChange}
            aria-label="Active School Tenant Context"
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
          <ChevronDown size={14} style={{ opacity: 0.7 }} />
        </div>

        {currentUser ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: '0.3rem 0.65rem 0.3rem 0.5rem',
              fontSize: '0.8rem',
            }}
          >
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: '#e0f2fe',
                color: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserIcon size={14} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 600, color: '#0f172a', lineHeight: 1.1 }}>
                {currentUser.username}
              </span>
              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                {currentUser.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '2px',
                marginLeft: '4px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <Link
            href="/"
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '8px',
              background: '#0284c7',
              color: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
