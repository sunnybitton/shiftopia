const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Function to properly format the private key
const formatPrivateKey = (key) => {
  if (!key) {
    console.error('No private key provided');
    return '';
  }
  try {
    // Remove any surrounding quotes
    let cleanKey = key.replace(/^["']|["']$/g, '');
    
    // If key already contains actual newlines, return as is
    if (cleanKey.includes('\n')) {
      return cleanKey;
    }
    
    // Replace literal \n with actual newlines
    cleanKey = cleanKey.split('\\n').join('\n');
    
    // Verify the key starts with the correct header
    if (!cleanKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
      console.error('Invalid private key format');
      return '';
    }
    
    return cleanKey;
  } catch (error) {
    console.error('Error formatting private key:', error);
    return '';
  }
};

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: formatPrivateKey(process.env.GOOGLE_PRIVATE_KEY),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

// Add debug logging
console.log('Auth credentials loaded:', {
  hasClientEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
  hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
  formattedKeyLength: formatPrivateKey(process.env.GOOGLE_PRIVATE_KEY).length
});

app.get('/api/sheets/:sheetName', async (req, res) => {
  try {
    console.log('Attempting to fetch sheet:', req.params.sheetName);
    console.log('Using spreadsheet ID:', process.env.SPREADSHEET_ID);
    
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: `${req.params.sheetName}!A1:CI200`,
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'FORMATTED_STRING'
    });

    if (!response.data.values) {
      console.log('No data found in sheet');
      return res.status(404).json({ error: 'No data found' });
    }

    res.json(response.data.values);
  } catch (error) {
    console.error('Detailed error:', {
      message: error.message,
      stack: error.stack,
      details: error.response?.data
    });
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/update-password', async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    const sheets = google.sheets({ version: 'v4', auth });

    // First, get the employee data to verify current password
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'employee_data!A2:G200', // Adjust range as needed
    });

    if (!response.data.values) {
      return res.status(404).json({ error: 'User data not found' });
    }

    // Find user row by email
    const userRowIndex = response.data.values.findIndex(row => row[2] === email);
    if (userRowIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password (assuming password is in column F, index 5)
    const storedPassword = response.data.values[userRowIndex][5];
    if (storedPassword !== currentPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Update password
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: `employee_data!F${userRowIndex + 2}`, // +2 because we started from A2
      valueInputOption: 'RAW',
      resource: {
        values: [[newPassword]]
      }
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});