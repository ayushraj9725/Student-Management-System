'use client';

import React from 'react';
import { Search, RotateCw, UserPlus, Edit3, Trash2, GraduationCap, X, CheckCircle2 } from 'lucide-react';

export default function StudentList({
  students = [],
  loading = false,
  searchTerm = '',
  onSearchChange,
  onRefresh,
  onOpenAddModal,
  onEditStudent,
  onDeleteStudent,
  selectedCourse,
  onClearCourseFilter,
  isSuspended = false,
}) {
  return (
    <div className="modern-surface-card" style={{ marginTop: '20px' }}>
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          paddingBottom: '20px',
          borderBottom: '1px solid #f1f5f9',
          marginBottom: '20px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
            Enrolled Students Registry
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Multi-tenant directory of all students officially registered in this institution.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Refresh Button */}
          <button
            id="btn-refresh"
            type="button"
            className="btn-executive-secondary"
            onClick={onRefresh}
            title="Refresh records"
            disabled={loading}
          >
            <RotateCw size={15} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>

          {/* Add Student Button */}
          <button
            id="btn-add-student"
            type="button"
            className="btn-executive-primary"
            onClick={onOpenAddModal}
            disabled={isSuspended}
            style={{
              opacity: isSuspended ? 0.6 : 1,
              cursor: isSuspended ? 'not-allowed' : 'pointer',
            }}
            title={isSuspended ? 'Enrollment disabled while school is suspended' : 'Enroll New Student'}
          >
            <UserPlus size={16} />
            <span>Enroll New Student</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        {/* Search Input Box */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 'var(--radius-pill)',
            padding: '8px 16px',
            flex: '1',
            maxWidth: '380px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          <Search size={16} color="#94a3b8" />
          <input
            id="input-search-student"
            type="text"
            placeholder="Search by ID, Name, or Course..."
            value={searchTerm}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '0.85rem',
              color: '#0f172a',
              width: '100%',
            }}
          />
        </div>

        {/* Active Filter Pill */}
        {selectedCourse && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#0284c7',
              padding: '6px 14px',
              borderRadius: 'var(--radius-pill)',
              fontSize: '0.82rem',
              fontWeight: 600,
            }}
          >
            <span>Filter: {selectedCourse}</span>
            <button
              type="button"
              onClick={onClearCourseFilter}
              style={{
                background: 'none',
                border: 'none',
                color: '#0284c7',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '2px',
              }}
              title="Clear course filter"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Clean Modern Table */}
      <div className="table-wrapper" style={{ border: '1px solid #f1f5f9', borderRadius: 'var(--radius-md)' }}>
        <table className="data-table" id="table-students" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
                Student ID
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
                Student Name
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
                Email Address
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
                Academic Course
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
                Semester
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
                Status
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                  <RotateCw size={20} className="spin" style={{ margin: '0 auto 8px', display: 'block' }} />
                  Loading student records...
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  {searchTerm
                    ? `No students found matching "${searchTerm}".`
                    : 'No student records enrolled yet. Click "Enroll New Student" to get started.'}
                </td>
              </tr>
            ) : (
              students.map((student) => {
                const initials = student.fullName
                  ? student.fullName
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()
                  : 'ST';

                return (
                  <tr
                    key={student.id}
                    id={`row-student-${student.id}`}
                    style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s ease' }}
                    className="table-row-hover"
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          color: '#0284c7',
                          backgroundColor: '#f0f9ff',
                          padding: '3px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        #{student.id}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #e0f2fe 0%, #fce7f3 100%)',
                            color: '#0284c7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            flexShrink: 0,
                          }}
                        >
                          {initials}
                        </div>
                        <div>
                          <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0f172a', display: 'block' }}>
                            {student.fullName}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#475569' }}>
                      {student.email || '-'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 500,
                          color: '#334155',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          padding: '3px 10px',
                          borderRadius: 'var(--radius-pill)',
                        }}
                      >
                        {student.course}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                      Sem {student.semester}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: '#16a34a',
                          backgroundColor: '#dcfce7',
                          padding: '3px 10px',
                          borderRadius: 'var(--radius-pill)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <CheckCircle2 size={12} />
                        Active
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          id={`btn-edit-${student.id}`}
                          type="button"
                          className="btn-executive-secondary"
                          style={{
                            padding: '5px 10px',
                            fontSize: '0.78rem',
                            opacity: isSuspended ? 0.5 : 1,
                            cursor: isSuspended ? 'not-allowed' : 'pointer',
                          }}
                          onClick={() => onEditStudent && onEditStudent(student)}
                          disabled={isSuspended}
                          title={isSuspended ? 'Edit disabled (School suspended)' : 'Edit student'}
                        >
                          <Edit3 size={13} />
                          <span>Edit</span>
                        </button>
                        <button
                          id={`btn-delete-${student.id}`}
                          type="button"
                          className="btn-executive-danger"
                          style={{
                            padding: '5px 10px',
                            fontSize: '0.78rem',
                            opacity: isSuspended ? 0.5 : 1,
                            cursor: isSuspended ? 'not-allowed' : 'pointer',
                          }}
                          onClick={() => onDeleteStudent && onDeleteStudent(student)}
                          disabled={isSuspended}
                          title={isSuspended ? 'Delete disabled (School suspended)' : 'Delete student'}
                        >
                          <Trash2 size={13} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      {students.length > 0 && (
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', color: '#64748b' }}>
          <span>
            Showing <strong>{students.length}</strong> registered students
          </span>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Real-time multi-tenant database synchronization
          </span>
        </div>
      )}
    </div>
  );
}
