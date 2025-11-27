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
};

export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { rejectWithValue }) => {
    try {
      const accessToken = Cookies.get('accessToken');

      // If no access token, try to refresh using the refresh token
      if (!accessToken) {
        try {
          const refreshRes = await api.post('/auth/refresh');
          const newAccessToken = refreshRes.data.data.accessToken;
          Cookies.set('accessToken', newAccessToken, {
            expires: 1/96,
            sameSite: 'Lax',
            secure: window.location.protocol === 'https:',
          });

          // Now get user data with the new token
          const res = await api.get('/auth/me');
          return { user: res.data.data, accessToken: newAccessToken };
        } catch (refreshErr) {
          // No valid refresh token either, user needs to login
          return null;
        }
      }

      // Access token exists, verify it by fetching user data
      const res = await api.get('/auth/me'); // Authorization header comes from api interceptor
      return { user: res.data.data, accessToken };
    } catch (err) {
      // If /auth/me fails, the interceptor will try to refresh automatically
      // If that also fails, we return null (not an error, just not authenticated)
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
      // store token in cookie (15 minutes) with proper settings for mobile
      Cookies.set('accessToken', accessToken, {
        expires: 1/96,
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
      Cookies.set('accessToken', accessToken, {
        expires: 1/96,
        sameSite: 'Lax',
        secure: window.location.protocol === 'https:',
      });
      return { user, accessToken };
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Registration failed');
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await api.post('/auth/logout');
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
      Cookies.set('accessToken', action.payload.accessToken, { expires: 1/96 });
    },
    clearCredentials: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
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
  },
  extraReducers: (b) => {
    b.addCase(initializeAuth.pending, (s) => { s.loading = false; s.error = null; })
     .addCase(initializeAuth.fulfilled, (s, a) => {
       s.loading = false;
       if (a.payload) {
         s.user = a.payload.user;
         s.accessToken = a.payload.accessToken;
         s.isAuthenticated = true;
       }
     })
     .addCase(initializeAuth.rejected, (s, a) => { s.loading = false; s.error = null; s.isAuthenticated = false; })

     .addCase(login.pending, (s) => { s.loading = true; s.error = null; })
     .addCase(login.fulfilled, (s, a) => {
       s.loading = false;
       s.user = a.payload.user;
       s.accessToken = a.payload.accessToken;
       s.isAuthenticated = true;
     })
     .addCase(login.rejected, (s, a) => { s.loading = false; s.error = a.payload; })

     .addCase(register.pending, (s) => { s.loading = true; s.error = null; })
     .addCase(register.fulfilled, (s, a) => {
       s.loading = false;
       s.user = a.payload.user;
       s.accessToken = a.payload.accessToken;
       s.isAuthenticated = true;
     })
     .addCase(register.rejected, (s, a) => { s.loading = false; s.error = a.payload; })

     .addCase(logout.fulfilled, (s) => {
       s.user = null;
       s.accessToken = null;
       s.isAuthenticated = false;
       s.error = null;
     })

     .addCase(refreshUser.pending, (s) => { s.loading = true; })
     .addCase(refreshUser.fulfilled, (s, a) => {
       s.loading = false;
       s.user = a.payload;
     })
     .addCase(refreshUser.rejected, (s) => { s.loading = false; });
  },
});

export const { setCredentials, clearCredentials, updateUserProfile, setUser } = slice.actions;
export default slice.reducer;
