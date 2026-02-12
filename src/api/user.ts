import apiClient from './client';
import { ApiResponse, Address, Product, Notification } from '../types';

export const userApi = {
  // Profile
  getProfile: () =>
    apiClient.get<ApiResponse<object>>('/user/profile'),

  updateProfile: (data: object) =>
    apiClient.put<ApiResponse<object>>('/user/profile', data),

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
    apiClient.post<ApiResponse<null>>(`/user/wishlist/${productId}`),

  toggleWishlist: (productId: string) =>
    apiClient.post<ApiResponse<null>>(`/user/wishlist/toggle/${productId}`),

  removeFromWishlist: (productId: string) =>
    apiClient.delete<ApiResponse<null>>(`/user/wishlist/${productId}`),

  // Notifications
  getNotifications: (params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<Notification[]>>('/notifications', { params }),

  getNotificationCounts: () =>
    apiClient.get<ApiResponse<object>>('/notifications/counts'),

  markNotificationsRead: (ids?: string[]) =>
    apiClient.post<ApiResponse<null>>('/notifications/mark-read', { ids }),

  // Loyalty
  getLoyaltyAccount: () =>
    apiClient.get<ApiResponse<object>>('/loyalty/account'),

  getLoyaltyTransactions: (params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<object[]>>('/loyalty/transactions', { params }),

  getLoyaltyStats: () =>
    apiClient.get<ApiResponse<object>>('/loyalty/statistics'),

  redeemPoints: (data: { points: number }) =>
    apiClient.post<ApiResponse<object>>('/loyalty/redeem', data),

  // Tickets
  getTickets: (params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<object[]>>('/tickets', { params }),

  createTicket: (data: { subject: string; message: string; category?: string }) =>
    apiClient.post<ApiResponse<object>>('/tickets', data),

  getTicketById: (id: string) =>
    apiClient.get<ApiResponse<object>>(`/tickets/${id}`),

  replyToTicket: (id: string, message: string) =>
    apiClient.post<ApiResponse<object>>(`/tickets/${id}/messages`, { message }),
};
