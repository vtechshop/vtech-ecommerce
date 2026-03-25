import apiClient from './client';
import { ApiResponse, Product, Category, Review } from '../types';

export const productsApi = {
  // Backend uses ?q= for search (not ?search=), no ?category filter — use getCategoryProducts for category
  getAll: (params?: {
    page?: number;
    limit?: number;
    q?: string;
    sort?: string;
    featured?: boolean;
    tag?: string;
    vendor?: string;
  }) => apiClient.get<ApiResponse<Product[]>>('/catalog/products', { params }),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Product>>(`/products/${id}`),

  getBySlug: (slug: string) =>
    apiClient.get<ApiResponse<Product>>(`/catalog/products/${slug}`),

  getFeatured: () =>
    apiClient.get<ApiResponse<Product[]>>('/catalog/products', { params: { featured: true } }),

  getCategories: () =>
    apiClient.get<ApiResponse<Category[]>>('/catalog/categories'),

  // Returns { category, items: Product[] }
  getCategoryProducts: (slug: string, params?: { page?: number; limit?: number; sort?: string }) =>
    apiClient.get<{ success: boolean; data: { category: Category; items: Product[] } }>(`/catalog/categories/${slug}`, { params }),

  getReviews: (productId: string, params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<Review[]>>(`/products/${productId}/reviews`, { params }),

  addReview: (productId: string, data: { rating: number; comment: string }) =>
    apiClient.post<ApiResponse<Review>>(`/products/${productId}/reviews`, data),

  // Returns { suggestions: string[], products: Product[], categories: Category[] }
  autocomplete: (query: string) =>
    apiClient.get<{ success: boolean; data: { suggestions: string[]; products: Product[]; categories: Category[] } }>('/catalog/autocomplete', { params: { q: query } }),

  getRecommendations: () =>
    apiClient.get<ApiResponse<Product[]>>('/catalog/recommendations/trending'),

  getSimilar: (productId: string) =>
    apiClient.get<ApiResponse<Product[]>>(`/products/${productId}/similar`),
};
