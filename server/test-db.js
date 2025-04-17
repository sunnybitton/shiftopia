import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
    sslmode: 'require'
  }
});

async function testConnection() {
  try {
    console.log('Testing database connection...');
    console.log('Database URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@')); // Hide password
    
    const client = await pool.connect();
    console.log('Successfully connected to database');
    
    // Test basic query
    const result = await client.query('SELECT NOW()');
    console.log('Current database time:', result.rows[0].now);
    
    // Check if employees table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'employees'
      );
    `);
    console.log('Employees table exists:', tableCheck.rows[0].exists);
    
    if (tableCheck.rows[0].exists) {
      // Check table structure
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'employees'
        ORDER BY ordinal_position;
      `);
      console.log('Employees table structure:', columns.rows);
      
      // Count employees
      const count = await client.query('SELECT COUNT(*) FROM employees');
      console.log('Number of employees:', count.rows[0].count);
    }
    
    client.release();
  } catch (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection(); 