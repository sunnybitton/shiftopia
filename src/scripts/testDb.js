import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const { Pool } = pg;

const MAX_RETRIES = 5;
const RETRY_DELAY = 5000; // 5 seconds

const sslConfig = {
  rejectUnauthorized: true,
  ca: process.env.SSL_CA,
  key: process.env.SSL_KEY,
  cert: process.env.SSL_CERT,
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Render's free tier
  },
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
  max: 1
});

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testConnection(retryCount = 0) {
  let client;
  try {
    console.log('Database URL:', process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':****@')); // Hide password
    console.log('Attempting to connect with the following config:');
    console.log('Connection timeout:', pool.options.connectionTimeoutMillis);
    console.log('SSL enabled:', !!pool.options.ssl);
    
    console.log(`Connection attempt ${retryCount + 1}/${MAX_RETRIES + 1}...`);
    client = await pool.connect();
    
    // Test basic connectivity with a simple query first
    try {
      const result = await client.query('SELECT 1');
      console.log('Basic connection test successful');
    } catch (err) {
      console.error('Basic connection test failed:', err);
      throw err;
    }
    
    // If basic test passes, try more complex queries
    const timeResult = await client.query('SELECT NOW()');
    console.log('Current database time:', timeResult.rows[0].now);
    
    // Get PostgreSQL version
    const versionResult = await client.query('SELECT version()');
    console.log('Database version:', versionResult.rows[0].version);
    
    // List available schemas
    const schemasResult = await client.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog')
    `);
    console.log('Available schemas:', schemasResult.rows.map(row => row.schema_name));
    
    console.log('Database connection test successful!');
    return true;
  } catch (error) {
    console.error(`Connection error (attempt ${retryCount + 1}/${MAX_RETRIES + 1}):`, {
      message: error.message,
      code: error.code,
      detail: error.detail,
    });
    
    if (retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAY * (retryCount + 1); // Exponential backoff
      console.log(`Retrying in ${delay/1000} seconds...`);
      await sleep(delay);
      return testConnection(retryCount + 1);
    }
    
    throw error;
  } finally {
    client?.release();
  }
}

// Run the test
testConnection()
  .then(() => {
    console.log('Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Final error:', error);
    process.exit(1);
  })
  .finally(() => {
    pool.end();
  }); 