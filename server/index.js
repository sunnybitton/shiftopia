import express from 'express';
import cors from 'cors';
import { google } from 'googleapis';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Configure CORS with specific origins
const corsOptions = {
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:4173',
      'https://shiftopia.netlify.app',
      'https://shiftopia-app.netlify.app',
      'https://shiftopia-backend.onrender.com'
    ];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || 
        origin.endsWith('netlify.app') || 
        origin.endsWith('netlify.live') ||
        origin.endsWith('onrender.com')) {
      callback(null, true);
    } else {
      console.log('Origin not allowed by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
  exposedHeaders: ['Access-Control-Allow-Origin']
};

app.use(cors(corsOptions));
app.use(express.json());

// Add pre-flight handling
app.options('*', cors(corsOptions));

// Add headers middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', true);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin, Accept');
  next();
});

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
    sslmode: 'require'
  },
  max: 20, // Reduced from 50 to prevent connection overload
  min: 4,  // Increased from 0 to maintain some connections
  idleTimeoutMillis: 1000 * 60 * 5, // 5 minutes
  connectionTimeoutMillis: 10000, // Reduced to 10 seconds
  keepAlive: true,
  keepAliveInitialDelayMillis: 1000 * 10, // Reduced to 10 seconds
  application_name: 'shiftopia',
  statement_timeout: 10000, // Reduced to 10 seconds
  query_timeout: 10000 // Reduced to 10 seconds
});

// Add better error handling with reconnection logic
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client:', {
    message: err.message,
    code: err.code,
    stack: err.stack,
    detail: err.detail
  });

  if (err.code === 'ECONNRESET' || err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('Connection lost. Will attempt to reconnect on next query.');
  }
});

// Add connection validation with retry logic
const validateAndCleanPool = async (retryCount = 0) => {
  const MAX_RETRIES = 5;
  const RETRY_DELAY = 5000; // 5 seconds

  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT 1');
      if (result.rows[0]['?column?'] === 1) {
        console.log('Database connection validated');
      }
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error validating pool:', {
      message: err.message,
      code: err.code,
      stack: err.stack,
      detail: err.detail
    });
    
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying validation in ${RETRY_DELAY/1000} seconds... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return validateAndCleanPool(retryCount + 1);
    }
    console.error('Max retries reached for database validation');
  }
};

// Test database connection
pool.query('SELECT NOW()', async (err, res) => {
  if (err) {
    console.error('Database connection error:', {
      message: err.message,
      code: err.code,
      stack: err.stack,
      detail: err.detail
    });
    console.log('Database URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@')); // Hide password
    console.log('Environment:', process.env.NODE_ENV);
    console.log('SSL Enabled:', true);
    console.log('Connection Pool Config:', {
      max: pool.options.max,
      idleTimeoutMillis: pool.options.idleTimeoutMillis,
      connectionTimeoutMillis: pool.options.connectionTimeoutMillis,
      ssl: !!pool.options.ssl
    });
  } else {
    console.log('Database connected successfully at:', res.rows[0].now);
    await validateAndCleanPool();
  }
});

// Validate connections every 5 minutes
const poolValidationInterval = setInterval(validateAndCleanPool, 1000 * 60 * 5);

// Cleanup on process exit
process.on('SIGTERM', () => {
  clearInterval(poolValidationInterval);
  pool.end();
});

process.on('SIGINT', () => {
  clearInterval(poolValidationInterval);
  pool.end();
});

