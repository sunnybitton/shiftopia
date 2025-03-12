import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Initialize environment
if (import.meta.env.DEV) {
  console.log('Running in development mode');
  console.log('API URL:', import.meta.env.VITE_API_URL);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)