import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

async function checkServer() {
  const baseUrl = process.env.VITE_API_URL || 'http://localhost:3001';
  
  console.log('Checking server at:', baseUrl);
  
  try {
    // Try the health endpoint first
    console.log('\nTesting health endpoint...');
    const healthResponse = await fetch(`${baseUrl}/health`);
    const healthData = await healthResponse.json();
    console.log('Health check response:', healthData);

    // Try the employees endpoint
    console.log('\nTesting employees endpoint...');
    const employeesResponse = await fetch(`${baseUrl}/employees`);
    if (employeesResponse.ok) {
      console.log('Employees endpoint is working');
    }

    // Try the stations endpoint
    console.log('\nTesting stations endpoint...');
    const stationsResponse = await fetch(`${baseUrl}/stations`);
    if (stationsResponse.ok) {
      console.log('Stations endpoint is working');
    }

    console.log('\nServer is up and running!');
  } catch (error) {
    console.error('\nServer check failed:', error.message);
    console.log('\nPossible issues:');
    console.log('1. Server is not running');
    console.log('2. Server is running on a different port');
    console.log('3. Environment variables are not set correctly');
    console.log('\nCurrent environment:');
    console.log('VITE_API_URL:', process.env.VITE_API_URL);
  }
}

checkServer(); 