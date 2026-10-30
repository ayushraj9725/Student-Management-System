import React from 'react';

/**
 * Reusable executive Metric / Stat Card.
 * Clean white background with Light Blue or Light Pink accent border,
 * Lucide icon pill, metric title, bold value, and status description.
 */
export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'blue', // 'blue' | 'pink' | 'neutral'
}) {
  const variantClass = variant === 'pink' ? 'stat-card-pink' : 'stat-card-blue';

  return (
    <div className={`stat-card ${variantClass}`}>
      <div className="stat-card-header">
        <span className="stat-card-title">{title}</span>
        {Icon && (
          <div className="stat-icon-wrapper">
            <Icon size={18} />
          </div>
        )}
      </div>
      <div className="stat-card-value">{value}</div>
      {subtitle && <div className="stat-card-subtitle">{subtitle}</div>}
    </div>
  );
}
