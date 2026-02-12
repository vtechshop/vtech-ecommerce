import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as SecureStore from 'expo-secure-store';
import { authApi } from '../../api/auth';
import { User } from '../../types';
import { TOKEN_KEYS } from '../../utils/constants';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await authApi.login(email, password);
      const { user, accessToken } = response.data.data;
      await SecureStore.setItemAsync(TOKEN_KEYS.ACCESS, accessToken);
      // Refresh token is sent as httpOnly cookie — extract from Set-Cookie header
      const setCookie = response.headers?.['set-cookie'];
      if (setCookie) {
        const match = Array.isArray(setCookie) ? setCookie.join(';') : setCookie;
        const rtMatch = match.match(/refreshToken=([^;]+)/);
        if (rtMatch) await SecureStore.setItemAsync(TOKEN_KEYS.REFRESH, rtMatch[1]);
      }
      return user;
    } catch (error: any) {
      const msg = error.response?.data?.error?.message
        || error.response?.data?.message
        || error.message
        || 'Login failed';
      return rejectWithValue(msg);
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData: { name: string; email: string; password: string; phone?: string }, { rejectWithValue }) => {
    try {
      const response = await authApi.register(userData);
      const { user, accessToken } = response.data.data;
      await SecureStore.setItemAsync(TOKEN_KEYS.ACCESS, accessToken);
      const setCookie = response.headers?.['set-cookie'];
      if (setCookie) {
        const match = Array.isArray(setCookie) ? setCookie.join(';') : setCookie;
        const rtMatch = match.match(/refreshToken=([^;]+)/);
        if (rtMatch) await SecureStore.setItemAsync(TOKEN_KEYS.REFRESH, rtMatch[1]);
      }
      return user;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || error.response?.data?.message || 'Registration failed');
    }
  }
);

export const loadUser = createAsyncThunk(
  'auth/loadUser',
  async (_, { rejectWithValue }) => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEYS.ACCESS);
      if (!token) throw new Error('No token');
      const { data } = await authApi.getProfile();
      return data.data;
    } catch (error: any) {
      await SecureStore.deleteItemAsync(TOKEN_KEYS.ACCESS);
      await SecureStore.deleteItemAsync(TOKEN_KEYS.REFRESH);
      return rejectWithValue('Session expired');
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    await authApi.logout();
  } catch {}
  await SecureStore.deleteItemAsync(TOKEN_KEYS.ACCESS);
  await SecureStore.deleteItemAsync(TOKEN_KEYS.REFRESH);
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder.addCase(login.pending, (state) => { state.isLoading = true; state.error = null; });
    builder.addCase(login.fulfilled, (state, action) => { state.isLoading = false; state.isAuthenticated = true; state.user = action.payload; });
    builder.addCase(login.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; });
    // Register
    builder.addCase(register.pending, (state) => { state.isLoading = true; state.error = null; });
    builder.addCase(register.fulfilled, (state, action) => { state.isLoading = false; state.isAuthenticated = true; state.user = action.payload; });
    builder.addCase(register.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; });
    // Load User
    builder.addCase(loadUser.pending, (state) => { state.isLoading = true; });
    builder.addCase(loadUser.fulfilled, (state, action) => { state.isLoading = false; state.isAuthenticated = true; state.user = action.payload; });
    builder.addCase(loadUser.rejected, (state) => { state.isLoading = false; state.isAuthenticated = false; state.user = null; });
    // Logout
    builder.addCase(logout.fulfilled, (state) => { state.isAuthenticated = false; state.user = null; });
  },
});

export const { clearError, setUser } = authSlice.actions;
export default authSlice.reducer;
