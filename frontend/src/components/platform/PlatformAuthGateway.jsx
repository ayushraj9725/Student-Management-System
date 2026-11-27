'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  User,
  ArrowRight,
  AlertTriangle,
  Server,
  ExternalLink
} from 'lucide-react';
import { authService } from '../../services/authService';

/**
 * Dedicated, hardened login gateway for Platform Super Administrators.
 * Enforces "PLATFORM" authScope to prevent institutional staff credential reuse.
 */
export default function PlatformAuthGateway({ onLoginSuccess }) {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!usernameOrEmail.trim() || !password) {
      setErrorMessage('Please provide both administrative identifier and master credentials.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      // Strictly enforce "PLATFORM" scope at authentication time
      const response = await authService.login({
        usernameOrEmail: usernameOrEmail.trim(),
        password,
        authScope: 'PLATFORM'
      });

      const isSuper = Boolean(
        response?.isSuperAdmin ||
        response?.role === 'PLATFORM_SUPER_ADMIN' ||
        response?.username === 'superadmin'
      );

      if (!isSuper) {
        await authService.logout();
        setErrorMessage('Access Denied: This account is not authorized for Platform Super Administrator operations.');
        return;
      }

      if (onLoginSuccess) {
        onLoginSuccess(response);
      }
    } catch (err) {
      console.error('Platform authentication failed:', err);
      const msg = err?.message || 'Authentication failed. Please verify credentials.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#090d16',
        backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(14, 165, 233, 0.15) 0%, transparent 60%), radial-gradient(circle at 80% 80%, rgba(217, 70, 239, 0.08) 0%, transparent 50%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 30px rgba(14, 165, 233, 0.1)',
          padding: '36px 32px'
        }}
      >
        {/* Security Badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(14, 165, 233, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '9999px',
              padding: '6px 14px',
              fontSize: '11px',
              fontWeight: 600,
              color: '#38bdf8',
              letterSpacing: '0.05em',
              textTransform: 'uppercase'
            }}
          >
            <ShieldCheck size={14} color="#38bdf8" />
            Isolated Operations Perimeter
          </div>
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color: '#f8fafc',
              marginBottom: '6px',
              letterSpacing: '-0.02em'
            }}
          >
            My School Care
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
            Platform Operations & Governance Gateway
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px'
            }}
          >
            <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '12px', color: '#fca5a5', lineHeight: '1.4' }}>
              {errorMessage}
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '18px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: '#cbd5e1',
                marginBottom: '6px'
              }}
            >
              Master Administrator Identifier
            </label>
            <div style={{ position: 'relative' }}>
              <User
                size={16}
                color="#64748b"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                placeholder="superadmin or ops@myschoolcare.internal"
                autoComplete="username"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '11px 12px 11px 38px',
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid rgba(100, 116, 139, 0.3)',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '13px',
                  outline: 'none',
                  transition: 'border-color 0.15s ease'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: '#cbd5e1',
                marginBottom: '6px'
              }}
            >
              Master Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                color="#64748b"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="current-password"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '11px 12px 11px 38px',
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid rgba(100, 116, 139, 0.3)',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '13px',
                  outline: 'none',
                  transition: 'border-color 0.15s ease'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)',
              opacity: isLoading ? 0.7 : 1,
              transition: 'opacity 0.2s ease, transform 0.1s ease'
            }}
          >
            {isLoading ? 'Verifying Scope & Credentials...' : 'Authenticate to Platform Console'}
            {!isLoading && <ArrowRight size={15} />}
          </button>
        </form>

        {/* Footer Isolation Notice */}
        <div
          style={{
            marginTop: '28px',
            paddingTop: '20px',
            borderTop: '1px solid rgba(100, 116, 139, 0.2)',
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px' }}>
            Looking for an Institutional School Workspace?
          </div>
          <a
            href="http://localhost:4000"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: '#38bdf8',
              textDecoration: 'none',
              fontWeight: 500
            }}
          >
            Connect to School Portal (Port 4000)
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}
