// FILE: apps/web/src/utils/api.js
import axios from 'axios';
import Cookies from 'js-cookie';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL,
  withCredentials: true, // for refreshToken cookie
  timeout: 30000, // 30 second timeout to prevent hanging requests
});

// Flag to prevent multiple simultaneous refresh requests
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// CSRF Protection (Production Only)
let csrfToken = null;

/**
 * Initialize CSRF protection by fetching token from server
 * Only active in production mode
 */
export const initCsrfProtection = async () => {
  // Only enable CSRF in production
  if (import.meta.env.MODE !== 'production') {
    return;
  }

  try {
    const response = await api.get('/csrf-token');
    csrfToken = response.data.data.csrfToken;
    console.log('[CSRF] Protection initialized');
  } catch (error) {
    console.error('[CSRF] Failed to fetch token:', error);
  }
};

// Attach access token from cookie to every request
api.interceptors.request.use((config) => {
  const token = Cookies.get('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Add CSRF token to non-GET requests in production
  if (import.meta.env.MODE === 'production') {
    const method = config.method?.toUpperCase();
    if (method && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }
  }

  // Let axios set the correct Content-Type for FormData automatically
  if (config.data instanceof FormData) {
    if (config.headers && 'Content-Type' in config.headers) {
      delete config.headers['Content-Type'];
    }
  } else {
    config.headers = { ...(config.headers || {}), Accept: 'application/json' };
  }

  return config;
});

// Handle 401 responses by attempting to refresh the token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle CSRF token errors (403 with CSRF error code)
    if (error.response?.status === 403 &&
        error.response?.data?.error?.code === 'CSRF_TOKEN_INVALID' &&
        import.meta.env.MODE === 'production') {
      console.warn('[CSRF] Invalid token, refreshing...');
      await initCsrfProtection();
      // Retry the request with new token
      return api.request(originalRequest);
    }

    // Don't try to refresh on login/register/refresh endpoints
    const isAuthEndpoint = originalRequest.url?.includes('/auth/login') ||
                          originalRequest.url?.includes('/auth/register') ||
                          originalRequest.url?.includes('/auth/refresh');

    // If error is 401 and we haven't tried to refresh yet, and it's not an auth endpoint
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt to refresh the token
        const response = await api.post('/auth/refresh');
        const { accessToken } = response.data.data;

        // Store new access token (15 minutes)
        Cookies.set('accessToken', accessToken, { expires: 1/96 });

        // Update authorization header
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        // Process queued requests
        processQueue(null, accessToken);

        // Retry original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - clear tokens and reject all queued requests
        processQueue(refreshError, null);
        Cookies.remove('accessToken');

        // Redirect to login if we're not already there
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