// Initialize database connection with retries
const initializeDatabase = async (retryCount = 0) => {
  const MAX_RETRIES = 5;
  const RETRY_DELAY = 5000; // 5 seconds

  try {
    await validateAndCleanPool();
    console.log('Database connection initialized successfully');
    
    // Check if employees table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'employees'
      );
    `);
    console.log('Checking if employees table exists:', tableCheck.rows[0]);

    if (!tableCheck.rows[0].exists) {
      console.log('Creating employees table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS employees (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          role VARCHAR(50) NOT NULL,
          phone VARCHAR(50),
          username VARCHAR(255) NOT NULL UNIQUE,
          password TEXT,
          column_preferences JSONB DEFAULT '{
            "visibleColumns": ["id", "role", "phone", "username", "name", "email"],
            "columnOrder": ["name", "email", "role", "username", "phone", "id"]
          }'::jsonb,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS employees_role_idx ON employees(role);
        CREATE INDEX IF NOT EXISTS employees_email_idx ON employees(email);
        CREATE INDEX IF NOT EXISTS employees_username_idx ON employees(username);
      `);
      console.log('Employees table created successfully');
    } else {
      // Check if updated_at column exists
      const columnCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'employees' 
          AND column_name = 'updated_at'
        );
      `);
      
      if (!columnCheck.rows[0].exists) {
        console.log('Adding updated_at column to employees table...');
        await pool.query(`
          ALTER TABLE employees 
          ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
          
          -- Add trigger to automatically update updated_at
          CREATE OR REPLACE FUNCTION update_employees_updated_at()
          RETURNS TRIGGER AS $$
          BEGIN
              NEW.updated_at = CURRENT_TIMESTAMP;
              RETURN NEW;
          END;
          $$ language 'plpgsql';

          DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
          CREATE TRIGGER update_employees_updated_at
              BEFORE UPDATE ON employees
              FOR EACH ROW
              EXECUTE FUNCTION update_employees_updated_at();
        `);
        console.log('Added updated_at column successfully');
      }
    }

    // Log table structure
    const tableInfo = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'employees'
    `);
    console.log('Current table structure:', tableInfo.rows);
  } catch (error) {
    console.error('Error initializing database:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      detail: error.detail
    });
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying initialization in ${RETRY_DELAY/1000} seconds... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return initializeDatabase(retryCount + 1);
    }
    throw error;
  }
};

