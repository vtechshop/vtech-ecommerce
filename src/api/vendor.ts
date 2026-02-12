import apiClient from './client';
import { ApiResponse, Vendor, Product, Order } from '../types';

export const vendorApi = {
  onboard: (data: {
    storeName: string;
    description?: string;
    gstNumber?: string;
    panNumber?: string;
    bankDetails?: object;
  }) => apiClient.post<ApiResponse<Vendor>>('/vendors/onboard', data),

  // Profile via settings
  getSettings: () =>
    apiClient.get<ApiResponse<object>>('/vendors/settings'),

  updateProfile: (data: Partial<Vendor>) =>
    apiClient.put<ApiResponse<Vendor>>('/vendors/settings/profile', data),

  updateBankDetails: (data: object) =>
    apiClient.put<ApiResponse<object>>('/vendors/settings/bank', data),

  updatePolicies: (data: object) =>
    apiClient.put<ApiResponse<object>>('/vendors/settings/policies', data),

  // KYC
  getKYC: () =>
    apiClient.get<ApiResponse<object>>('/vendors/kyc'),

  updateKYC: (data: object) =>
    apiClient.put<ApiResponse<object>>('/vendors/kyc', data),

  uploadKYCDocument: (data: FormData) =>
    apiClient.post<ApiResponse<null>>('/vendors/kyc/documents', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  deleteKYCDocument: (documentId: string) =>
    apiClient.delete<ApiResponse<null>>(`/vendors/kyc/documents/${documentId}`),

  // Categories (vendor-specific)
  getCategories: () =>
    apiClient.get<ApiResponse<object[]>>('/vendors/categories'),

  // Products
  getProducts: (params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<Product[]>>('/vendors/products', { params }),

  createProduct: (data: FormData) =>
    apiClient.post<ApiResponse<Product>>('/vendors/products', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  updateProduct: (id: string, data: FormData) =>
    apiClient.put<ApiResponse<Product>>(`/vendors/products/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  deleteProduct: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/vendors/products/${id}`),

  // Orders
  getOrderCounts: () =>
    apiClient.get<ApiResponse<object>>('/vendors/orders/counts'),

  getOrders: (params?: { page?: number; limit?: number; status?: string }) =>
    apiClient.get<ApiResponse<Order[]>>('/vendors/orders', { params }),

  updateOrderStatus: (orderId: string, status: string) =>
    apiClient.put<ApiResponse<Order>>(`/vendors/orders/${orderId}/status`, { status }),

  // Settlements
  getSettlements: (params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<object[]>>('/vendors/settlements', { params }),

  // Razorpay Connect
  connectRazorpay: (data: object) =>
    apiClient.post<ApiResponse<null>>('/vendors/razorpay/connect', data),

  getRazorpayStatus: () =>
    apiClient.get<ApiResponse<{ connected: boolean }>>('/vendors/razorpay/status'),

  // Analytics
  getDashboardStats: () =>
    apiClient.get<ApiResponse<object>>('/vendors/dashboard/stats'),
};
