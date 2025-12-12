// FILE: apps/web/src/utils/csrf.js
/**
 * CSRF Token Management
 * Handles fetching and storing CSRF tokens for API requests
 */

let csrfToken = null;

/**
 * Fetch CSRF token from the backend
 * @returns {Promise<string>} CSRF token
 */
export const fetchCsrfToken = async () => {
  try {
    const response = await fetch('/api/csrf-token', {
      method: 'GET',
      credentials: 'include', // Important: Include cookies
    });

    if (!response.ok) {
      throw new Error('Failed to fetch CSRF token');
    }

    const data = await response.json();
    csrfToken = data.data.csrfToken;

    // Store in sessionStorage as backup
    sessionStorage.setItem('csrfToken', csrfToken);

    return csrfToken;
  } catch (error) {
    console.error('Error fetching CSRF token:', error);

    // Try to get from sessionStorage as fallback
    const storedToken = sessionStorage.getItem('csrfToken');
    if (storedToken) {
      csrfToken = storedToken;
      return csrfToken;
    }

    throw error;
  }
};

/**
 * Get current CSRF token
 * @returns {Promise<string>} CSRF token
 */
export const getCsrfToken = async () => {
  if (csrfToken) {
    return csrfToken;
  }

  // Try to get from sessionStorage first
  const storedToken = sessionStorage.getItem('csrfToken');
  if (storedToken) {
    csrfToken = storedToken;
    return csrfToken;
  }

  // If not found, fetch new token
  return await fetchCsrfToken();
};

/**
 * Clear CSRF token (call on logout or token expiry)
 */
export const clearCsrfToken = () => {
  csrfToken = null;
  sessionStorage.removeItem('csrfToken');
};

/**
 * Add CSRF token to request headers
 * @param {Headers} headers - Request headers object
 * @returns {Promise<Headers>} Headers with CSRF token
 */
export const addCsrfToken = async (headers = {}) => {
  try {
    const token = await getCsrfToken();
    return {
      ...headers,
      'x-csrf-token': token,
    };
  } catch (error) {
    console.error('Failed to add CSRF token to headers:', error);
    return headers;
  }
};

/**
 * Initialize CSRF token on app load
 */
export const initializeCsrf = async () => {
  try {
    await fetchCsrfToken();
    console.log('CSRF token initialized');
  } catch (error) {
    console.error('Failed to initialize CSRF token:', error);
  }
};
