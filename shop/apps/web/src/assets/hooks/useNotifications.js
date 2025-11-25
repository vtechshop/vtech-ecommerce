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

  // Only fetch for admin/vendor users
  const shouldFetch = isAuthenticated && ['admin', 'vendor'].includes(user?.role);
  const enabled = enabledOverride !== undefined ? enabledOverride : shouldFetch;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['notification-counts'],
    queryFn: async () => {
      const response = await api.get('/notifications/counts');
      return response.data.data;
    },
    enabled,
    refetchInterval: enabled ? pollInterval : false, // Auto-refetch every pollInterval ms
    refetchIntervalInBackground: true, // Keep fetching even when tab is not active
    staleTime: 20000, // Data is fresh for 20 seconds
    cacheTime: 300000, // Keep in cache for 5 minutes
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
    pendingCommissions: 0,
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