// Test database connection and initialize
pool.query('SELECT NOW()', async (err, res) => {
  if (err) {
    console.error('Database connection error:', {
      message: err.message,
      code: err.code,
      stack: err.stack,
      detail: err.detail
    });
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
  const client = await pool.connect();
  try {
    console.log('GET /api/employees - Fetching all employees');
    
    // Test database connection first
    console.log('Testing database connection...');
    const testConnection = await client.query('SELECT NOW()');
    console.log('Database connection test successful:', testConnection.rows[0]);
    
    // Check if employees table exists
    console.log('Checking if employees table exists...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'employees'
      );
    `);
    console.log('Employees table exists:', tableCheck.rows[0]);

    if (!tableCheck.rows[0].exists) {
      throw new Error('Employees table does not exist');
    }

    console.log('Fetching employees...');
    const result = await client.query(`
      SELECT id, name, email, role, phone, username 
      FROM employees 
      ORDER BY name
    `);
    console.log(`Found ${result.rows.length} employees`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching employees:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      detail: error.detail,
      hint: error.hint
    });
    res.status(500).json({ 
      error: 'Failed to fetch employees',
      details: error.message,
      code: error.code
    });
  } finally {
    client.release();
  }
});

app.get('/api/employees/email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const result = await pool.query(`
      SELECT id, name, email, role, phone, username 
      FROM employees 
      WHERE email = $1
    `, [email]);
    
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
  const client = await pool.connect();
  try {
    const { name, email, role, phone, username, password } = req.body;
    
    console.log('Creating employee with data:', {
      name,
      email,
      role,
      phone,
      username,
      hasPassword: !!password
    });

    // Validate required fields
    const requiredFields = { name, email, role, phone, username, password };
    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([field]) => field);

    if (missingFields.length > 0) {
      console.error('Missing required fields:', {
        missingFields,
        receivedFields: Object.keys(req.body),
        receivedValues: requiredFields
      });
      return res.status(400).json({ 
        error: 'All fields are required',
        missingFields
      });
    }

    // Check if email or username exists in active employees
    console.log('Checking for existing user...');
    const existingUser = await client.query(`
      SELECT email, username 
      FROM employees 
      WHERE email = $1 OR username = $2
    `, [email, username]);

    if (existingUser.rows.length > 0) {
      const existing = existingUser.rows[0];
      if (existing.email === email) {
        return res.status(400).json({ 
          error: 'This email is already taken',
          field: 'email'
        });
      }
      if (existing.username === username) {
        return res.status(400).json({ 
          error: 'This username is already taken',
          field: 'username'
        });
      }
    }

    // Create new employee
    console.log('Creating new employee...');
    const result = await client.query(`
      INSERT INTO employees (name, email, role, phone, username, password) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING id, name, email, role, phone, username
    `, [name, email, role, phone, username, password]);
    
    console.log('Employee created successfully');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating employee:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      detail: error.detail,
      hint: error.hint
    });
    
    // Check for unique constraint violations
    if (error.code === '23505') { // unique_violation
      if (error.constraint?.includes('email')) {
        return res.status(400).json({ 
          error: 'This email is already taken',
          field: 'email'
        });
      }
      if (error.constraint?.includes('username')) {
        return res.status(400).json({ 
          error: 'This username is already taken',
          field: 'username'
        });
      }
    }
    
    res.status(500).json({ 
      error: 'Failed to create employee',
      details: error.message,
      code: error.code
    });
  } finally {
    client.release();
  }
});

app.put('/api/employees/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');  // Start transaction
    
    const { id } = req.params;
    const { name, email, role, phone, username } = req.body;

    console.log('Updating employee with data:', {
      id,
      name,
      email,
      role,
      phone,
      username,
      receivedBody: JSON.stringify(req.body)
    });

    // Validate ID is a number
    const employeeId = parseInt(id);
    if (isNaN(employeeId)) {
      await client.query('ROLLBACK');
      console.error('Invalid employee ID:', id);
      return res.status(400).json({ error: 'Invalid employee ID' });
    }

    // Validate required fields
    const requiredFields = { name, email, role, phone, username };
    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([field]) => field);

    if (missingFields.length > 0) {
      await client.query('ROLLBACK');
      console.error('Missing required fields:', {
        missingFields,
        receivedFields: Object.keys(req.body),
        receivedValues: requiredFields
      });
      return res.status(400).json({ 
        error: 'All fields are required',
        missingFields
      });
    }

    // First check if employee exists
    console.log('Checking if employee exists:', employeeId);
    const checkEmployee = await client.query(
      'SELECT id FROM employees WHERE id = $1',
      [employeeId]
    );

    if (checkEmployee.rows.length === 0) {
      await client.query('ROLLBACK');
      console.error('Employee not found:', employeeId);
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Check if email or username is already taken by another employee
    console.log('Checking for existing user with same email/username');
    const existingUser = await client.query(`
      SELECT id, email, username 
      FROM employees 
      WHERE (email = $1 OR username = $2) AND id != $3
    `, [email, username, employeeId]);

    if (existingUser.rows.length > 0) {
      const existing = existingUser.rows[0];
      console.log('Found existing user:', existing);
      if (existing.email === email) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: 'This email is already taken by another employee',
          field: 'email'
        });
      }
      if (existing.username === username) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: 'This username is already taken by another employee',
          field: 'username'
        });
      }
    }

    // Update the employee
    console.log('Updating employee in database');
    const updateQuery = `
      UPDATE employees 
      SET name = $1, 
          email = $2, 
          role = $3, 
          phone = $4, 
          username = $5,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6 
      RETURNING id, name, email, role, phone, username, updated_at
    `;
    
    console.log('Executing query with params:', {
      name,
      email,
      role,
      phone,
      username,
      id: employeeId
    });

    try {
      const result = await client.query(updateQuery, [
        name,
        email,
        role,
        phone,
        username,
        employeeId
      ]);
      
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        console.error('Update failed - no rows returned');
        return res.status(404).json({ error: 'Employee not found' });
      }
      
      console.log('Update successful:', result.rows[0]);
      await client.query('COMMIT');
      res.json(result.rows[0]);
    } catch (queryError) {
      await client.query('ROLLBACK');
      console.error('Error executing update query:', {
        error: queryError,
        message: queryError.message,
        code: queryError.code,
        detail: queryError.detail,
        query: updateQuery,
        params: [name, email, role, phone, username, employeeId]
      });
      throw queryError;
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Detailed error updating employee:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      detail: error.detail,
      hint: error.hint,
      constraint: error.constraint,
      table: error.table,
      column: error.column,
      dataTypes: error.dataTypes,
      routine: error.routine,
      where: error.where,
      position: error.position,
      internalPosition: error.internalPosition,
      internalQuery: error.internalQuery,
      severity: error.severity,
      context: error.context
    });
    
    // Check for specific error types
    if (error.code === '23505') { // unique_violation
      if (error.constraint?.includes('email')) {
        return res.status(400).json({ 
          error: 'This email is already taken',
          field: 'email'
        });
      }
      if (error.constraint?.includes('username')) {
        return res.status(400).json({ 
          error: 'This username is already taken',
          field: 'username'
        });
      }
    }
    
    // Add more specific error handling
    if (error.code === '23502') { // not_null_violation
      return res.status(400).json({
        error: `Required field cannot be null: ${error.column}`,
        field: error.column
      });
    }
    
    if (error.code === '23503') { // foreign_key_violation
      return res.status(400).json({
        error: 'Referenced record does not exist',
        details: error.detail
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to update employee',
      details: error.message,
      code: error.code
    });
  } finally {
    client.release();
  }
});

app.delete('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM employees WHERE id = $1 RETURNING id, name, email',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json({ 
      message: 'Employee deleted successfully',
      employee: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

// Authentication endpoints
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('Login attempt:', { email, hasPassword: !!password });
    
    if (!email || !password) {
      console.error('Missing credentials:', { hasEmail: !!email, hasPassword: !!password });
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.query(
      'SELECT id, name, email, role, phone, username FROM employees WHERE email = $1 AND password = $2',
      [email, password]
    );
    
    console.log('Query result:', { 
      rowCount: result.rowCount,
      hasRows: result.rows.length > 0,
      userFound: result.rows.length > 0 ? 'Yes' : 'No'
    });
    
    if (result.rows.length === 0) {
      console.log('Invalid credentials for:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    console.log('Successful login for:', email);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Detailed login error:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint,
      table: error.table,
      column: error.column
    });
    res.status(500).json({ error: 'Login failed', details: error.message });
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
      'SELECT id FROM employees WHERE email = $1 AND password = $2',
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
      'UPDATE employees SET password = $1 WHERE email = $2',
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
        WHERE email = $1
      `, [email]);

      console.log('Current user state:', checkUser.rows[0]);
      
      // Set the password
      const result = await pool.query(`
        UPDATE employees 
        SET password = $1 
        WHERE email = $2
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
        SELECT id, name, email, password
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
        WHERE email = $2
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
        ORDER BY name
      `);
      
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching employee credentials:', error);
      res.status(500).json({ error: error.message });
    }
  });
}

