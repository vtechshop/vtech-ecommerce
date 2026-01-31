// API base URL - update for production
export const API_BASE_URL = __DEV__
  ? 'http://10.0.2.2:8080/api' // Android emulator -> localhost
  : 'https://your-production-api.com/api';

// For iOS simulator, use: http://localhost:8080/api
// For physical device on same WiFi, use your computer's local IP:
// http://192.168.x.x:8080/api

export const RAZORPAY_KEY = 'your_razorpay_key';

export const TOKEN_KEYS = {
  ACCESS: 'vtech_access_token',
  REFRESH: 'vtech_refresh_token',
};

export const ROLES = {
  GUEST: 'guest',
  CUSTOMER: 'customer',
  VENDOR: 'vendor',
  AFFILIATE: 'affiliate',
  ADMIN: 'admin',
  SUPPORT: 'support',
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];
