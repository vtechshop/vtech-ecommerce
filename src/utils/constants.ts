// API base URL
// Always use production Render URL — 10.0.2.2 only works on Android emulator,
// not on physical devices. Change to local IP only when running backend locally
// AND testing on an emulator (e.g. 'http://10.0.2.2:8080/api').
export const API_BASE_URL = 'https://vtech-ecommerce.onrender.com/api';


export const TOKEN_KEYS = {
  ACCESS: 'vtech_access_token',
  REFRESH: 'vtech_refresh_token',
};

// SecureStore options - disable biometric/fingerprint prompts
export const SECURE_STORE_OPTIONS = {
  requireAuthentication: false,
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
