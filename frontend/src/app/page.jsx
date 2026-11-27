'use client';

import React, { useEffect, useState } from 'react';
import HomeDashboard from '../components/home/HomeDashboard';

/**
 * Main Home Launchpad Route for My School Care.
 * Serves the central authorized application discovery dashboard for school workspaces.
 * If accessed on platform administration port (4001), routes immediately to /platform.
 */
export default function Page() {
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.port === '4001') {
      setIsRedirecting(true);
      window.location.replace('/platform');
    }
  }, []);

  if (isRedirecting) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#090d16',
          color: '#94a3b8',
          fontSize: '0.9rem',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}
      >
        Directing to Platform Console...
      </div>
    );
  }

  return <HomeDashboard />;
}
