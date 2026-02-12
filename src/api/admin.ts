import apiClient from './client';
import { ApiResponse, User, Product, Order, Vendor, Affiliate } from '../types';

export const adminApi = {
  getDashboardStats: () =>
    apiClient.get<ApiResponse<object>>('/admin/dashboard/stats'),

  // Users
  getUsers: (params?: { page?: number; limit?: number; role?: string; search?: string }) =>
    apiClient.get<ApiResponse<User[]>>('/admin/users', { params }),

  getUserById: (id: string) =>
    apiClient.get<ApiResponse<User>>(`/admin/users/${id}`),

  updateUser: (id: string, data: Partial<User>) =>
    apiClient.put<ApiResponse<User>>(`/admin/users/${id}`, data),

  deleteUser: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/admin/users/${id}`),

  // Products
  getProducts: (params?: { page?: number; limit?: number; search?: string }) =>
    apiClient.get<ApiResponse<Product[]>>('/admin/products', { params }),

  updateProduct: (id: string, data: Partial<Product>) =>
    apiClient.put<ApiResponse<Product>>(`/admin/products/${id}`, data),

  deleteProduct: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/admin/products/${id}`),

  // Categories
  getCategories: () =>
    apiClient.get<ApiResponse<object[]>>('/admin/categories'),

  // Orders
  getOrderCounts: () =>
    apiClient.get<ApiResponse<object>>('/admin/orders/counts'),

  getOrders: (params?: { page?: number; limit?: number; status?: string }) =>
    apiClient.get<ApiResponse<Order[]>>('/admin/orders', { params }),

  getOrderById: (id: string) =>
    apiClient.get<ApiResponse<Order>>(`/admin/orders/${id}`),

  updateOrderStatus: (id: string, status: string) =>
    apiClient.put<ApiResponse<Order>>(`/admin/orders/${id}/status`, { status }),

  // Vendors
  getVendors: (params?: { page?: number; limit?: number; status?: string }) =>
    apiClient.get<ApiResponse<Vendor[]>>('/admin/vendors', { params }),

  approveVendor: (id: string) =>
    apiClient.put<ApiResponse<null>>(`/admin/vendors/${id}/approve`),

  rejectVendor: (id: string, reason: string) =>
    apiClient.put<ApiResponse<null>>(`/admin/vendors/${id}/reject`, { reason }),

  // Affiliates
  getAffiliates: (params?: { page?: number; limit?: number; status?: string }) =>
    apiClient.get<ApiResponse<Affiliate[]>>('/admin/affiliates', { params }),

  approveAffiliate: (id: string) =>
    apiClient.put<ApiResponse<null>>(`/admin/affiliates/${id}/approve`),

  rejectAffiliate: (id: string, reason: string) =>
    apiClient.put<ApiResponse<null>>(`/admin/affiliates/${id}/reject`, { reason }),
};
