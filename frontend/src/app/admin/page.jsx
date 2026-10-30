'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthPage from '../../components/AuthPage';
import { authService } from '../../services/authService';
import { getActiveTenantSlug } from '../../services/apiClient';
import { RotateCw } from 'lucide-react';

export default function AdminRedirectPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [isHydrated, setIsHydrated] = useState(false);

  const routeUser = (user) => {
    if (!user) return;
    const isSuper = Boolean(
      user.isSuperAdmin ||
      user.role === 'PLATFORM_SUPER_ADMIN' ||
      user.username === 'superadmin'
    );
    if (isSuper) {
      router.replace('/platform');
    } else {
      const slug = user.organizationSlug || getActiveTenantSlug();
      if (slug) {
        router.replace(`/${slug}/admin`);
      } else {
        router.replace('/');
      }
    }
  };

  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);
    setIsHydrated(true);
    if (user) {
      routeUser(user);
    }
  }, []);

  if (!isHydrated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <RotateCw size={28} color="#0284c7" className="spin" />
      </div>
    );
  }

  // If unauthenticated, force login
  if (!currentUser) {
    return (
      <AuthPage
        onLoginSuccess={(auth) => {
          setCurrentUser(auth);
          routeUser(auth);
        }}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <RotateCw size={28} color="#0284c7" className="spin" />
        <div style={{ fontSize: '0.88rem', color: '#64748b', fontWeight: 500 }}>
          Redirecting to administration workspace...
        </div>
      </div>
    </div>
  );
}

