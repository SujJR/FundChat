import axios from 'axios';

const API_URL = 'http://localhost:8000'; // Update with your backend URL

export const fetchFunds = async () => {
  const response = await axios.get(`${API_URL}/api/funds`);
  return response.data;
};

export const fetchFundDetails = async (fundId: string) => {
  const response = await axios.get(`${API_URL}/api/funds/${fundId}`);
  return response.data;
};

export const uploadDocument = async (formData: FormData) => {
  const response = await axios.post(`${API_URL}/api/upload`, formData);
  return response.data;
};

export const sendChatMessage = async (message: string, fundId?: string | null) => {
  if (fundId) {
    // If a fund ID is provided, use the fund-specific chat endpoint
    const response = await axios.post(`${API_URL}/api/funds/${fundId}/chat`, {
      message,
      top_k: 3
    });
    return response.data;
  } else {
    // Otherwise, use the general query endpoint
    const response = await axios.post(`${API_URL}/api/query`, {
      query: message,
      top_k: 3
    });
    return response.data;
  }
}; 