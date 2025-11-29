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
let csrfTokenPromise = null;

/**
 * Initialize CSRF protection by fetching token from server
 * Only active in production mode
 */
export const initCsrfProtection = async () => {
  // Only enable CSRF in production
  if (import.meta.env.MODE !== 'production') {
    return null;
  }

  // If already fetching, return the existing promise
  if (csrfTokenPromise) {
    return csrfTokenPromise;
  }

  csrfTokenPromise = (async () => {
    try {
      // Use axios directly to avoid interceptor loops
      const response = await axios.get(`${baseURL}/csrf-token`, {
        withCredentials: true,
        timeout: 10000,
      });
      csrfToken = response.data.data.csrfToken;
      return csrfToken;
    } catch (error) {
      console.warn('Failed to fetch CSRF token:', error.message);
      csrfToken = null;
      return null;
    } finally {
      // Reset promise after a delay to allow retry
      setTimeout(() => {
        csrfTokenPromise = null;
      }, 5000);
    }
  })();

  return csrfTokenPromise;
};

/**
 * Get CSRF token, fetching if necessary
 */
const getCsrfToken = async () => {
  if (import.meta.env.MODE !== 'production') {
    return null;
  }

  if (csrfToken) {
    return csrfToken;
  }

  return initCsrfProtection();
};

// Attach access token from cookie to every request
api.interceptors.request.use(async (config) => {
  const token = Cookies.get('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Add CSRF token to non-GET requests in production
  if (import.meta.env.MODE === 'production') {
    const method = config.method?.toUpperCase();
    if (method && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      // Ensure we have a CSRF token before making state-changing requests
      // Skip for csrf-token endpoint to avoid circular dependency
      if (!config.url?.includes('/csrf-token')) {
        const currentToken = csrfToken || await getCsrfToken();
        if (currentToken) {
          config.headers['X-CSRF-Token'] = currentToken;
        }
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
        error.response?.data?.error?.code === 'CSRF_VALIDATION_FAILED' &&
        import.meta.env.MODE === 'production' &&
        !originalRequest._csrfRetry) {
      originalRequest._csrfRetry = true;
      // Clear the old token and fetch a new one
      csrfToken = null;
      csrfTokenPromise = null;
      const newToken = await initCsrfProtection();
      if (newToken) {
        originalRequest.headers['X-CSRF-Token'] = newToken;
      }
      // Retry the request with new token
      return api.request(originalRequest);
    }

    // Don't try to refresh on login/register/refresh/me endpoints
    const isAuthEndpoint = originalRequest.url?.includes('/auth/login') ||
                          originalRequest.url?.includes('/auth/register') ||
                          originalRequest.url?.includes('/auth/refresh') ||
                          originalRequest.url?.includes('/auth/me');

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

        // Store new access token (15 minutes) with proper settings for mobile
        Cookies.set('accessToken', accessToken, {
          expires: 1/96,
          sameSite: 'Lax',
          secure: window.location.protocol === 'https:',
        });

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

        // Don't redirect here - let the authSlice handle the redirect
        // Redirecting here causes infinite loops as it reloads the page
        // and triggers initializeAuth again

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
