import apiClient from './client';
import { ApiResponse, LoginResponse, User } from '../types';

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<ApiResponse<LoginResponse>>('/auth/login', { email, password }),

  register: (data: { name: string; email: string; password: string; phone?: string }) =>
    apiClient.post<ApiResponse<LoginResponse>>('/auth/register', data),

  refresh: (refreshToken: string) =>
    apiClient.post<ApiResponse<{ tokens: { accessToken: string; refreshToken: string } }>>('/auth/refresh', { refreshToken }),

  verifyEmail: (token: string) =>
    apiClient.post<ApiResponse<null>>('/auth/verify-email', { token }),

  resendVerification: () =>
    apiClient.post<ApiResponse<null>>('/auth/resend-verification'),

  forgotPassword: (email: string) =>
    apiClient.post<ApiResponse<null>>('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    apiClient.post<ApiResponse<null>>('/auth/reset-password', { token, password }),

  me: () =>
    apiClient.get<ApiResponse<User>>('/auth/me'),

  getProfile: () =>
    apiClient.get<ApiResponse<User>>('/user/profile'),

  updateProfile: (data: Partial<User>) =>
    apiClient.put<ApiResponse<User>>('/user/profile', data),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.put<ApiResponse<null>>('/user/password', { currentPassword, newPassword }),

  logout: () =>
    apiClient.post<ApiResponse<null>>('/auth/logout'),
};
