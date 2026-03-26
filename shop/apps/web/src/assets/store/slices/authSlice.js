// FILE: apps/web/src/store/slices/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '@/utils/api';
import Cookies from 'js-cookie';

const initialState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  initialized: false, // Tracks if we've completed the initial auth check
};

export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { rejectWithValue, getState }) => {
    // Prevent multiple initialization attempts
    const state = getState();
    if (state.auth.initialized) {
      return state.auth.user ? { user: state.auth.user, accessToken: state.auth.accessToken } : null;
    }

    const tryRefresh = async () => {
      const refreshRes = await api.post('/auth/refresh');
      const newAccessToken = refreshRes.data.data.accessToken;
      Cookies.set('accessToken', newAccessToken, {
        expires: 1, // 1 day (JWT expiry enforced server-side; interceptor handles 401 refresh)
        sameSite: 'Lax',
        secure: window.location.protocol === 'https:',
      });
      const res = await api.get('/auth/me');
      return { user: res.data.data, accessToken: newAccessToken };
    };

    try {
      // Get token from cookie (persists across page reloads)
      const accessToken = Cookies.get('accessToken');

      if (accessToken) {
        try {
          // Verify token by fetching user data
          const res = await api.get('/auth/me');
          return { user: res.data.data, accessToken };
        } catch (meErr) {
          if (meErr.response?.status === 401) {
            // Access token expired — attempt refresh before giving up
            Cookies.remove('accessToken');
            try {
              return await tryRefresh();
            } catch {
              return null; // Refresh token also invalid, user must log in
            }
          }
          // Non-401 error (network, server error) — clear token and bail
          Cookies.remove('accessToken');
          return null;
        }
      }

      // No access token in cookie — try refresh using httpOnly refreshToken cookie
      try {
        return await tryRefresh();
      } catch {
        return null; // No valid session, user needs to login
      }
    } catch (err) {
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

      // Store token in cookie (persists across refreshes)
      Cookies.set('accessToken', accessToken, {
        expires: 1, // 1 day (JWT expiry enforced server-side; interceptor handles 401 refresh)
        sameSite: 'Lax',
        secure: window.location.protocol === 'https:',
      });

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

      // Store token in cookie (persists across refreshes)
      Cookies.set('accessToken', accessToken, {
        expires: 1, // 1 day (JWT expiry enforced server-side; interceptor handles 401 refresh)
        sameSite: 'Lax',
        secure: window.location.protocol === 'https:',
      });

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

      // Clear cookie
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

      // Store in cookie
      Cookies.set('accessToken', action.payload.accessToken, {
        expires: 1, // 1 day (JWT expiry enforced server-side; interceptor handles 401 refresh)
        sameSite: 'Lax',
        secure: window.location.protocol === 'https:',
      });
    },
    clearCredentials: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.initialized = false;

      // Clear cookie
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