// Column preferences endpoints
app.get('/api/settings/column-preferences', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT column_preferences 
      FROM employees 
      WHERE role = 'manager' 
      LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      return res.json({
        visibleColumns: ["id", "role", "phone", "username", "name", "email"],
        columnOrder: ["name", "email", "role", "username", "phone", "id"]
      });
    }
    
    res.json(result.rows[0].column_preferences);
  } catch (error) {
    console.error('Error fetching column preferences:', error);
    res.status(500).json({ error: 'Failed to fetch column preferences' });
  }
});

app.put('/api/settings/column-preferences', async (req, res) => {
  try {
    const { visibleColumns, columnOrder } = req.body;
    
    // Validate required fields
    if (!visibleColumns || !columnOrder) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Ensure 'name' column is always visible
    if (!visibleColumns.includes('name')) {
      return res.status(400).json({ error: 'The name column must remain visible' });
    }

    // Update all manager accounts
    await pool.query(`
      UPDATE employees 
      SET column_preferences = $1::jsonb 
      WHERE role = 'manager'
    `, [{ visibleColumns, columnOrder }]);
    
    res.json({ message: 'Column preferences updated successfully' });
  } catch (error) {
    console.error('Error updating column preferences:', error);
    res.status(500).json({ error: 'Failed to update column preferences' });
  }
});

app.post('/api/settings/column-preferences/reset', async (req, res) => {
  try {
    const defaultPreferences = {
      visibleColumns: ["id", "role", "phone", "username", "name", "email"],
      columnOrder: ["name", "email", "role", "username", "phone", "id"]
    };

    await pool.query(`
      UPDATE employees 
      SET column_preferences = $1::jsonb 
      WHERE role = 'manager'
    `, [defaultPreferences]);
    
    res.json(defaultPreferences);
  } catch (error) {
    console.error('Error resetting column preferences:', error);
    res.status(500).json({ error: 'Failed to reset column preferences' });
  }
});

