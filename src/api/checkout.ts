import apiClient from './client';

export interface ShippingQuote {
  id: string;
  name: string;
  description: string;
  cost: number;
  estimatedDays: string;
  carrier: string;
}

export interface ShippingQuotesResponse {
  quotes: ShippingQuote[];
  totalWeightKg: number;
}

export const checkoutApi = {
  getShippingQuotes: (address: {
    zipCode: string;
    state: string;
    city: string;
    country?: string;
  }, items: { productId: string; qty: number }[]) =>
    apiClient.post<{ data: ShippingQuotesResponse }>('/checkout/shipping-quotes', {
      address,
      items,
    }),

  getTaxes: (subtotal: number, address: { state: string; country?: string }) =>
    apiClient.post<{ data: { taxRate: number; taxAmount: number } }>('/checkout/taxes', {
      subtotal,
      address,
    }),
};
