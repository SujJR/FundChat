import axios from 'axios';
import apiConfig from '../config/api';

// Create an axios instance with the API configuration
const apiClient = axios.create(apiConfig);

export const fetchFunds = async () => {
  try {
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    const response = await apiClient.get(`/api/funds?_ts=${timestamp}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching funds:', error);
    // Return empty funds array rather than throwing, to prevent UI errors
    return { funds: [] };
  }
};

export const fetchFundDetails = async (fundId: string) => {
  try {
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    const response = await apiClient.get(`/api/funds/${fundId}?_ts=${timestamp}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching fund details:', error);
    throw error;
  }
};

export const uploadDocument = async (formData: FormData) => {
  try {
    const response = await apiClient.post(`/api/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
};

export const deleteFund = async (fundId: string) => {
  try {
    const response = await apiClient.delete(`/api/funds/${fundId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting fund:', error);
    throw error;
  }
};