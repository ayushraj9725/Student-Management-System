'use client';

import React, { useState, useEffect } from 'react';
import HomeDashboard from '../components/home/HomeDashboard';
import PlatformAdminPage from './platform/page';

/**
 * Main Entry Route for My School Care.
 * Dynamically resolves portal scope based on runtime network port:
 * - Port 4001: Platform Administration Gateway (Platform Super Admin)
 * - Port 4000 (and default): Institutional School Portal (Tenant Admin / Staff)
 */
export default function Page() {
  const [isPlatformScope, setIsPlatformScope] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const is4001 = window.location.port === '4001';
      setIsPlatformScope(is4001);
      setIsMounted(true);
    }
  }, []);

  if (!isMounted) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>
          Initializing portal gateway...
        </div>
      </div>
    );
  }

  if (isPlatformScope) {
    return <PlatformAdminPage />;
  }

  return <HomeDashboard />;
}
