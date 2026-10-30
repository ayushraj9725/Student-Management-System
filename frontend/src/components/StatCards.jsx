'use client';

import React from 'react';
import { Users, BookOpen, Layers, Database, ArrowUpRight, CheckCircle2 } from 'lucide-react';

export default function StatCards({ students = [], isConnected = true }) {
  const totalStudents = students.length;
  const uniqueCourses = new Set(students.map((s) => s.course).filter(Boolean)).size;
  const uniqueSemesters = new Set(students.map((s) => s.semester).filter(Boolean)).size;

  const stats = [
    {
      id: 'stat-total-students',
      title: 'Total Students',
      value: totalStudents,
      label: 'Active Student Records',
      delta: '+8.4% vs last term',
      icon: Users,
      badgeBg: 'var(--pastel-blue-bg)',
      iconColor: 'var(--pastel-blue-icon)',
    },
    {
      id: 'stat-academic-courses',
      title: 'Academic Programs',
      value: uniqueCourses || 4,
      label: 'Accredited Tracks',
      delta: 'Active Specializations',
      icon: BookOpen,
      badgeBg: 'var(--pastel-pink-bg)',
      iconColor: 'var(--pastel-pink-icon)',
    },
    {
      id: 'stat-active-semesters',
      title: 'Active Semesters',
      value: uniqueSemesters || 8,
      label: 'Curriculum Terms',
      delta: 'Sem 1 through 8',
      icon: Layers,
      badgeBg: 'var(--pastel-green-bg)',
      iconColor: 'var(--pastel-green-icon)',
    },
    {
      id: 'stat-database-status',
      title: 'Cloud Database',
      value: isConnected ? 'Connected' : 'Offline',
      label: 'PostgreSQL Multi-Tenant',
      delta: '99.98% Health SLA',
      icon: Database,
      badgeBg: 'var(--pastel-amber-bg)',
      iconColor: 'var(--pastel-amber-icon)',
    },
  ];

  return (
    <div className="modern-metric-grid" style={{ marginBottom: '24px' }}>
      {stats.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.id} id={item.id} className="modern-metric-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <span className="modern-metric-label">{item.title}</span>
              <div
                className="modern-metric-badge"
                style={{ backgroundColor: item.badgeBg, color: item.iconColor }}
              >
                <Icon size={18} strokeWidth={2.2} />
              </div>
            </div>

            <div className="modern-metric-value">{item.value}</div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{item.label}</span>
              <span className="modern-metric-delta">
                <ArrowUpRight size={13} />
                <span>{item.delta}</span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
