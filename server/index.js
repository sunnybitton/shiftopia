import express from 'express';
import cors from 'cors';
import { google } from 'googleapis';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Configure CORS with specific origins
const corsOptions = {
  origin: [
    'http://localhost:5173',  // Vite dev server
    'http://localhost:3000',  // Local production build
    'http://localhost:4173',  // Vite preview
    'https://shiftopia.netlify.app',  // Main Netlify domain
    'https://shiftopia-app.netlify.app', // Alternative Netlify domain
    'https://shiftopia-backend.onrender.com', // Render.com backend
    /\.netlify\.app$/,  // Any Netlify subdomain
    /\.netlify\.live$/,  // Netlify deploy previews
    /\.onrender\.com$/   // Any Render.com domain
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// Database configuration
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Initialize database schema
async function initializeDatabase() {
  try {
    // Check if password column exists
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'employees' 
      AND column_name = 'password'
    `);

    if (checkColumn.rows.length === 0) {
      console.log('Adding password column to employees table...');
      await pool.query(`
        ALTER TABLE employees 
        ADD COLUMN IF NOT EXISTS password TEXT
      `);
      console.log('Password column added successfully');
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Test database connection and initialize schema
pool.query('SELECT NOW()', async (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected successfully');
    await initializeDatabase();
  }
});

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

// Google Sheets configuration
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

// Employee endpoints
app.get('/api/employees', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM employees WHERE active = true ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

app.get('/api/employees/email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const result = await pool.query(
      'SELECT * FROM employees WHERE email = $1 AND active = true',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching employee by email:', error);
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
});

app.post('/api/employees', async (req, res) => {
  try {
    const { name, email, role, worker_id, phone, username, password } = req.body;
    const result = await pool.query(
      'INSERT INTO employees (name, email, role, worker_id, phone, username, password) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, email, role, worker_id, phone, username, password]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

app.put('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, worker_id, phone, username } = req.body;
    const result = await pool.query(
      'UPDATE employees SET name = $1, email = $2, role = $3, worker_id = $4, phone = $5, username = $6 WHERE id = $7 AND active = true RETURNING *',
      [name, email, role, worker_id, phone, username, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

app.delete('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE employees SET active = false WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

// Authentication endpoints
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query(
      'SELECT id, name, email, role, worker_id, phone, username FROM employees WHERE email = $1 AND password = $2 AND active = true',
      [email, password]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Password update endpoint
app.post('/api/auth/update-password', async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    
    console.log('Password update request received:', {
      email,
      hasCurrentPassword: !!currentPassword,
      hasNewPassword: !!newPassword
    });
    
    if (!email || !currentPassword || !newPassword) {
      console.error('Missing required fields:', {
        hasEmail: !!email,
        hasCurrentPassword: !!currentPassword,
        hasNewPassword: !!newPassword
      });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log('Attempting to verify current password for email:', email);

    // First verify the current password
    const verifyResult = await pool.query(
      'SELECT id FROM employees WHERE email = $1 AND password = $2 AND active = true',
      [email, currentPassword]
    );

    console.log('Verify result:', {
      rowCount: verifyResult.rowCount,
      hasRows: verifyResult.rows.length > 0
    });

    if (verifyResult.rows.length === 0) {
      console.error('Invalid credentials for user:', email);
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    console.log('Current password verified, attempting to update password');

    // Update the password
    const updateResult = await pool.query(
      'UPDATE employees SET password = $1 WHERE email = $2 AND active = true RETURNING id',
      [newPassword, email]
    );

    console.log('Update result:', {
      rowCount: updateResult.rowCount,
      hasRows: updateResult.rows.length > 0
    });

    if (updateResult.rows.length === 0) {
      console.error('Failed to update password for user:', email);
      return res.status(500).json({ error: 'Failed to update password' });
    }

    console.log('Password updated successfully for user:', email);
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Detailed error updating password:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint,
      table: error.table,
      column: error.column
    });
    res.status(500).json({ error: error.message || 'Failed to update password' });
  }
});

// Generic Google Sheets endpoints
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
    
    // Check for specific Google Sheets API errors
    if (error.code === 404) {
      return res.status(404).json({ error: 'Sheet not found' });
    }
    if (error.code === 403) {
      return res.status(403).json({ error: 'Access denied to sheet' });
    }
    
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sheets/:sheetName', async (req, res) => {
  try {
    const { sheetName } = req.params;
    const { range, values } = req.body;
    
    console.log('Attempting to update sheet:', sheetName);
    console.log('Range:', range);
    console.log('Values:', values);
    
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: `${sheetName}!${range}`,
      valueInputOption: 'RAW',
      resource: { values: [values] }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error updating sheet:', error);
    
    // Check for specific Google Sheets API errors
    if (error.code === 404) {
      return res.status(404).json({ error: 'Sheet not found' });
    }
    if (error.code === 403) {
      return res.status(403).json({ error: 'Access denied to sheet' });
    }
    
    res.status(500).json({ error: error.message });
  }
});

// Development endpoints - only available in development
if (process.env.NODE_ENV !== 'production') {
  // Force set password endpoint
  app.post('/api/dev/force-set-password', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // First check if user exists and get current state
      const checkUser = await pool.query(`
        SELECT id, name, email, password 
        FROM employees 
        WHERE email = $1 AND active = true
      `, [email]);

      console.log('Current user state:', checkUser.rows[0]);
      
      // Set the password
      const result = await pool.query(`
        UPDATE employees 
        SET password = $1 
        WHERE email = $2 AND active = true 
        RETURNING id, name, email
      `, [password, email]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      
      res.json({ 
        message: 'Password set successfully', 
        user: result.rows[0]
      });
    } catch (error) {
      console.error('Error setting password:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get user info endpoint
  app.get('/api/dev/user-info/:email', async (req, res) => {
    try {
      const { email } = req.params;
      const result = await pool.query(`
        SELECT id, name, email, password, active
        FROM employees 
        WHERE email = $1
      `, [email]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching user info:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Add endpoint to set initial password
  app.post('/api/dev/set-initial-password', async (req, res) => {
    try {
      const { email } = req.body;
      
      // Set a default password (e.g., "changeme")
      const defaultPassword = 'changeme';
      
      const result = await pool.query(`
        UPDATE employees 
        SET password = $1 
        WHERE email = $2 AND active = true 
        RETURNING id, name, email
      `, [defaultPassword, email]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      
      res.json({ 
        message: 'Password set successfully', 
        user: result.rows[0],
        defaultPassword 
      });
    } catch (error) {
      console.error('Error setting initial password:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all tables
  app.get('/api/dev/db-info', async (req, res) => {
    try {
      const tablesQuery = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      
      const tables = {};
      
      // Get columns for each table
      for (const table of tablesQuery.rows) {
        const columnsQuery = await pool.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = $1
        `, [table.table_name]);
        
        tables[table.table_name] = columnsQuery.rows;
      }
      
      res.json(tables);
    } catch (error) {
      console.error('Error fetching database info:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Simple endpoint to view employees table structure
  app.get('/api/dev/employees-info', async (req, res) => {
    try {
      // Get table structure
      const tableInfo = await pool.query(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'employees'
        ORDER BY ordinal_position;
      `);

      // Get a sample row
      const sampleRow = await pool.query(`
        SELECT * FROM employees LIMIT 1
      `);

      res.json({
        structure: tableInfo.rows,
        sampleData: sampleRow.rows[0] || null,
        totalRows: (await pool.query('SELECT COUNT(*) FROM employees')).rows[0].count
      });
    } catch (error) {
      console.error('Error fetching employees info:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Add new endpoint for viewing employee credentials
  app.get('/api/dev/employee-credentials', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT name, email, password 
        FROM employees 
        WHERE active = true 
        ORDER BY name
      `);
      
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching employee credentials:', error);
      res.status(500).json({ error: error.message });
    }
  });
}

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});