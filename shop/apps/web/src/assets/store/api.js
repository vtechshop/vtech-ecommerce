// FILE: apps/web/src/utils/api.js
import axios from 'axios';
import Cookies from 'js-cookie';
import store from './index';
import { clearCredentials } from './slices/authSlice';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // Important: send cookies with every request
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // refreshToken is httpOnly cookie, sent automatically with credentials
        const response = await axios.post('/api/auth/refresh', {}, {
          withCredentials: true // Important: send cookies with request
        });
        const { accessToken } = response.data.data;

        Cookies.set('accessToken', accessToken, { expires: 1/96 });

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and let the app handle redirect
        Cookies.remove('accessToken');
        store.dispatch(clearCredentials());
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;