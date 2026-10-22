import React from 'react';

export default function StudentList({
  students,
  loading,
  searchTerm,
  onSearchChange,
  onRefresh,
  onOpenAddModal,
  onEditStudent,
  onDeleteStudent,
  selectedCourse,
  onClearCourseFilter,
}) {
  return (
    <div className="card">
      {/* Active Course Filter Alert / Chip */}
      {selectedCourse && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            color: '#1d4ed8',
            padding: '8px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            marginBottom: '16px',
          }}
        >
          <span>
            Filtered by course: <strong>{selectedCourse}</strong>
          </span>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            style={{ backgroundColor: '#ffffff', padding: '3px 8px' }}
            onClick={onClearCourseFilter}
          >
            Show All Courses
          </button>
        </div>
      )}

      {/* Top action bar: Search, Add Student, Refresh */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', flex: '1', maxWidth: '400px' }}>
          <input
            id="input-search-student"
            type="text"
            className="form-input"
            placeholder="Search by ID, Name, or Course..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <button
            id="btn-refresh"
            type="button"
            className="btn btn-outline"
            onClick={onRefresh}
            title="Refresh records"
          >
            Refresh
          </button>
        </div>

        <button
          id="btn-add-student"
          type="button"
          className="btn btn-primary"
          onClick={onOpenAddModal}
        >
          + Add Student
        </button>
      </div>

      {/* Table view */}
      <div className="table-wrapper">
        <table className="data-table" id="table-students">
          <thead>
            <tr>
              <th style={{ width: '120px' }}>Student ID</th>
              <th>Full Name</th>
              <th>Email Address</th>
              <th>Course</th>
              <th style={{ width: '100px', textAlign: 'center' }}>Semester</th>
              <th style={{ width: '160px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '32px' }}>
                  Loading student records...
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  {searchTerm
                    ? `No students found matching "${searchTerm}".`
                    : 'No student records available. Click "+ Add Student" to create a new record.'}
                </td>
              </tr>
            ) : (
              students.map((student) => (
                <tr key={student.id} id={`row-student-${student.id}`}>
                  <td>
                    <strong>#{student.id}</strong>
                  </td>
                  <td>{student.fullName}</td>
                  <td>{student.email || '-'}</td>
                  <td>{student.course}</td>
                  <td style={{ textAlign: 'center' }}>{student.semester}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <button
                        id={`btn-edit-${student.id}`}
                        className="btn btn-outline btn-sm"
                        onClick={() => onEditStudent(student)}
                      >
                        Edit
                      </button>
                      <button
                        id={`btn-delete-${student.id}`}
                        className="btn btn-danger btn-sm"
                        onClick={() => onDeleteStudent(student)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {students.length > 0 && (
        <div style={{ marginTop: '14px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Total Students: <strong>{students.length}</strong>
        </div>
      )}
    </div>
  );
}
