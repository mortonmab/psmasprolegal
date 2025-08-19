import axios from 'axios';

// API base URL - adjust this based on your backend port
const API_BASE_URL = 'http://localhost:3000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // Increased timeout to 30 seconds
});

// Request interceptor for authentication and logging
api.interceptors.request.use(
  (config) => {
    // Add authentication token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Don't set Content-Type for FormData (let browser set it with boundary)
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Generic API methods
export const apiService = {
  // GET request
  async get<T>(endpoint: string, params?: any): Promise<T> {
    const response = await api.get(endpoint, { params });
    return response.data;
  },

  // POST request
  async post<T>(endpoint: string, data?: any, config?: any): Promise<T> {
    const response = await api.post(endpoint, data, config);
    return response.data;
  },

  // PUT request
  async put<T>(endpoint: string, data?: any): Promise<T> {
    const response = await api.put(endpoint, data);
    return response.data;
  },

  // DELETE request
  async delete<T>(endpoint: string): Promise<T> {
    const response = await api.delete(endpoint);
    return response.data;
  },

  // PATCH request
  async patch<T>(endpoint: string, data?: any): Promise<T> {
    const response = await api.patch(endpoint, data);
    return response.data;
  },
};

export default apiService;
