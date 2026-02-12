import apiClient from './client';
import { ApiResponse, Product, Category, Review } from '../types';

export const productsApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    sort?: string;
    minPrice?: number;
    maxPrice?: number;
    rating?: number;
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

  getCategoryBySlug: (slug: string) =>
    apiClient.get<ApiResponse<Category>>(`/catalog/categories/${slug}`),

  getReviews: (productId: string, params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<Review[]>>(`/products/${productId}/reviews`, { params }),

  addReview: (productId: string, data: { rating: number; comment: string }) =>
    apiClient.post<ApiResponse<Review>>(`/products/${productId}/reviews`, data),

  search: (query: string) =>
    apiClient.get<ApiResponse<Product[]>>('/catalog/products', { params: { search: query } }),

  autocomplete: (query: string) =>
    apiClient.get<ApiResponse<string[]>>('/catalog/autocomplete', { params: { q: query } }),

  getRecommendations: (productId?: string) =>
    apiClient.get<ApiResponse<Product[]>>('/catalog/recommendations/trending'),

  getSimilar: (productId: string) =>
    apiClient.get<ApiResponse<Product[]>>(`/catalog/products/${productId}/similar`),
};
