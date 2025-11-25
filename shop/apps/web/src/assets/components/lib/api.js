// FILE: apps/web/src/assets/lib/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  withCredentials: true, // send cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// (optional) basic error logger
api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error('[API ERROR]', err.response?.data || err.message);
    throw err;
  }
);

export default api;
