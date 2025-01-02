const SPREADSHEET_ID = '16_j8JPBclYMA8KKQ_UIj5IRIJbDw_PC44QnAhwrMJnw';
const API_KEY = 'AIzaSyBA-5naAXwWdr0wMOgwf-1qT34Kl5F3Xyw'; // Replace with your actual API key

export async function fetchSheetData(sheetName = 'DATA') {
  try {
    const encodedRange = encodeURIComponent(`${sheetName}!A1:CI200`);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodedRange}?key=${API_KEY}&majorDimension=ROWS`;
    
    console.log('Fetching from URL:', url); // Debug log
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('API Error:', errorData);
      throw new Error(`Failed to fetch sheet data: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log('Received data from API:', data); // Debug log
    
    if (!data.values) {
      throw new Error('No data received from Google Sheets');
    }

    console.log('Number of rows:', data.values.length); // Debug log
    return data.values;
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    throw error;
  }
}

export async function exportSheetToPDF(sheetName) {
  try {
    const SPREADSHEET_ID = '16_j8JPBclYMA8KKQ_UIj5IRIJbDw_PC44QnAhwrMJnw';
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?key=${API_KEY}&ranges=${sheetName}!A1:Z1000&includeGridData=true`;
    
    console.log('Fetching sheet data for PDF export:', url);
    
    const response = await fetch(url);
    
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