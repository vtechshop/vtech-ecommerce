import apiClient from './client';
import { ApiResponse, Cart } from '../types';

export const cartApi = {
  get: () =>
    apiClient.get<ApiResponse<Cart>>('/cart'),

  addItem: (productId: string, quantity: number, variant?: string) =>
    apiClient.post<ApiResponse<Cart>>('/cart/add', { productId, quantity, variant }),

  updateItem: (itemId: string, quantity: number) =>
    apiClient.put<ApiResponse<Cart>>(`/cart/items/${itemId}`, { quantity }),

  removeItem: (itemId: string) =>
    apiClient.delete<ApiResponse<Cart>>(`/cart/items/${itemId}`),

  applyCoupon: (code: string) =>
    apiClient.post<ApiResponse<Cart>>('/cart/coupon', { code }),

  removeCoupon: () =>
    apiClient.delete<ApiResponse<Cart>>('/cart/coupon'),

  clear: () =>
    apiClient.delete<ApiResponse<null>>('/cart'),
};
