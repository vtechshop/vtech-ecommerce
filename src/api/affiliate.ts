import apiClient from './client';
import { ApiResponse, Affiliate } from '../types';

export const affiliateApi = {
  apply: (data: { panNumber?: string; gstNumber?: string; bankDetails?: object }) =>
    apiClient.post<ApiResponse<Affiliate>>('/affiliates/apply', data),

  getProfile: () =>
    apiClient.get<ApiResponse<Affiliate>>('/affiliates/profile'),

  // Links
  getLinks: (params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<object[]>>('/affiliates/links', { params }),

  createLink: (productId: string) =>
    apiClient.post<ApiResponse<{ url: string; code: string }>>('/affiliates/links', { productId }),

  // Commissions
  getCommissions: (params?: { page?: number; limit?: number; status?: string }) =>
    apiClient.get<ApiResponse<object[]>>('/affiliates/commissions', { params }),

  // Payouts
  getPayouts: (params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<object[]>>('/affiliates/payouts', { params }),

  requestPayout: (amount: number) =>
    apiClient.post<ApiResponse<null>>('/affiliates/payouts', { amount }),

  // KYC
  submitKYC: (data: FormData) =>
    apiClient.post<ApiResponse<null>>('/affiliates/kyc', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Stats
  getStats: () =>
    apiClient.get<ApiResponse<{ clicks: number; conversions: number; earnings: number }>>('/affiliates/stats'),

  // Razorpay
  connectRazorpay: (data: object) =>
    apiClient.post<ApiResponse<null>>('/affiliates/razorpay/connect', data),
};