// Worksheet endpoints
app.get('/api/worksheets', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM worksheets ORDER BY year DESC, month DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching worksheets:', err);
    res.status(500).json({ error: 'Failed to fetch worksheets' });
  }
});

app.post('/api/worksheets', async (req, res) => {
  try {
    const { month, year, name, status, stations } = req.body;
    
    console.log('Creating worksheet with data:', {
      month,
      year,
      name,
      status,
      stations: stations,
      stationsType: typeof stations,
      stationsIsArray: Array.isArray(stations)
    });

    // Validate required fields
    if (!month || !year || !name || !status) {
      console.log('Missing required fields:', { month, year, name, status });
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: { month, year, name, status }
      });
    }

    // Ensure stations is an array and convert to JSONB
    const stationsData = Array.isArray(stations) ? stations : [];
    console.log('Processed stations data:', stationsData);
    
    try {
      const result = await pool.query(
        'INSERT INTO worksheets (month, year, name, status, stations) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [month, year, name, status, JSON.stringify(stationsData)]
      );

      console.log('Worksheet created successfully:', result.rows[0]);
      res.status(201).json(result.rows[0]);
    } catch (dbError) {
      console.error('Database error:', {
        message: dbError.message,
        detail: dbError.detail,
        code: dbError.code,
        constraint: dbError.constraint
      });
      throw dbError;
    }
  } catch (err) {
    console.error('Error creating worksheet:', {
      message: err.message,
      stack: err.stack,
      code: err.code,
      detail: err.detail
    });
    res.status(500).json({ 
      error: 'Failed to create worksheet',
      details: err.message,
      code: err.code
    });
  }
});

app.put('/api/worksheets/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  // Validate status
  if (!status || !['draft', 'published'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be either "draft" or "published".' });
  }

  try {
    console.log(`Updating worksheet ${id} status to ${status}`);
    
    // First check if the worksheet exists
    const checkResult = await pool.query(
      'SELECT id FROM worksheets WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Worksheet not found' });
    }

    // Update the status
    const result = await pool.query(
      'UPDATE worksheets SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );

    console.log('Update successful:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating worksheet status:', err);
    res.status(500).json({ error: 'Failed to update worksheet status', details: err.message });
  }
});

app.delete('/api/worksheets/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM worksheets WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Worksheet not found' });
    }
    res.json({ message: 'Worksheet deleted successfully' });
  } catch (err) {
    console.error('Error deleting worksheet:', err);
    res.status(500).json({ error: 'Failed to delete worksheet' });
  }
});

app.get('/api/worksheets/:id/entries', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM worksheet_entries WHERE worksheet_id = $1 ORDER BY day, workstation',
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching worksheet entries:', err);
    res.status(500).json({ error: 'Failed to fetch worksheet entries' });
  }
});

app.post('/api/worksheets/:id/entries', async (req, res) => {
  const { id } = req.params;
  const { day, workstation, employee_assigned } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO worksheet_entries (worksheet_id, day, workstation, employee_assigned)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (worksheet_id, day, workstation)
       DO UPDATE SET employee_assigned = $4, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [id, day, workstation, employee_assigned]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating worksheet entry:', err);
    res.status(500).json({ error: 'Failed to update worksheet entry' });
  }
});

