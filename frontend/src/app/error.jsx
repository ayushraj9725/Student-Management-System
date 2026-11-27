'use client';

import React from 'react';

export default function GlobalError({ error, reset }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        padding: '24px',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}
    >
      <div
        style={{
          maxWidth: '440px',
          textAlign: 'center',
          background: '#ffffff',
          padding: '32px',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
        }}
      >
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
          Application Encountered a Problem
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '20px' }}>
          {error?.message || 'An unexpected error occurred while loading this view.'}
        </p>
        <button
          type="button"
          onClick={() => reset ? reset() : window.location.reload()}
          style={{
            background: '#0284c7',
            color: '#ffffff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
