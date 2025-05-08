import { getToken, setToken, removeToken } from './auth.js';

const API_URL = import.meta.env.VITE_API_URL;

console.log('API URL:', API_URL); // Log the API URL being used

function buildHeaders(extra = {}) {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

// Employee operations
export const employeeOperations = {
  // Get all employees
  async getAllEmployees() {
    try {
      console.log('Making request to:', `${API_URL}/employees`);
      const response = await fetch(`${API_URL}/employees`, {
        headers: buildHeaders(),
      });
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || 
          `Failed to fetch employees (HTTP ${response.status})`
        );
      }
      
      const data = await response.json();
      console.log('Received data:', data);
      return data;
    } catch (error) {
      console.error('Error getting employees:', error);
      throw error;
    }
  },

  // Get employee by email
  async getEmployeeByEmail(email) {
    try {
      console.log('Making request to:', `${API_URL}/employees/email/${email}`);
      const response = await fetch(`${API_URL}/employees/email/${email}`, {
        headers: buildHeaders(),
      });
      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || 
          `Failed to fetch employee by email (HTTP ${response.status})`
        );
      }

      const data = await response.json();
      console.log('Received data:', data);
      return data;
    } catch (error) {
      console.error('Error getting employee by email:', error);
      throw error;
    }
  },

  // Create a new employee
  async createEmployee(employee) {
    try {
      console.log('Making request to:', `${API_URL}/employees`);
      console.log('With data:', employee);
      
      const response = await fetch(`${API_URL}/employees`, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify(employee),
      });
      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || 
          `Failed to create employee (HTTP ${response.status})`
        );
      }

      const data = await response.json();
      console.log('Received data:', data);
      return data;
    } catch (error) {
      console.error('Error creating employee:', error);
      throw error;
    }
  },

  // Update employee
  async updateEmployee(id, updates) {
    try {
      console.log('Making request to:', `${API_URL}/employees/${id}`);
      console.log('With updates:', updates);
      
      const response = await fetch(`${API_URL}/employees/${id}`, {
        method: 'PUT',
        headers: buildHeaders(),
        body: JSON.stringify(updates),
      });
      console.log('Response status:', response.status);

      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        throw new Error(
          data.error || data.details || 
          `Failed to update employee (HTTP ${response.status})`
        );
      }

      return data;
    } catch (error) {
      console.error('Error updating employee:', error);
      throw error;
    }
  },

  // Delete employee
  async deleteEmployee(id) {
    try {
      console.log('Making request to:', `${API_URL}/employees/${id}`);
      
      const response = await fetch(`${API_URL}/employees/${id}`, {
        method: 'DELETE',
        headers: buildHeaders(),
      });
      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || 
          `Failed to delete employee (HTTP ${response.status})`
        );
      }

      const data = await response.json();
      console.log('Received data:', data);
      return data;
    } catch (error) {
      console.error('Error deleting employee:', error);
      throw error;
    }
  },

  // Login
  async login(email, password) {
    try {
      console.log('Making login request to:', `${API_URL}/auth/login`);
      
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { 
          user: null, 
          message: errorData.message || 'Invalid credentials' 
        };
      }

      const data = await response.json();
      // Store token if present
      if (data.token) setToken(data.token);
      console.log('Login successful');
      return { user: data.user, message: null };
    } catch (error) {
      console.error('Error during login:', error);
      return { user: null, message: 'An error occurred during login' };
    }
  }
}; 