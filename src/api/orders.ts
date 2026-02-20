import apiClient from './client';
import { ApiResponse, Order } from '../types';

export const ordersApi = {
  create: (data: {
    addressId: string;
    paymentMethod: string;
    razorpayPaymentId?: string;
    razorpayOrderId?: string;
    razorpaySignature?: string;
    notes?: string;
  }) => apiClient.post<ApiResponse<Order>>('/orders', data),

  getAll: (params?: { page?: number; limit?: number; status?: string }) =>
    apiClient.get<ApiResponse<Order[]>>('/orders', { params }),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Order>>(`/orders/${id}`),

  cancel: (id: string, reason: string) =>
    apiClient.post<ApiResponse<Order>>(`/orders/${id}/cancel`, { reason }),

  returnOrder: (id: string, data: { reason: string; items?: string[] }) =>
    apiClient.post<ApiResponse<Order>>(`/orders/${id}/return`, data),

  trackOrder: (orderId: string) =>
    apiClient.post<ApiResponse<{ status: string; tracking: { provider?: string; trackingId?: string; url?: string; estimatedDelivery?: string } }>>('/orders/track', { orderId }),

  trackByAwb: (awb: string) =>
    apiClient.post<ApiResponse<object>>('/orders/track-awb', { awb }),

  getInvoice: (id: string) =>
    apiClient.get<Blob>(`/orders/${id}/invoice`, { responseType: 'blob' }),
};
