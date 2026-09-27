import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL !== undefined 
    ? import.meta.env.VITE_API_URL 
    : (import.meta.env.PROD ? '' : 'http://localhost:5000'),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor — unwrap data, handle errors cleanly
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // Suppress console warning for standard 404 lookups (such as checking if an unscanned image has scan history)
    if (error.response?.status !== 404) {
      const message = error.response?.data?.message || error.message || 'Network Error';
      console.warn(`[API] ${message}`);
    }
    return Promise.reject(error);
  }
);

export default api;
