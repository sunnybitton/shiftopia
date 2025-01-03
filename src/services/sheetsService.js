const API_URL = 'http://localhost:3001/api';

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
    const response = await fetch(`${API_URL}/update-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, currentPassword, newPassword }),
    });

    const data = await response.json();
    
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