'use client';

import React from 'react';
import { BookOpen, Layers } from 'lucide-react';

export default function CourseCards({ students = [], selectedCourse, onSelectCourse }) {
  // Aggregate count by course
  const courseCounts = students.reduce((acc, student) => {
    const course = student.course || 'General';
    acc[course] = (acc[course] || 0) + 1;
    return acc;
  }, {});

  const courses = Object.keys(courseCounts).sort();

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>
          Program Breakdown & Filters
        </h3>
        {selectedCourse && (
          <button
            type="button"
            onClick={() => onSelectCourse(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#0284c7',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Clear Filter
          </button>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '12px',
        }}
      >
        {/* Total Students All Card */}
        <div
          onClick={() => onSelectCourse(null)}
          style={{
            backgroundColor: !selectedCourse ? '#f0f9ff' : '#ffffff',
            border: `1.5px solid ${!selectedCourse ? '#0284c7' : '#e2e8f0'}`,
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: !selectedCourse ? '0 2px 8px rgba(2, 132, 199, 0.12)' : 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: !selectedCourse ? '#0284c7' : '#64748b' }}>
              All Programs
            </span>
            <Layers size={15} color={!selectedCourse ? '#0284c7' : '#94a3b8'} />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
            {students.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
            Total Enrolled
          </div>
        </div>

        {/* Individual Course Cards */}
        {courses.map((course) => {
          const count = courseCounts[course];
          const isSelected = selectedCourse === course;
          return (
            <div
              key={course}
              onClick={() => onSelectCourse(isSelected ? null : course)}
              style={{
                backgroundColor: isSelected ? '#fdf2f8' : '#ffffff',
                border: `1.5px solid ${isSelected ? '#db2777' : '#e2e8f0'}`,
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isSelected ? '0 2px 8px rgba(219, 39, 119, 0.12)' : 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: isSelected ? '#db2777' : '#334155',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={course}
                >
                  {course}
                </span>
                <BookOpen size={15} color={isSelected ? '#db2777' : '#94a3b8'} />
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                {count}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                {count === 1 ? '1 Student' : `${count} Students`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
