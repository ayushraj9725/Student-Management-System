'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Bell, HelpCircle, LogOut, Eye, ChevronDown, User, ShieldCheck } from 'lucide-react';

export default function HomeHeader({ user, onLogout, onShowToast }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const displayName = user?.fullName || user?.username || 'Ayush';
  const roleLabel = user?.role === 'PLATFORM_SUPER_ADMIN'
    ? 'Super Admin'
    : user?.role === 'SCHOOL_ADMIN'
    ? 'School Admin'
    : user?.role || 'Staff';

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        width: '100%',
        /* Rich, Aesthetic Light Blue to Light Pink Executive Palette */
        background: 'linear-gradient(90deg, #e0f2fe 0%, #eff6ff 25%, #ffffff 50%, #fdf2f8 75%, #fce7f3 100%)',
        borderBottom: '1px solid #cbd5e1',
        boxShadow: '0 2px 10px -2px rgba(2, 132, 199, 0.08), 0 4px 12px -4px rgba(219, 39, 119, 0.06)',
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
          width: '100%',
          maxWidth: '1440px',
          margin: '0 auto',
          padding: '12px clamp(16px, 3vw, 48px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        {/* Left: ONLY Logo & Brand Name (Minimalist, No subtitles or extra badges) */}
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <img
            src="/logo.png"
            alt="My School Care Logo"
            style={{
              width: '32px',
              height: '32px',
              objectFit: 'contain',
            }}
          />
          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            My School Care
          </span>
        </Link>

        {/* Right: Clean, Uncluttered Controls (No Search, No text titles on icons) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Notifications Icon Button */}
          <button
            type="button"
            onClick={() => onShowToast('System alerts: All systems running normally')}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              border: '1.5px solid #fbcfe8',
              color: '#db2777',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              boxShadow: '0 2px 5px rgba(219, 39, 119, 0.12)',
              transition: 'all 0.15s ease',
            }}
            className="navbar-pill-btn"
            title="System Alerts"
            aria-label="Alerts"
          >
            <Bell size={17} strokeWidth={2.2} />
            <span
              style={{
                position: 'absolute',
                top: '7px',
                right: '7px',
                width: '6px',
                height: '6px',
                backgroundColor: '#db2777',
                borderRadius: '50%',
              }}
            />
          </button>

          {/* Help Icon Button */}
          <button
            type="button"
            onClick={() => onShowToast('Help Center: support@myschoolcare.local')}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              border: '1.5px solid #bae6fd',
              color: '#0284c7',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 5px rgba(2, 132, 199, 0.12)',
              transition: 'all 0.15s ease',
            }}
            className="navbar-pill-btn"
            title="Help & Support"
            aria-label="Help"
          >
            <HelpCircle size={17} strokeWidth={2.2} />
          </button>

          {/* User Profile Button (Clean, Simple Men User Icon) */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                border: '1.5px solid #bae6fd',
                color: '#0284c7',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 5px rgba(2, 132, 199, 0.12)',
                transition: 'all 0.15s ease',
              }}
              className="navbar-pill-btn"
              title="User Details & Settings"
              aria-label="User Profile"
            >
              <User size={18} strokeWidth={2.2} />
            </button>

            {/* User Details Dropdown Modal */}
            {isProfileOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '46px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.08)',
                  width: '240px',
                  padding: '10px',
                  zIndex: 50,
                }}
              >
                <div style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #0284c7 0%, #db2777 100%)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                      }}
                    >
                      {displayName.substring(0, 1).toUpperCase()}
                    </div>
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>
                      {displayName}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                    {user?.email || `${user?.username}@myschoolcare.local`}
                  </div>

                  <div
                    style={{
                      display: 'inline-block',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: '#db2777',
                      backgroundColor: '#fce7f3',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      marginTop: '6px',
                    }}
                  >
                    {roleLabel}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    onLogout();
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 12px',
                    border: 'none',
                    background: 'none',
                    color: '#ef4444',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    borderRadius: '8px',
                    transition: 'background-color 0.15s ease',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
