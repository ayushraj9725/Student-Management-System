import React from 'react';

/**
 * Reusable status badge for entities (Organizations, Memberships, Roles).
 * Strictly styled with White, Light Blue, Light Pink, and subtle neutral tones.
 * Zero emojis.
 */
export default function StatusBadge({ status, label }) {
  const normalized = (status || '').toUpperCase();
  const displayLabel = label || normalized;

  let badgeStyle = 'badge-neutral';
  if (normalized === 'ACTIVE') {
    badgeStyle = 'badge-active';
  } else if (normalized === 'SUSPENDED') {
    badgeStyle = 'badge-suspended';
  } else if (normalized === 'INACTIVE' || normalized === 'REJECTED') {
    badgeStyle = 'badge-inactive';
  } else if (normalized === 'PENDING_APPROVAL') {
    badgeStyle = 'badge-pending';
  } else if (normalized === 'TEMPLATE') {
    badgeStyle = 'badge-template';
  }

  return (
    <span className={`status-badge ${badgeStyle}`}>
      <span className="status-dot" />
      {displayLabel}
    </span>
  );
}
