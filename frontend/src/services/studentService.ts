import { Student } from '../types/api';
import { apiRequest } from './apiClient';
import { authService } from './authService';

export const studentApi = {
  getStudents: (searchTerm: string = ''): Promise<Student[]> => {
    const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '';
    return apiRequest<Student[]>(`/students${query}`, { method: 'GET' });
  },

  getStudentById: (id: number): Promise<Student> => {
    return apiRequest<Student>(`/students/${id}`, { method: 'GET' });
  },

  createStudent: (studentData: Partial<Student>): Promise<Student> => {
    return apiRequest<Student>('/students', {
      method: 'POST',
      body: JSON.stringify(studentData),
    });
  },

  updateStudent: (id: number, studentData: Partial<Student>): Promise<Student> => {
    return apiRequest<Student>(`/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(studentData),
    });
  },

  deleteStudent: (id: number): Promise<void> => {
    return apiRequest<void>(`/students/${id}`, {
      method: 'DELETE',
    });
  },
};

export const authApi = {
  login: async (usernameOrEmail: string, password: string): Promise<any> => {
    return authService.login({ usernameOrEmail, password });
  },

  getCurrentUser: (): any => {
    return authService.getCurrentUser();
  },

  logout: async (): Promise<void> => {
    return authService.logout();
  },
};
