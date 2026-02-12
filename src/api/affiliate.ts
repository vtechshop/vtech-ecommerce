import apiClient from './client';
import { ApiResponse, Affiliate } from '../types';

export const affiliateApi = {
  apply: (data: { panNumber?: string; gstNumber?: string; bankDetails?: object }) =>
    apiClient.post<ApiResponse<Affiliate>>('/affiliates/apply', data),

  getProfile: () =>
    apiClient.get<ApiResponse<Affiliate>>('/affiliates/me'),

  updatePaymentDetails: (data: object) =>
    apiClient.put<ApiResponse<object>>('/affiliates/payment-details', data),

  // Links
  getLinks: (params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<object[]>>('/affiliates/links', { params }),

  createLink: (productId: string) =>
    apiClient.post<ApiResponse<{ url: string; code: string }>>('/affiliates/links/generate', { productId }),

  getProductLinks: (params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<object[]>>('/affiliates/links/product', { params }),

  deleteLink: (linkId: string) =>
    apiClient.delete<ApiResponse<null>>(`/affiliates/links/${linkId}`),

  // Commissions
  getCommissions: (params?: { page?: number; limit?: number; status?: string }) =>
    apiClient.get<ApiResponse<object[]>>('/affiliates/commissions', { params }),

  // Payouts
  getPayouts: (params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<object[]>>('/affiliates/payouts', { params }),

  requestPayout: (amount: number) =>
    apiClient.post<ApiResponse<object>>('/affiliates/payouts/request', { amount }),

  // KYC
  getKYC: () =>
    apiClient.get<ApiResponse<object>>('/affiliates/kyc'),

  updateKYC: (data: object) =>
    apiClient.put<ApiResponse<object>>('/affiliates/kyc', data),

  uploadKYCDocument: (data: FormData) =>
    apiClient.post<ApiResponse<null>>('/affiliates/kyc/documents', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Stats
  getDashboardStats: () =>
    apiClient.get<ApiResponse<object>>('/affiliates/dashboard/stats'),

  // Razorpay
  connectRazorpay: (data: object) =>
    apiClient.post<ApiResponse<null>>('/affiliates/razorpay/connect', data),

  getRazorpayStatus: () =>
    apiClient.get<ApiResponse<object>>('/affiliates/razorpay/status'),
};
