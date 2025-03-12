import pkg from 'pg';
const { Pool } = pkg;
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('Database connection successful!');
    console.log('Current time from database:', result.rows[0].now);
    
    // Drop the existing table
    await pool.query('DROP TABLE IF EXISTS employees');
    console.log('Dropped existing employees table');
    
    // Create the employees table with new schema
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(50),
        worker_id VARCHAR(50) UNIQUE,
        phone VARCHAR(50),
        username VARCHAR(255) UNIQUE,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await pool.query(createTableQuery);
    console.log('Employees table created with new schema successfully!');
    
    // Test inserting a sample employee
    const testEmployee = {
      name: 'Test User',
      email: 'test@example.com',
      role: 'Staff',
      worker_id: 'W123',
      phone: '555-0123',
      username: 'testuser'
    };
    
    try {
      const insertResult = await pool.query(
        'INSERT INTO employees(name, email, role, worker_id, phone, username) VALUES($1, $2, $3, $4, $5, $6) ON CONFLICT (email) DO NOTHING RETURNING *',
        [testEmployee.name, testEmployee.email, testEmployee.role, testEmployee.worker_id, testEmployee.phone, testEmployee.username]
      );
      
      if (insertResult.rows.length > 0) {
        console.log('Test employee inserted successfully:', insertResult.rows[0]);
      } else {
        console.log('Test employee already exists (which is fine)');
      }
      
      // Query all employees
      const allEmployees = await pool.query('SELECT * FROM employees');
      console.log('\nCurrent employees in database:', allEmployees.rows);
      
    } catch (err) {
      console.error('Error during employee operations:', err);
    }
    
  } catch (err) {
    console.error('Database test failed:', err);
  } finally {
    await pool.end();
  }
}

testConnection(); 