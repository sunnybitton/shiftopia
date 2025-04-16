import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

async function pingService() {
  try {
    // Ping the API endpoint
    const response = await fetch(`${process.env.VITE_API_URL}/health`);
    if (response.ok) {
      const data = await response.json();
      console.log('Service ping successful:', data);
    } else {
      console.error('Service ping failed with status:', response.status);
      // Try to get error details
      try {
        const errorData = await response.json();
        console.error('Error details:', errorData);
      } catch (e) {
        // Ignore parse error
      }
    }
  } catch (err) {
    console.error('Ping failed:', err.message);
  }
}

// Ping every 14 minutes (just before the 15-minute sleep threshold)
const PING_INTERVAL = 14 * 60 * 1000;

console.log('Starting service keep-alive...');
console.log('Will ping service every 14 minutes');
console.log('API URL:', process.env.VITE_API_URL);

// Initial ping
pingService();

// Schedule regular pings
setInterval(pingService, PING_INTERVAL); 