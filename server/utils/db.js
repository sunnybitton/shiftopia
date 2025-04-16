const { pool } = require('../index');

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 2000; // 2 seconds

/**
 * Execute a database query with retry logic
 * @param {Function} queryFn - Function that returns a promise for the query
 * @param {string} operationName - Name of the operation for logging
 * @returns {Promise} - Query result
 */
async function executeWithRetry(queryFn, operationName = 'database query') {
  let lastError;
  let retryCount = 0;

  while (retryCount < MAX_RETRIES) {
    try {
      const client = await pool.connect();
      try {
        // Test the connection first with a simple query
        await client.query('SELECT 1');
        
        // If test succeeds, execute the actual query
        const result = await queryFn(client);
        return result;
      } finally {
        client.release();
      }
    } catch (err) {
      lastError = err;
      retryCount++;

      // Log detailed error information
      console.error(`Database error (attempt ${retryCount}/${MAX_RETRIES}):`, {
        message: err.message,
        code: err.code,
        detail: err.detail,
        hint: err.hint,
        position: err.position,
        operationName
      });

      // Only retry on connection-related errors
      if (!isRetryableError(err)) {
        console.error('Non-retryable error encountered:', err.message);
        throw err;
      }

      if (retryCount < MAX_RETRIES) {
        // Exponential backoff with some randomization
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount - 1) * (1 + Math.random() * 0.1);
        console.log(`Retry ${retryCount}/${MAX_RETRIES} for ${operationName} after ${Math.round(delay)}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error(`Failed ${operationName} after ${MAX_RETRIES} retries. Last error:`, lastError);
  throw lastError;
}

/**
 * Check if an error is retryable
 * @param {Error} err - The error to check
 * @returns {boolean} - Whether the error is retryable
 */
function isRetryableError(err) {
  const retryableCodes = [
    'ECONNRESET',
    'PROTOCOL_CONNECTION_LOST',
    'ETIMEDOUT',
    'EPIPE',
    'ECONNREFUSED',
    '57P01', // terminating connection due to administrator command
    '08006', // connection failure
    '08001', // unable to establish connection
    '08004'  // rejected connection
  ];

  const retryableMessages = [
    'Connection terminated unexpectedly',
    'terminating connection due to administrator command',
    'connection is closed',
    'Connection refused',
    'timeout expired',
    'Connection terminated'
  ];

  return (
    retryableCodes.includes(err.code) ||
    retryableMessages.some(msg => err.message.includes(msg))
  );
}

// Export a function to test the connection
async function testConnection() {
  return executeWithRetry(
    async (client) => {
      const result = await client.query('SELECT version()');
      return result.rows[0];
    },
    'connection test'
  );
}

module.exports = {
  executeWithRetry,
  testConnection
}; 