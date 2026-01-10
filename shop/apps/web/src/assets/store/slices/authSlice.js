// FILE: apps/web/src/store/slices/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '@/utils/api';
import Cookies from 'js-cookie';

// SECURITY FIX: Use a unique storage key per tab to prevent cross-tab collision
const TAB_ID = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const AUTH_STORAGE_KEY = `auth_${TAB_ID}`;

const initialState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  initialized: false, // Tracks if we've completed the initial auth check
  tabId: TAB_ID, // Track this tab's unique ID
};

export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { rejectWithValue, getState }) => {
    // Prevent multiple initialization attempts
    const state = getState();
    if (state.auth.initialized) {
      return state.auth.user ? { user: state.auth.user, accessToken: state.auth.accessToken } : null;
    }

    try {
      // SECURITY FIX: Try to get token from sessionStorage first (tab-specific)
      let accessToken = sessionStorage.getItem(AUTH_STORAGE_KEY);

      // Fallback to cookie for backward compatibility, but clear it immediately
      if (!accessToken) {
        accessToken = Cookies.get('accessToken');
        if (accessToken) {
          // Migrate from cookie to sessionStorage
          sessionStorage.setItem(AUTH_STORAGE_KEY, accessToken);
          Cookies.remove('accessToken');
        }
      }

      // If no access token, try to refresh using the refresh token (stored as httpOnly cookie)
      if (!accessToken) {
        try {
          const refreshRes = await api.post('/auth/refresh');
          const newAccessToken = refreshRes.data.data.accessToken;

          // SECURITY FIX: Store in sessionStorage instead of cookie
          sessionStorage.setItem(AUTH_STORAGE_KEY, newAccessToken);

          // Now get user data with the new token
          const res = await api.get('/auth/me');
          return { user: res.data.data, accessToken: newAccessToken };
        } catch (refreshErr) {
          // No valid refresh token either, user needs to login
          // Don't throw an error, just return null (not authenticated)
          return null;
        }
      }

      // Access token exists, verify it by fetching user data
      const res = await api.get('/auth/me'); // Authorization header comes from api interceptor
      return { user: res.data.data, accessToken };
    } catch (err) {
      // If /auth/me fails, clear the token and return null (not authenticated)
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      Cookies.remove('accessToken');
      return null;
    }
  }
);

export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const res = await api.post('/auth/login', credentials);
      const { accessToken, user } = res.data.data;

      // SECURITY FIX: Store token in sessionStorage (tab-specific) instead of cookie
      sessionStorage.setItem(AUTH_STORAGE_KEY, accessToken);

      // Clear any legacy cookie
      Cookies.remove('accessToken');

      return { user, accessToken };
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Login failed');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post('/auth/register', payload);
      const { accessToken, user } = res.data.data;

      // SECURITY FIX: Store token in sessionStorage (tab-specific) instead of cookie
      sessionStorage.setItem(AUTH_STORAGE_KEY, accessToken);

      // Clear any legacy cookie
      Cookies.remove('accessToken');

      return { user, accessToken };
    } catch (err) {
      const error = err.response?.data?.error;
      // Include validation details if available
      if (error?.details && error.details.length > 0) {
        return rejectWithValue(error.details[0].message);
      }
      return rejectWithValue(error?.message || 'Registration failed');
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await api.post('/auth/logout');

      // SECURITY FIX: Clear sessionStorage instead of cookie
      sessionStorage.removeItem(AUTH_STORAGE_KEY);

      // Clear any legacy cookie
      Cookies.remove('accessToken');

      return null;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Logout failed');
    }
  }
);

// Refresh user profile data (useful after KYC approval, profile updates, etc.)
export const refreshUser = createAsyncThunk(
  'auth/refreshUser',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/auth/me');
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to refresh user data');
    }
  }
);

const slice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;

      // SECURITY FIX: Store in sessionStorage instead of cookie
      sessionStorage.setItem(AUTH_STORAGE_KEY, action.payload.accessToken);
    },
    clearCredentials: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.initialized = false;

      // SECURITY FIX: Clear sessionStorage instead of cookie
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      Cookies.remove('accessToken');
    },
    updateUserProfile: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    setUser: (state, action) => {
      state.user = action.payload;
    },
    forceInitialized: (state) => {
      // Force initialization to complete (used as timeout fallback)
      state.loading = false;
      state.initialized = true;
      // Don't change authentication state - keep existing values
    },
  },
  extraReducers: (b) => {
    b.addCase(initializeAuth.pending, (s) => { s.loading = true; s.error = null; })
     .addCase(initializeAuth.fulfilled, (s, a) => {
       s.loading = false;
       s.initialized = true;
       if (a.payload) {
         s.user = a.payload.user;
         s.accessToken = a.payload.accessToken;
         s.isAuthenticated = true;
       } else {
         // No user data (not authenticated), but initialization is complete
         s.user = null;
         s.accessToken = null;
         s.isAuthenticated = false;
       }
     })
     .addCase(initializeAuth.rejected, (s, a) => { s.loading = false; s.error = null; s.isAuthenticated = false; s.initialized = true; s.user = null; s.accessToken = null; })

     .addCase(login.pending, (s) => { s.loading = true; s.error = null; })
     .addCase(login.fulfilled, (s, a) => {
       s.loading = false;
       s.user = a.payload.user;
       s.accessToken = a.payload.accessToken;
       s.isAuthenticated = true;
       s.initialized = true; // Mark as initialized after successful login
     })
     .addCase(login.rejected, (s, a) => { s.loading = false; s.error = a.payload; s.initialized = true; })

     .addCase(register.pending, (s) => { s.loading = true; s.error = null; })
     .addCase(register.fulfilled, (s, a) => {
       s.loading = false;
       s.user = a.payload.user;
       s.accessToken = a.payload.accessToken;
       s.isAuthenticated = true;
       s.initialized = true; // Mark as initialized after successful registration
     })
     .addCase(register.rejected, (s, a) => { s.loading = false; s.error = a.payload; s.initialized = true; })

     .addCase(logout.fulfilled, (s) => {
       s.user = null;
       s.accessToken = null;
       s.isAuthenticated = false;
       s.error = null;
       s.initialized = false; // Allow re-initialization after logout
     })

     .addCase(refreshUser.pending, (s) => { s.loading = true; })
     .addCase(refreshUser.fulfilled, (s, a) => {
       s.loading = false;
       s.user = a.payload;
     })
     .addCase(refreshUser.rejected, (s) => { s.loading = false; });
  },
});

export const { setCredentials, clearCredentials, updateUserProfile, setUser, forceInitialized } = slice.actions;
export default slice.reducer;
