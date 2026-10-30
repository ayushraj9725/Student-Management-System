'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function ApplicationCard({ application }) {
  const Icon = application.icon;
  const isOperable = application.isAvailable && application.route;

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '170px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
        transition: 'all 0.18s ease-in-out',
      }}
      className="application-card-hover"
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: `${application.iconColor}12`,
              color: application.iconColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={22} strokeWidth={2.2} />
          </div>

          {application.comingSoon && (
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                color: '#64748b',
                backgroundColor: '#f1f5f9',
                padding: '3px 10px',
                borderRadius: '9999px',
              }}
            >
              Coming soon
            </span>
          )}
        </div>

        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
          {application.title}
        </h3>
        <p style={{ fontSize: '0.84rem', color: '#64748b', lineHeight: 1.5 }}>
          {application.description}
        </p>
      </div>

      <div style={{ marginTop: '20px' }}>
        {isOperable ? (
          <Link
            href={application.route}
            style={{
              fontSize: '0.88rem',
              fontWeight: 600,
              color: '#2563eb',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'gap 0.15s ease',
            }}
          >
            <span>Open application</span>
            <ArrowRight size={15} />
          </Link>
        ) : (
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
            In development
          </span>
        )}
      </div>
    </div>
  );
}
