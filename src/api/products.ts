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
  }) => apiClient.get<ApiResponse<Product[]>>('/catalog/products', { params }),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Product>>(`/catalog/products/${id}`),

  getBySlug: (slug: string) =>
    apiClient.get<ApiResponse<Product>>(`/catalog/products/slug/${slug}`),

  getFeatured: () =>
    apiClient.get<ApiResponse<Product[]>>('/catalog/products/featured'),

  getCategories: () =>
    apiClient.get<ApiResponse<Category[]>>('/catalog/categories'),

  getReviews: (productId: string, params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<Review[]>>(`/products/${productId}/reviews`, { params }),

  addReview: (productId: string, data: { rating: number; comment: string }) =>
    apiClient.post<ApiResponse<Review>>(`/products/${productId}/reviews`, data),

  search: (query: string) =>
    apiClient.get<ApiResponse<Product[]>>('/catalog/search', { params: { q: query } }),

  getRecommendations: (productId?: string) =>
    apiClient.get<ApiResponse<Product[]>>('/recommendations', { params: { productId } }),
};
