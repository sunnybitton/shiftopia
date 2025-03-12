const API_URL = import.meta.env.VITE_API_URL;

export const sheetsService = {
  async getAllEmployees() {
    try {
      console.log('Using API URL:', API_URL);
      const response = await fetch(`${API_URL}/sheets/employees`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Raw data received:', data);

      // Filter out rows without an email
      const validEmployees = data.filter(row => row && row.email);
      console.log('Transformed employees:', validEmployees);

      return validEmployees;
    } catch (error) {
      console.error('Error fetching employees:', error);
      throw error;
    }
  },

  async getEmployeeSchedule(employeeId) {
    try {
      const response = await fetch(`${API_URL}/sheets/schedule/${employeeId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching employee schedule:', error);
      throw error;
    }
  },

  async updateEmployeeSchedule(employeeId, scheduleData) {
    try {
      const response = await fetch(`${API_URL}/sheets/schedule/${employeeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scheduleData),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error updating employee schedule:', error);
      throw error;
    }
  }
};

export async function fetchSheetData(sheetName = 'DATA') {
  try {
    const response = await fetch(`${API_URL}/sheets/${sheetName}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to fetch sheet data: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    if (!data || data.length === 0) {
      throw new Error(`No data found in sheet: ${sheetName}`);
    }

    return data;
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    throw error;
  }
}

export async function updateSheetData(email, currentPassword, newPassword) {
  try {
    console.log('Attempting to update password with:', {
      email,
      hasCurrentPassword: !!currentPassword,
      hasNewPassword: !!newPassword
    });

    const response = await fetch(`${API_URL}/auth/update-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        currentPassword,
        newPassword
      }),
    });

    console.log('Password update response status:', response.status);
    const data = await response.json();
    console.log('Password update response:', data);
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to update password');
    }

    return data;
  } catch (error) {
    console.error('Error updating password:', error);
    throw error;
  }
}

export async function exportSheetToPDF(sheetName) {
  try {
    const response = await fetch(`${API_URL}/sheets/${sheetName}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet data: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw error;
  }
}