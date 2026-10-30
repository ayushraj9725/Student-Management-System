'use client';

import React from 'react';
import Link from 'next/link';
import { School, CreditCard, ShieldCheck, UserPlus, BarChart3 } from 'lucide-react';

export default function QuickActions({ isSuperAdmin, canAccessIam, activeTenantSlug, onShowToast, isSuspended = false }) {
  return (
    <section style={{ marginBottom: '36px' }}>
      <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '14px' }}>
        Quick Actions
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
        }}
      >
        {isSuperAdmin ? (
          <>
            {/* Super Admin Action 1: Onboard School */}
            <Link
              href="/platform"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                padding: '12px 18px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.86rem',
                textDecoration: 'none',
                border: '1px solid #e2e8f0',
                transition: 'all 0.15s ease',
              }}
              className="quick-action-btn"
              title="Open Platform Onboarding"
            >
              <School size={16} color="#0284c7" />
              <span>Onboard School</span>
            </Link>

            {/* Super Admin Action 2: Subscription Plans */}
            <Link
              href="/platform"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                padding: '12px 18px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.86rem',
                textDecoration: 'none',
                border: '1px solid #e2e8f0',
                transition: 'all 0.15s ease',
              }}
              className="quick-action-btn"
              title="Manage Platform Subscriptions"
            >
              <CreditCard size={16} color="#7c3aed" />
              <span>Subscription Plans</span>
            </Link>

            {/* Super Admin Action 3: View Platform Reports */}
            <button
              type="button"
              onClick={() => onShowToast('Platform telemetry and analytics report is in preparation.')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                padding: '12px 18px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.86rem',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              className="quick-action-btn"
              title="Platform Telemetry Reports"
            >
              <BarChart3 size={16} color="#64748b" />
              <span>Platform Reports</span>
            </button>
          </>
        ) : (
          <>
            {/* School User Action 1: Enroll Student */}
            <Link
              href="/students"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                padding: '12px 18px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.86rem',
                textDecoration: 'none',
                border: '1px solid #e2e8f0',
                transition: 'all 0.15s ease',
              }}
              className="quick-action-btn"
              title={isSuspended ? 'View student records (Enrollment disabled - School suspended)' : 'Enroll New Student'}
            >
              <UserPlus size={16} color={isSuspended ? '#94a3b8' : '#0284c7'} />
              <span>{isSuspended ? 'Students (Read-Only)' : 'Enroll Student'}</span>
            </Link>

            {/* School User Action 2: Manage Access (IAM Governance) */}
            {canAccessIam && (
              <Link
                href={`/${activeTenantSlug}/admin`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  padding: '12px 18px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.86rem',
                  textDecoration: 'none',
                  border: '1px solid #e2e8f0',
                  transition: 'all 0.15s ease',
                }}
                className="quick-action-btn"
                title="Open Identity & Access Management"
              >
                <ShieldCheck size={16} color="#059669" />
                <span>Manage Access</span>
              </Link>
            )}

            {/* School User Action 3: View Reports */}
            <button
              type="button"
              onClick={() => onShowToast('Institutional Reports & Analytics module is in development.')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                padding: '12px 18px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.86rem',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              className="quick-action-btn"
              title="Institutional Reports"
            >
              <BarChart3 size={16} color="#64748b" />
              <span>View Reports</span>
            </button>
          </>
        )}
      </div>
    </section>
  );
}
