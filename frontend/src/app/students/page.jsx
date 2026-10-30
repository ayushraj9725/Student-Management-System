'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StatCards from '../../components/StatCards';
import CourseCards from '../../components/CourseCards';
import StudentList from '../../components/StudentList';
import StudentFormModal from '../../components/StudentFormModal';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import AuthPage from '../../components/AuthPage';
import { studentApi } from '../../services/studentService';
import { authService } from '../../services/authService';
import { platformService } from '../../services/platformService';
import { getActiveTenantSlug } from '../../services/apiClient';
import {
  ArrowLeft,
  CheckCircle2,
  Building2,
  Bell,
  HelpCircle,
  LogOut,
  User,
  GraduationCap,
  AlertTriangle
} from 'lucide-react';

export default function StudentsManagementPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [message, setMessage] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deletingStudent, setDeletingStudent] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [organization, setOrganization] = useState(null);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    setIsHydrated(true);

    const activeSlug = currentUser?.organizationSlug || getActiveTenantSlug();
    if (activeSlug) {
      platformService.getOrganizationBySlug(activeSlug)
        .then((org) => {
          if (org) setOrganization(org);
        })
        .catch(() => {});
    }
  }, []);

  const isSuspended = organization?.status === 'SUSPENDED';

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const fetchStudents = useCallback(async (query = '') => {
    setLoading(true);
    try {
      const data = await studentApi.getStudents(query);
      setStudents(Array.isArray(data) ? data : []);
    } catch (err) {
      showMessage(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchStudents(searchTerm);
    }
  }, [user, fetchStudents, searchTerm]);

  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => {
      fetchStudents(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, user, fetchStudents]);

  const handleOpenAddModal = () => {
    if (isSuspended) {
      showMessage('Enrollment is restricted because this school is currently suspended.', 'error');
      return;
    }
    setEditingStudent(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (student) => {
    if (isSuspended) {
      showMessage('Editing student records is disabled while school is suspended.', 'error');
      return;
    }
    setEditingStudent(student);
    setIsFormModalOpen(true);
  };

  const handleSaveStudent = async (formData) => {
    if (isSuspended) {
      showMessage('Cannot save changes. This school is suspended by platform administration.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      if (editingStudent) {
        await studentApi.updateStudent(editingStudent.id, formData);
        showMessage(`Student #${editingStudent.id} details updated successfully.`);
      } else {
        await studentApi.createStudent(formData);
        showMessage(`Student #${formData.id} enrolled successfully.`);
      }
      setIsFormModalOpen(false);
      setEditingStudent(null);
      fetchStudents(searchTerm);
    } catch (err) {
      showMessage(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDeleteModal = (student) => {
    if (isSuspended) {
      showMessage('Deleting records is disabled while school is suspended.', 'error');
      return;
    }
    setDeletingStudent(student);
  };

  const handleConfirmDelete = async () => {
    if (!deletingStudent) return;
    if (isSuspended) {
      showMessage('Cannot delete records. This school is suspended by platform administration.', 'error');
      return;
    }
    setIsDeleting(true);
    try {
      await studentApi.deleteStudent(deletingStudent.id);
      showMessage(`Student #${deletingStudent.id} removed from system.`);
      setDeletingStudent(null);
      fetchStudents(searchTerm);
    } catch (err) {
      showMessage(err.message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
    router.push('/');
  };

  const filteredStudents = selectedCourse
    ? students.filter((s) => s.course === selectedCourse)
    : students;

  if (!isHydrated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>
          Loading My School Care...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthPage
        onLoginSuccess={(auth) => {
          setUser(auth);
          showMessage(`Authenticated as ${auth.fullName || auth.username}`, 'success');
        }}
      />
    );
  }

  const activeSlug = user?.organizationSlug || getActiveTenantSlug() || '';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <header
        style={{
          background: 'linear-gradient(90deg, #e0f2fe 0%, #eff6ff 25%, #ffffff 50%, #fdf2f8 75%, #fce7f3 100%)',
          borderBottom: '1px solid #cbd5e1',
          boxShadow: '0 2px 10px -2px rgba(2, 132, 199, 0.08), 0 4px 12px -4px rgba(219, 39, 119, 0.06)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        {/* 3px Vibrant Gradient Accent Bar at Top */}
        <div
          style={{
            height: '3px',
            width: '100%',
            background: 'linear-gradient(90deg, #0284c7 0%, #38bdf8 35%, #f472b6 65%, #db2777 100%)',
          }}
        />
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: '8px',
                backgroundColor: '#f1f5f9',
                color: '#334155',
                fontSize: '0.85rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <ArrowLeft size={16} />
              <span>Back to Home</span>
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '12px' }}>
              <img
                src="/logo.png"
                alt="My School Care Logo"
                style={{ width: '32px', height: '32px', objectFit: 'contain' }}
              />
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                My School Care
              </span>
              <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                · Student Records
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#e0f2fe',
                color: '#0284c7',
                padding: '5px 12px',
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              <Building2 size={14} />
              <span>{activeSlug}</span>
            </div>

            {/* Profile Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'none',
                  border: '1px solid #e2e8f0',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  backgroundColor: '#ffffff',
                }}
              >
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  {user.username ? user.username.substring(0, 1).toUpperCase() : 'U'}
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a' }}>
                  {user.username}
                </span>
              </button>

              {isProfileOpen && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '42px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    width: '200px',
                    padding: '8px',
                    zIndex: 50,
                  }}
                >
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                      {user.fullName || user.username}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      {user.role}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      border: 'none',
                      background: 'none',
                      color: '#ef4444',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      borderRadius: '6px',
                      marginTop: '4px',
                    }}
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      {message && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            padding: '12px 20px',
            borderRadius: '12px',
            backgroundColor: message.type === 'error' ? '#ef4444' : '#10b981',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '0.88rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Content */}
      <main style={{ maxWidth: '1280px', width: '100%', margin: '0 auto', padding: '28px 24px', flex: 1 }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
            Student & Academic Records
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Manage student enrollments, academic specializations, and curriculum semester assignments.
          </p>
        </div>

        {/* Read-Only Suspended Banner */}
        {isSuspended && (
          <div
            style={{
              marginBottom: '24px',
              padding: '14px 20px',
              borderRadius: '10px',
              backgroundColor: '#fff1f2',
              border: '1.5px solid #fecdd3',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              boxShadow: '0 2px 6px rgba(225, 29, 72, 0.05)',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#ffe4e6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={18} color="#e11d48" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <strong style={{ fontSize: '0.88rem', color: '#9f1239', fontWeight: 700 }}>
                  School Account Suspended (Read-Only Mode)
                </strong>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    backgroundColor: '#ffe4e6',
                    color: '#be123c',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    letterSpacing: '0.04em',
                  }}
                >
                  READ-ONLY
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#be123c', lineHeight: 1.4 }}>
                This institution is currently suspended by platform administration. You can browse and search student records, but enrollment, modifications, and deletions are disabled.
              </p>
            </div>
          </div>
        )}

        {/* 4 Metric Cards */}
        <StatCards students={students} isConnected={true} />

        {/* Course Filters */}
        <CourseCards
          students={students}
          selectedCourse={selectedCourse}
          onSelectCourse={(course) => setSelectedCourse(course)}
        />

        {/* Student List */}
        <StudentList
          students={filteredStudents}
          loading={loading}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onRefresh={() => fetchStudents(searchTerm)}
          onOpenAddModal={handleOpenAddModal}
          onEditStudent={handleOpenEditModal}
          onDeleteStudent={handleOpenDeleteModal}
          selectedCourse={selectedCourse}
          onClearCourseFilter={() => setSelectedCourse(null)}
          isSuspended={isSuspended}
        />
      </main>

      {/* Add / Edit Student Modal */}
      {isFormModalOpen && (
        <StudentFormModal
          student={editingStudent}
          isOpen={isFormModalOpen}
          isSubmitting={isSubmitting}
          onClose={() => {
            setIsFormModalOpen(false);
            setEditingStudent(null);
          }}
          onSave={handleSaveStudent}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingStudent && (
        <DeleteConfirmModal
          student={deletingStudent}
          isDeleting={isDeleting}
          onClose={() => setDeletingStudent(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}
