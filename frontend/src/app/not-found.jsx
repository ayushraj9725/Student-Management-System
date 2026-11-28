import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        padding: '24px',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
      }}
    >
      <div
        style={{
          maxWidth: '440px',
          textAlign: 'center',
          background: '#ffffff',
          padding: '36px 32px',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
        }}
      >
        <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0284c7', marginBottom: '8px' }}>
          404
        </div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
          Page Not Found
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '24px' }}>
          The requested route or resource could not be found. Please verify the URL or return to the dashboard.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            background: '#0284c7',
            color: '#ffffff',
            padding: '10px 24px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.875rem',
            textDecoration: 'none'
          }}
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