// Stations endpoints
app.get('/api/stations', async (req, res) => {
  try {
    console.log('GET /api/stations - Attempting to fetch stations');
    
    // Test database connection first
    const testConnection = await pool.query('SELECT NOW()');
    console.log('Database connection test successful:', testConnection.rows[0]);
    
    const result = await pool.query(
      'SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2)',
      ['public', 'stations']
    );
    console.log('Checking if stations table exists:', result.rows[0]);

    if (!result.rows[0].exists) {
      console.log('Stations table does not exist, creating it now...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS stations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          short_code VARCHAR(50) NOT NULL,
          display_order INTEGER NOT NULL DEFAULT 0,
          attributes JSONB NOT NULL DEFAULT '{
              "maxEmployees": 1,
              "color": "#808080",
              "requiresCertification": [],
              "overlapAllowed": false
          }'::jsonb,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS stations_display_order_idx ON stations(display_order);
        CREATE UNIQUE INDEX IF NOT EXISTS stations_short_code_idx ON stations(short_code);

        -- Add trigger for updated_at
        CREATE OR REPLACE FUNCTION update_stations_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ language 'plpgsql';

        CREATE TRIGGER update_stations_updated_at
            BEFORE UPDATE ON stations
            FOR EACH ROW
            EXECUTE FUNCTION update_stations_updated_at();
      `);
      console.log('Stations table created successfully');
    }

    const stations = await pool.query('SELECT * FROM stations ORDER BY display_order');
    console.log(`Found ${stations.rows.length} stations`);
    res.json(stations.rows);
  } catch (error) {
    console.error('Error in GET /api/stations:', error);
    res.status(500).json({ error: 'Failed to fetch stations', details: error.message });
  }
});

app.post('/api/stations', async (req, res) => {
  try {
    const { name, short_code, attributes } = req.body;
    
    // Get the highest display_order
    const orderResult = await pool.query(
      'SELECT COALESCE(MAX(display_order), -1) + 1 as next_order FROM stations'
    );
    const nextOrder = orderResult.rows[0].next_order;

    const result = await pool.query(
      `INSERT INTO stations (name, short_code, display_order, attributes)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, short_code, nextOrder, attributes]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating station:', error);
    if (error.constraint === 'stations_short_code_idx') {
      res.status(400).json({ error: 'Short code must be unique' });
    } else {
      res.status(500).json({ error: 'Failed to create station' });
    }
  }
});

app.put('/api/stations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const result = await pool.query(
      `UPDATE stations 
       SET name = COALESCE($1, name),
           short_code = COALESCE($2, short_code),
           attributes = stations.attributes || $3::jsonb
       WHERE id = $4
       RETURNING *`,
      [updates.name, updates.short_code, updates.attributes || {}, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Station not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating station:', error);
    if (error.constraint === 'stations_short_code_idx') {
      res.status(400).json({ error: 'Short code must be unique' });
    } else {
      res.status(500).json({ error: 'Failed to update station' });
    }
  }
});

app.put('/api/stations/reorder', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { stations } = req.body;
    for (const { id, order } of stations) {
      await client.query(
        'UPDATE stations SET display_order = $1 WHERE id = $2',
        [order, id]
      );
    }
    
    await client.query('COMMIT');
    
    const result = await client.query(
      'SELECT * FROM stations ORDER BY display_order'
    );
    res.json(result.rows);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error reordering stations:', error);
    res.status(500).json({ error: 'Failed to reorder stations' });
  } finally {
    client.release();
  }
});

app.delete('/api/stations/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    
    // Get the current display_order
    const orderResult = await client.query(
      'SELECT display_order FROM stations WHERE id = $1',
      [id]
    );
    
    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Station not found' });
    }
    
    const currentOrder = orderResult.rows[0].display_order;
    
    // Delete the station
    await client.query('DELETE FROM stations WHERE id = $1', [id]);
    
    // Update the display_order of remaining stations
    await client.query(
      'UPDATE stations SET display_order = display_order - 1 WHERE display_order > $1',
      [currentOrder]
    );
    
    await client.query('COMMIT');
    res.json({ message: 'Station deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting station:', error);
    res.status(500).json({ error: 'Failed to delete station' });
  } finally {
    client.release();
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT NOW() as time');
      res.json({ 
        status: 'healthy',
        database: {
          status: 'connected',
          timestamp: result.rows[0].time,
          ssl: !!pool.options.ssl,
          environment: process.env.NODE_ENV
        },
        server: {
          timestamp: new Date().toISOString(),
          port: process.env.PORT,
          nodeEnv: process.env.NODE_ENV
        }
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Health check failed:', err);
    res.status(503).json({ 
      status: 'unhealthy',
      database: {
        status: 'disconnected',
        error: err.message,
        code: err.code,
        ssl: !!pool.options.ssl,
        environment: process.env.NODE_ENV
      },
      server: {
        timestamp: new Date().toISOString(),
        port: process.env.PORT,
        nodeEnv: process.env.NODE_ENV
      }
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});