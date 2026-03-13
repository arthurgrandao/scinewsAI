import axios from 'axios';
import { triggerLogout } from './authCallbacks';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log error details for debugging
    console.error('API Error:', {
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
      message: error.message,
    });

    if (error.response?.status === 401) {
      console.warn('Unauthorized (401) response received - logging out');
      // Clear auth data on 401
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('scinewsai_user');
      
      // Trigger logout in auth context
      triggerLogout();
    }
    return Promise.reject(error);
  }
);

export default api;
