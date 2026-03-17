import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Single-fire guard — prevents duplicate toasts when multiple requests fail simultaneously
let isRedirecting = false;

// Handle auth errors (401 = no token, 403 = expired/invalid token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if ((status === 401 || status === 403) && !isRedirecting) {
      isRedirecting = true;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      toast.error('Session expired. Please sign in again.', { id: 'auth-error' });
      setTimeout(() => {
        window.location.href = '/login';
        isRedirecting = false;
      }, 1500);
    }
    return Promise.reject(error);
  }
);

export default api;
