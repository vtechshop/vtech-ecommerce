// FILE: apps/web/src/hooks/useProductTracking.js
import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '@/utils/api';

/**
 * Custom hook for tracking user interactions with products and searches
 * Used to improve recommendation algorithms
 */
export const useProductTracking = () => {
  // Track product view
  const trackViewMutation = useMutation({
    mutationFn: async (viewData) => {
      const { data } = await api.post('/catalog/track/view', viewData);
      return data;
    },
    onError: (error) => {
      console.error('Failed to track product view:', error);
    },
  });

  // Track search query
  const trackSearchMutation = useMutation({
    mutationFn: async (searchData) => {
      const { data } = await api.post('/catalog/track/search', searchData);
      return data;
    },
    onError: (error) => {
      console.error('Failed to track search:', error);
    },
  });

  // Track search click
  const trackSearchClickMutation = useMutation({
    mutationFn: async ({ searchId, productId }) => {
      const { data } = await api.post('/catalog/track/search-click', {
        searchId,
        productId,
      });
      return data;
    },
    onError: (error) => {
      console.error('Failed to track search click:', error);
    },
  });

  /**
   * Track when a user views a product
   * @param {Object} params
   * @param {string} params.productId - Product ID
   * @param {number} params.duration - Time spent viewing (seconds)
   * @param {string} params.source - Source of view (search, category, recommendation, etc.)
   * @param {string} params.searchQuery - Search query if came from search
   */
  const trackProductView = useCallback(
    (params) => {
      trackViewMutation.mutate(params);
    },
    [trackViewMutation]
  );

  /**
   * Track a search query
   * @param {Object} params
   * @param {string} params.query - Search query
   * @param {Object} params.filters - Applied filters
   * @param {number} params.resultsCount - Number of results
   * @returns {Promise} Promise with searchId
   */
  const trackSearch = useCallback(
    async (params) => {
      return trackSearchMutation.mutateAsync(params);
    },
    [trackSearchMutation]
  );

  /**
   * Track when a user clicks on a product from search results
   * @param {string} searchId - Search history ID
   * @param {string} productId - Product ID that was clicked
   */
  const trackSearchClick = useCallback(
    (searchId, productId) => {
      if (searchId && productId) {
        trackSearchClickMutation.mutate({ searchId, productId });
      }
    },
    [trackSearchClickMutation]
  );

  return {
    trackProductView,
    trackSearch,
    trackSearchClick,
    isTracking:
      trackViewMutation.isPending ||
      trackSearchMutation.isPending ||
      trackSearchClickMutation.isPending,
  };
};

export default useProductTracking;
