import apiClient from './client';
import { ApiResponse, Address, Product, Notification } from '../types';

export const userApi = {
  // Addresses
  getAddresses: () =>
    apiClient.get<ApiResponse<Address[]>>('/user/addresses'),

  addAddress: (data: Address) =>
    apiClient.post<ApiResponse<Address>>('/user/addresses', data),

  updateAddress: (id: string, data: Partial<Address>) =>
    apiClient.put<ApiResponse<Address>>(`/user/addresses/${id}`, data),

  deleteAddress: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/user/addresses/${id}`),

  setDefaultAddress: (id: string) =>
    apiClient.put<ApiResponse<null>>(`/user/addresses/${id}/default`),

  // Wishlist
  getWishlist: () =>
    apiClient.get<ApiResponse<Product[]>>('/user/wishlist'),

  addToWishlist: (productId: string) =>
    apiClient.post<ApiResponse<null>>('/user/wishlist', { productId }),

  removeFromWishlist: (productId: string) =>
    apiClient.delete<ApiResponse<null>>(`/user/wishlist/${productId}`),

  // Notifications
  getNotifications: (params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<Notification[]>>('/notifications', { params }),

  markAsRead: (id: string) =>
    apiClient.put<ApiResponse<null>>(`/notifications/${id}/read`),

  markAllAsRead: () =>
    apiClient.put<ApiResponse<null>>('/notifications/read-all'),

  // Loyalty
  getLoyaltyPoints: () =>
    apiClient.get<ApiResponse<{ points: number; transactions: object[] }>>('/loyalty/points'),

  // Tickets
  getTickets: (params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<object[]>>('/tickets', { params }),

  createTicket: (data: { subject: string; message: string; category?: string }) =>
    apiClient.post<ApiResponse<object>>('/tickets', data),

  getTicketById: (id: string) =>
    apiClient.get<ApiResponse<object>>(`/tickets/${id}`),

  replyToTicket: (id: string, message: string) =>
    apiClient.post<ApiResponse<object>>(`/tickets/${id}/reply`, { message }),
};
