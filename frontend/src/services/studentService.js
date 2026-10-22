// API Base URL - Uses relative '/api' which Vite proxies to http://localhost:8080,
const API_BASE_URL = 'http://localhost:8081/api';

// Helper for fetch requests with JSON parsing and standardized error handling
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('sms_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage =
        (data && (data.message || data.error)) ||
        `Request failed with status ${response.status}`;
      const error = new Error(errorMessage);
      error.status = response.status;
      error.details = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.status) {
      throw err;
    }
    // Network or server unreachable error
    const netError = new Error(
      'Unable to connect to Spring Boot server. Please ensure the backend is running on port 8080.'
    );
    netError.status = 0;
    throw netError;
  }
}

export const studentApi = {
  // Fetch all students or search with query
  getStudents: (searchTerm = '') => {
    const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '';
    return request(`/students${query}`, { method: 'GET' });
  },

  // Get student by ID
  getStudentById: (id) => {
    return request(`/students/${id}`, { method: 'GET' });
  },

  // Create new student record
  createStudent: (studentData) => {
    return request('/students', {
      method: 'POST',
      body: JSON.stringify(studentData),
    });
  },

  // Update existing student record
  updateStudent: (id, studentData) => {
    return request(`/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(studentData),
    });
  },

  // Delete student record
  deleteStudent: (id) => {
    return request(`/students/${id}`, {
      method: 'DELETE',
    });
  },
};

export const authApi = {
  // Login with username and password
  login: async (username, password) => {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (data && data.token) {
      localStorage.setItem('sms_token', data.token);
      localStorage.setItem(
        'sms_user',
        JSON.stringify({
          username: data.username,
          fullName: data.fullName,
          role: data.role,
        })
      );
    }
    return data;
  },

  // Register new user
  register: async (username, password, fullName) => {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, fullName }),
    });
  },

  // Get stored user from localStorage
  getCurrentUser: () => {
    try {
      const stored = localStorage.getItem('sms_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  // Logout user
  logout: () => {
    localStorage.removeItem('sms_token');
    localStorage.removeItem('sms_user');
  },
};
