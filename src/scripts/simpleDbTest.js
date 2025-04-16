import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const { Client } = pg;

async function testConnection() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Attempting to connect to database...');
    await client.connect();
    console.log('Connected successfully!');
    
    const result = await client.query('SELECT NOW()');
    console.log('Current database time:', result.rows[0].now);
    
    const version = await client.query('SELECT version()');
    console.log('Database version:', version.rows[0].version);
    
    return true;
  } catch (err) {
    console.error('Connection error:', {
      message: err.message,
      code: err.code,
      detail: err.detail
    });
    throw err;
  } finally {
    await client.end();
  }
}

testConnection()
  .then(() => {
    console.log('Test completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  }); 