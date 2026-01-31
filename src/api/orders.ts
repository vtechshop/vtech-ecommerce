import apiClient from './client';
import { ApiResponse, Order, Address } from '../types';

export const ordersApi = {
  create: (data: {
    addressId: string;
    paymentMethod: string;
    razorpayPaymentId?: string;
    razorpayOrderId?: string;
    razorpaySignature?: string;
  }) => apiClient.post<ApiResponse<Order>>('/orders', data),

  getAll: (params?: { page?: number; limit?: number; status?: string }) =>
    apiClient.get<ApiResponse<Order[]>>('/orders', { params }),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Order>>(`/orders/${id}`),

  cancel: (id: string, reason: string) =>
    apiClient.post<ApiResponse<Order>>(`/orders/${id}/cancel`, { reason }),

  returnOrder: (id: string, data: { reason: string; items?: string[] }) =>
    apiClient.post<ApiResponse<Order>>(`/orders/${id}/return`, data),

  trackOrder: (id: string) =>
    apiClient.get<ApiResponse<{ status: string; tracking: object }>>(`/orders/${id}/track`),
};
