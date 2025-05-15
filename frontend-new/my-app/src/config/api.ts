// API Configuration
// This file centralizes all API configuration settings

// Determine the API URL based on environment variables or defaults
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Export the API configuration
const apiConfig = {
  baseURL: API_URL,
  timeout: 15000, // 15 seconds timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
};

export default apiConfig;