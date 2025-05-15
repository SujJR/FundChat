import axios from 'axios';
import apiConfig from '../config/api';

// Create an axios instance with the API configuration
const apiClient = axios.create(apiConfig);

export const getDocumentContent = async (documentId: string) => {
  try {
    const response = await apiClient.get(`/api/documents/${documentId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching document content:', error);
    throw error;
  }
};

// Function to upload attachments in chat
export const uploadChatAttachment = async (file: File, fundId?: string) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    // Different endpoint based on whether we're in a fund chat or general chat
    let url = `/api/chat/upload`;
    if (fundId) {
      url = `/api/funds/${fundId}/chat/upload`;
      formData.append('fund_id', fundId);
    }
    
    const response = await apiClient.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error uploading chat attachment:', error);
    throw error;
  }
};