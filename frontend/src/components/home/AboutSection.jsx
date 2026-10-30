'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function AboutSection() {
  return (
    <section
      style={{
        borderTop: '1px solid #e2e8f0',
        paddingTop: '32px',
        marginBottom: '32px',
      }}
    >
      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
        About My School Care
      </h3>
      <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5, marginBottom: '16px', maxWidth: '780px' }}>
        One connected platform for school administration, identity management, access control and everyday school operations.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#475569' }}>
          <CheckCircle2 size={14} color="#059669" />
          <span>Secure access</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#475569' }}>
          <CheckCircle2 size={14} color="#059669" />
          <span>Role-based permissions</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#475569' }}>
          <CheckCircle2 size={14} color="#059669" />
          <span>Multi-tenant platform</span>
        </div>
      </div>
    </section>
  );
}
