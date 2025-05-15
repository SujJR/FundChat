import axios from 'axios';
import apiConfig from '../config/api';

// Create an axios instance with the API configuration
const apiClient = axios.create(apiConfig);

export const sendChatMessage = async (message: string, fundId?: string | null) => {
  try {
    if (fundId) {
      // If a fund ID is provided, use the fund-specific chat endpoint
      const response = await apiClient.post(`/api/funds/${fundId}/chat`, {
        message,
        top_k: 3
      });
      return response.data;
    } else {
      // Otherwise, use the general query endpoint
      const response = await apiClient.post(`/api/query`, {
        query: message,
        fund_id: null,
        top_k: 3
      });
      return response.data;
    }
  } catch (error) {
    console.error('Error sending chat message:', error);
    throw error;
  }
};