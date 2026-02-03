// FILE: apps/web/src/hooks/useNotifications.js
import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import useAuth from '@/hooks/useAuth';

/**
 * Custom hook for fetching and managing notification counts
 * Automatically polls every 30 seconds for admin/vendor users
 *
 * @param {Object} options - Configuration options
 * @param {number} options.pollInterval - How often to refetch (in milliseconds, default: 30000 = 30 seconds)
 * @param {boolean} options.enabled - Whether to enable fetching (default: true for admin/vendor)
 * @returns {Object} - {counts, isLoading, error, refetch}
 */
const useNotifications = (options = {}) => {
  const { pollInterval = 30000, enabled: enabledOverride } = options;
  const { user, isAuthenticated } = useAuth();

  // Fetch for all authenticated users
  const shouldFetch = isAuthenticated && ['admin', 'vendor', 'affiliate', 'customer'].includes(user?.role);
  const enabled = enabledOverride !== undefined ? enabledOverride : shouldFetch;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['notification-counts'],
    queryFn: async () => {
      try {
        const response = await api.get('/notifications/counts');
        return response.data.data;
      } catch (err) {
        // Silently fail on 401/403 errors (user logged out or token expired)
        if (err.response?.status === 401 || err.response?.status === 403) {
          return null;
        }
        throw err;
      }
    },
    enabled,
    refetchInterval: enabled ? pollInterval : false, // Auto-refetch every pollInterval ms
    refetchIntervalInBackground: false, // Don't fetch in background to avoid 401s on public pages
    staleTime: 20000, // Data is fresh for 20 seconds
    gcTime: 300000, // Keep in cache for 5 minutes (renamed from cacheTime in v5)
    retry: (failureCount, error) => {
      // Don't retry on 401/403 errors
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const counts = data || {
    newOrders: 0,
    pendingOrders: 0,
    newUsers: 0,
    unreadMessages: 0, // Contact Form submissions
    unreadCommunications: 0, // Communication Hub
    openTickets: 0,
    pendingVendors: 0,
    pendingAffiliates: 0,
    pendingCommissions: 0, // Affiliate commissions
    pendingAds: 0,
    pendingProducts: 0,
    pendingKYC: 0,
    pendingReviews: 0,
    pendingVendorCommissions: 0,
    manualOrders: 0,
    categoryDeleteRequests: 0,
    // Vendor specific
    pendingSettlements: 0,
    // Affiliate specific
    approvedCommissions: 0,
    recentConversions: 0,
    // Customer specific
    activeOrders: 0,
    unreadNotifications: 0,
    totalNotifications: 0,
  };

  return {
    counts,
    isLoading,
    error,
    refetch,
  };
};

export default useNotifications;
