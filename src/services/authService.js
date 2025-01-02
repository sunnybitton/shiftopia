import credentials from '../../credentials/client_credentials.json';

let gapiInitialized = false;

export async function initializeGoogleAuth() {
  if (gapiInitialized) return;

  return new Promise((resolve, reject) => {
    try {
      gapi.load('client', async () => {
        try {
          await gapi.client.init({
            apiKey: credentials.api_key,
            clientId: credentials.client_email,
            discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
            scope: 'https://www.googleapis.com/auth/spreadsheets'
          });

          gapi.client.setApiKey(credentials.api_key);
          
          gapi.client.setToken({
            access_token: credentials.private_key,
            token_type: 'Bearer'
          });

          gapiInitialized = true;
          resolve();
        } catch (initError) {
          console.error('Error initializing gapi client:', initError);
          reject(initError);
        }
      });
    } catch (loadError) {
      console.error('Error loading gapi client:', loadError);
      reject(loadError);
    }
  });
}

export async function ensureGoogleAuth() {
  if (!gapiInitialized) {
    await initializeGoogleAuth();
  }
  return true;
}