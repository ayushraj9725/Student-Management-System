import React from 'react';

export default function DeleteConfirmModal({
  isOpen,
  student,
  onClose,
  onConfirm,
  isDeleting,
}) {
  if (!isOpen || !student) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ color: 'var(--danger-red)' }}>
            Confirm Delete
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.25rem',
              cursor: 'pointer',
              color: 'var(--text-muted)',
            }}
          >
            &times;
          </button>
        </div>

        <div style={{ fontSize: '0.92rem', marginBottom: '16px' }}>
          <p style={{ marginBottom: '12px' }}>
            Are you sure you want to delete this student record?
          </p>
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid var(--border-color)',
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.88rem',
            }}
          >
            <div><strong>Student ID:</strong> #{student.id}</div>
            <div><strong>Name:</strong> {student.fullName}</div>
            <div><strong>Course:</strong> {student.course} (Semester {student.semester})</div>
          </div>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            id="btn-confirm-delete"
            className="btn btn-danger"
            onClick={() => onConfirm(student.id)}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
