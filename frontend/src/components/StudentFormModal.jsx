'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, RotateCcw, UserPlus, Edit3 } from 'lucide-react';

export default function StudentFormModal({
  isOpen,
  onClose,
  onSave,
  onSubmit,
  student,
  initialData,
  isSubmitting,
}) {
  const effectiveData = student || initialData;
  const isEditMode = Boolean(effectiveData && effectiveData.id);

  const defaultForm = {
    id: '',
    fullName: '',
    email: '',
    course: 'Computer Science',
    semester: 1,
  };

  const [formData, setFormData] = useState(defaultForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (effectiveData) {
      setFormData({
        id: effectiveData.id || '',
        fullName: effectiveData.fullName || '',
        email: effectiveData.email || '',
        course: effectiveData.course || 'Computer Science',
        semester: effectiveData.semester || 1,
      });
    } else {
      setFormData(defaultForm);
    }
    setErrors({});
  }, [effectiveData, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors = {};

    if (!isEditMode) {
      if (!formData.id || isNaN(formData.id) || Number(formData.id) <= 0) {
        newErrors.id = 'Please enter a valid positive Student ID number.';
      }
    }

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full Name is required.';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!formData.course.trim()) {
      newErrors.course = 'Course is required.';
    }

    if (!formData.semester || Number(formData.semester) < 1 || Number(formData.semester) > 8) {
      newErrors.semester = 'Semester must be between 1 and 8.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      id: Number(formData.id),
      fullName: formData.fullName.trim(),
      email: formData.email.trim() || null,
      course: formData.course.trim(),
      semester: Number(formData.semester),
    };

    if (onSave) {
      onSave(payload, isEditMode);
    } else if (onSubmit) {
      onSubmit(payload, isEditMode);
    }
  };

  const handleReset = () => {
    if (isEditMode) {
      setFormData({
        id: effectiveData.id,
        fullName: effectiveData.fullName,
        email: effectiveData.email || '',
        course: effectiveData.course,
        semester: effectiveData.semester,
      });
    } else {
      setFormData(defaultForm);
    }
    setErrors({});
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '520px',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div
          className="modal-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '16px',
            borderBottom: '1px solid #f1f5f9',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: isEditMode ? 'var(--pastel-pink-bg)' : 'var(--pastel-blue-bg)',
                color: isEditMode ? 'var(--pastel-pink-icon)' : 'var(--pastel-blue-icon)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isEditMode ? <Edit3 size={18} /> : <UserPlus size={18} />}
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                {isEditMode ? 'Edit Student Details' : 'Enroll New Student'}
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {isEditMode
                  ? 'Update institutional enrollment record information'
                  : 'Register a student into the current institutional scope'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label" htmlFor="form-student-id">
              Student ID {isEditMode ? '(Institutional Key - Read Only)' : '*'}
            </label>
            <input
              id="form-student-id"
              type="number"
              className="form-input"
              placeholder="e.g. 101, 102, 1001"
              value={formData.id}
              disabled={isEditMode}
              onChange={(e) => {
                setFormData({ ...formData, id: e.target.value });
                if (errors.id) setErrors({ ...errors, id: null });
              }}
            />
            {errors.id && <div className="form-error">{errors.id}</div>}
          </div>

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label" htmlFor="form-full-name">
              Full Name *
            </label>
            <input
              id="form-full-name"
              type="text"
              className="form-input"
              placeholder="e.g. Rahul Sharma"
              value={formData.fullName}
              onChange={(e) => {
                setFormData({ ...formData, fullName: e.target.value });
                if (errors.fullName) setErrors({ ...errors, fullName: null });
              }}
            />
            {errors.fullName && <div className="form-error">{errors.fullName}</div>}
          </div>

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label" htmlFor="form-email">
              Email Address
            </label>
            <input
              id="form-email"
              type="email"
              className="form-input"
              placeholder="e.g. rahul@example.com"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                if (errors.email) setErrors({ ...errors, email: null });
              }}
            />
            {errors.email && <div className="form-error">{errors.email}</div>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="form-course">
                Academic Program *
              </label>
              <select
                id="form-course"
                className="form-input"
                value={formData.course}
                onChange={(e) => {
                  setFormData({ ...formData, course: e.target.value });
                  if (errors.course) setErrors({ ...errors, course: null });
                }}
              >
                <option value="Computer Science">Computer Science</option>
                <option value="Information Technology">Information Technology</option>
                <option value="Data Science">Data Science</option>
                <option value="Electronics & Communication">Electronics & Communication</option>
                <option value="Mechanical Engineering">Mechanical Engineering</option>
                <option value="Civil Engineering">Civil Engineering</option>
              </select>
              {errors.course && <div className="form-error">{errors.course}</div>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="form-semester">
                Curriculum Semester *
              </label>
              <select
                id="form-semester"
                className="form-input"
                value={formData.semester}
                onChange={(e) => {
                  setFormData({ ...formData, semester: parseInt(e.target.value, 10) });
                  if (errors.semester) setErrors({ ...errors, semester: null });
                }}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
              {errors.semester && <div className="form-error">{errors.semester}</div>}
            </div>
          </div>

          <div
            className="modal-actions"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
              paddingTop: '16px',
              borderTop: '1px solid #f1f5f9',
            }}
          >
            <button
              type="button"
              className="btn-executive-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-executive-secondary"
              onClick={handleReset}
              disabled={isSubmitting}
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
            <button
              type="submit"
              id="btn-save-student"
              className="btn-executive-primary"
              disabled={isSubmitting}
            >
              <Check size={15} />
              <span>
                {isSubmitting
                  ? 'Saving...'
                  : isEditMode
                  ? 'Update Details'
                  : 'Enroll Student'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
