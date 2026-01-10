// FILE: apps/web/src/utils/api.js
import axios from 'axios';
import Cookies from 'js-cookie';
import store from './index';
import { clearCredentials } from './slices/authSlice';

// SECURITY FIX: Helper function to get tab-specific token from sessionStorage
const getAccessToken = () => {
  // Try to get token from Redux store first (most current)
  const storeToken = store.getState().auth.accessToken;
  if (storeToken) return storeToken;

  // Fallback to sessionStorage
  const tabId = store.getState().auth.tabId;
  const storageKey = `auth_${tabId}`;
  return sessionStorage.getItem(storageKey);
};

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
    // SECURITY FIX: Get token from sessionStorage instead of cookie
    const token = getAccessToken();
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

        // SECURITY FIX: Store in sessionStorage instead of cookie
        const tabId = store.getState().auth.tabId;
        const storageKey = `auth_${tabId}`;
        sessionStorage.setItem(storageKey, accessToken);

        // Clear any legacy cookie
        Cookies.remove('accessToken');

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and let the app handle redirect
        const tabId = store.getState().auth.tabId;
        const storageKey = `auth_${tabId}`;
        sessionStorage.removeItem(storageKey);
        Cookies.remove('accessToken');
        store.dispatch(clearCredentials());
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;