import { useState, useEffect } from 'react';
import axios from 'axios';

const ApiDebug = () => {
  const [status, setStatus] = useState<string>('Checking...');
  const [error, setError] = useState<string | null>(null);
  const [apiUrl, setApiUrl] = useState<string>('');

  useEffect(() => {
    // Get the API URL from environment variables
    const envApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    setApiUrl(envApiUrl);

    // Try to connect to the backend
    const checkApi = async () => {
      try {
        const response = await axios.get(`${envApiUrl}`, { timeout: 5000 });
        setStatus(`Connected! Response: ${JSON.stringify(response.data)}`);
      } catch (err: any) {
        setStatus('Failed to connect');
        setError(err.message || 'Unknown error');
        console.error('API connection error:', err);
      }
    };

    checkApi();
  }, []);

  if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_DEBUG) {
    return null; // Don't show in production unless debug is enabled
  }

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '10px', 
      right: '10px',
      padding: '10px', 
      background: '#f0f0f0',
      border: '1px solid #ddd',
      borderRadius: '5px',
      zIndex: 9999,
      maxWidth: '400px'
    }}>
      <h4 style={{ margin: '0 0 10px 0' }}>API Debug Info</h4>
      <p><strong>API URL:</strong> {apiUrl}</p>
      <p><strong>Status:</strong> {status}</p>
      {error && <p style={{ color: 'red' }}><strong>Error:</strong> {error}</p>}
    </div>
  );
};

export default ApiDebug;