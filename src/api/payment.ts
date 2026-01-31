import apiClient from './client';
import { ApiResponse } from '../types';

export const paymentApi = {
  createRazorpayOrder: (amount: number, orderId?: string) =>
    apiClient.post<ApiResponse<{
      id: string;
      amount: number;
      currency: string;
      receipt: string;
    }>>('/payment/razorpay/create-order', { amount, orderId }),

  verifyPayment: (data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => apiClient.post<ApiResponse<null>>('/payment/razorpay/verify', data),

  handleFailure: (data: {
    razorpay_order_id: string;
    error: object;
  }) => apiClient.post<ApiResponse<null>>('/payment/razorpay/failure', data),

  getRazorpayKey: () =>
    apiClient.get<ApiResponse<{ key: string }>>('/payment/razorpay/key'),
};
