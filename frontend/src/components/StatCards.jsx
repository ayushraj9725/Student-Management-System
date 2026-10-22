import React from 'react';
import { Users, BookOpen, Layers, Database } from 'lucide-react';

export default function StatCards({ students, isConnected }) {
  const totalStudents = students.length;
  const uniqueCourses = new Set(students.map((s) => s.course)).size;
  const uniqueSemesters = new Set(students.map((s) => s.semester)).size;

  const stats = [
    {
      id: 'stat-total-students',
      title: 'Total Students',
      value: totalStudents,
      label: 'Enrolled Records',
      icon: Users,
      color: '#6366f1',
      bgGlow: 'rgba(99, 102, 241, 0.15)',
    },
    {
      id: 'stat-unique-courses',
      title: 'Academic Courses',
      value: uniqueCourses,
      label: 'Specializations',
      icon: BookOpen,
      color: '#06b6d4',
      bgGlow: 'rgba(6, 182, 212, 0.15)',
    },
    {
      id: 'stat-semesters',
      title: 'Semesters Active',
      value: uniqueSemesters,
      label: 'Sem 1 - 8',
      icon: Layers,
      color: '#10b981',
      bgGlow: 'rgba(16, 185, 129, 0.15)',
    },
    {
      id: 'stat-db-status',
      title: 'Database Engine',
      value: 'MySQL',
      label: 'DB: student_db',
      icon: Database,
      color: '#f59e0b',
      bgGlow: 'rgba(245, 158, 11, 0.15)',
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.25rem',
      }}
    >
      {stats.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.id}
            id={item.id}
            className="glass-panel"
            style={{
              padding: '1.25rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
              transition: 'transform var(--transition-normal), border-color var(--transition-normal)',
            }}
          >
            <div>
              <p
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--text-secondary)',
                  marginBottom: '0.35rem',
                }}
              >
                {item.title}
              </p>
              <h3
                style={{
                  fontSize: '1.85rem',
                  fontWeight: 800,
                  lineHeight: 1.1,
                  color: '#ffffff',
                }}
              >
                {item.value}
              </h3>
              <p
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  marginTop: '0.3rem',
                }}
              >
                {item.label}
              </p>
            </div>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: item.bgGlow,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: item.color,
                boxShadow: `0 4px 12px ${item.bgGlow}`,
              }}
            >
              <Icon size={24} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
