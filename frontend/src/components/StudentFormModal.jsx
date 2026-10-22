import React, { useState, useEffect } from 'react';

export default function StudentFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isSubmitting,
}) {
  const isEditMode = Boolean(initialData && initialData.id);

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
    if (initialData) {
      setFormData({
        id: initialData.id || '',
        fullName: initialData.fullName || '',
        email: initialData.email || '',
        course: initialData.course || 'Computer Science',
        semester: initialData.semester || 1,
      });
    } else {
      setFormData(defaultForm);
    }
    setErrors({});
  }, [initialData, isOpen]);

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

    onSubmit(payload, isEditMode);
  };

  const handleReset = () => {
    if (isEditMode) {
      setFormData({
        id: initialData.id,
        fullName: initialData.fullName,
        email: initialData.email || '',
        course: initialData.course,
        semester: initialData.semester,
      });
    } else {
      setFormData(defaultForm);
    }
    setErrors({});
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {isEditMode ? 'Edit Student Details' : 'Add New Student'}
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

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="form-student-id">
              Student ID {isEditMode ? '(Cannot be changed)' : '*'}
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

          <div className="form-group">
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

          <div className="form-group">
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

          <div className="form-group">
            <label className="form-label" htmlFor="form-course">
              Course *
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
              Semester (1 to 8) *
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

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleReset}
              disabled={isSubmitting}
            >
              Reset
            </button>
            <button
              type="submit"
              id="btn-save-student"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Saving...'
                : isEditMode
                ? 'Update Student'
                : 'Save Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
