// api.ts - Base API client with interceptors
import axios, { AxiosResponse, AxiosError } from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - could redirect to login
      console.error('Unauthorized - token may be expired');
    }
    return Promise.reject(error);
  }
);

export default api;