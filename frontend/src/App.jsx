import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import AuthPage from './components/AuthPage';
import StudentList from './components/StudentList';
import StudentFormModal from './components/StudentFormModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import CourseCards from './components/CourseCards';
import { studentApi, authApi } from './services/studentService';

export default function App() {
  const [user, setUser] = useState(() => authApi.getCurrentUser());
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [message, setMessage] = useState(null); // { text, type: 'success' | 'error' }

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deletingStudent, setDeletingStudent] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage(null);
    }, 4000);
  };

  // Fetch students from backend
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

  // When logged in, fetch students
  useEffect(() => {
    if (user) {
      fetchStudents(searchTerm);
    }
  }, [user, fetchStudents]);

  // Search input debouncer
  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => {
      fetchStudents(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, user, fetchStudents]);

  // Auth: Login handler
  const handleLogin = async (username, password) => {
    setIsAuthLoading(true);
    setAuthError('');
    try {
      const res = await authApi.login(username, password);
      setUser(authApi.getCurrentUser());
      showMessage(res.message || 'Logged in successfully.', 'success');
    } catch (err) {
      setAuthError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Auth: Register handler
  const handleRegister = async (username, password, fullName) => {
    setIsAuthLoading(true);
    setAuthError('');
    try {
      await authApi.register(username, password, fullName);
      // Auto login after registration
      await authApi.login(username, password);
      setUser(authApi.getCurrentUser());
      showMessage('Account registered successfully!', 'success');
    } catch (err) {
      setAuthError(err.message || 'Registration failed.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Auth: Logout handler
  const handleLogout = () => {
    authApi.logout();
    setUser(null);
    setStudents([]);
    setSearchTerm('');
    setMessage(null);
  };

  // Student CRUD: Add or Edit
  const handleSaveStudent = async (formData, isEditMode) => {
    setIsSubmitting(true);
    try {
      if (isEditMode) {
        await studentApi.updateStudent(formData.id, formData);
        showMessage(`Student #${formData.id} updated successfully.`, 'success');
      } else {
        await studentApi.createStudent(formData);
        showMessage(`Student #${formData.id} added successfully.`, 'success');
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

  // Student CRUD: Confirm Delete
  const handleConfirmDelete = async (studentId) => {
    setIsDeleting(true);
    try {
      await studentApi.deleteStudent(studentId);
      showMessage(`Student #${studentId} was deleted successfully.`, 'success');
      setDeletingStudent(null);
      fetchStudents(searchTerm);
    } catch (err) {
      showMessage(err.message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // If NOT logged in, show the Login/Register page first!
  if (!user) {
    return (
      <AuthPage
        onLogin={handleLogin}
        onRegister={handleRegister}
        isLoading={isAuthLoading}
        authError={authError}
      />
    );
  }

  // Once logged in, show the clean Student Management CRUD Dashboard
  return (
    <div>
      <Navbar user={user} onLogout={handleLogout} />

      <main className="container">
        {/* Alerts / Feedback */}
        {message && (
          <div
            className={`alert-box ${
              message.type === 'error' ? 'alert-error' : 'alert-success'
            }`}
          >
            <span>{message.text}</span>
            <button
              onClick={() => setMessage(null)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
                color: 'inherit',
              }}
            >
              &times;
            </button>
          </div>
        )}

        {/* Course-wise Count Cards Header */}
        <CourseCards
          students={students}
          selectedCourse={selectedCourse}
          onSelectCourse={setSelectedCourse}
        />

        {/* Student Records Table */}
        <StudentList
          students={
            selectedCourse
              ? students.filter((s) => s.course === selectedCourse)
              : students
          }
          selectedCourse={selectedCourse}
          onClearCourseFilter={() => setSelectedCourse(null)}
          loading={loading}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onRefresh={() => fetchStudents(searchTerm)}
          onOpenAddModal={() => {
            setEditingStudent(null);
            setIsFormModalOpen(true);
          }}
          onEditStudent={(student) => {
            setEditingStudent(student);
            setIsFormModalOpen(true);
          }}
          onDeleteStudent={(student) => {
            setDeletingStudent(student);
          }}
        />
      </main>

      {/* Add / Edit Student Modal */}
      <StudentFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingStudent(null);
        }}
        onSubmit={handleSaveStudent}
        initialData={editingStudent}
        isSubmitting={isSubmitting}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingStudent)}
        student={deletingStudent}
        onClose={() => setDeletingStudent(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
