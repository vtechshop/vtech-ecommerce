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

  getProfile: () =>
    apiClient.get<ApiResponse<Vendor>>('/vendors/profile'),

  updateProfile: (data: Partial<Vendor>) =>
    apiClient.put<ApiResponse<Vendor>>('/vendors/profile', data),

  // KYC
  submitKYC: (data: FormData) =>
    apiClient.post<ApiResponse<null>>('/vendors/kyc', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getKYCStatus: () =>
    apiClient.get<ApiResponse<{ status: string }>>('/vendors/kyc/status'),

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
  getOrders: (params?: { page?: number; limit?: number; status?: string }) =>
    apiClient.get<ApiResponse<Order[]>>('/vendors/orders', { params }),

  updateOrderStatus: (orderId: string, status: string) =>
    apiClient.put<ApiResponse<Order>>(`/vendors/orders/${orderId}`, { status }),

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
