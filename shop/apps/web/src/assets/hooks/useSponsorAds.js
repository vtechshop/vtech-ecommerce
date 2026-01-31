// FILE: apps/web/src/hooks/useSponsorAds.js
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';

const useSponsorAds = (placement, options = {}) => {
  const {
    limit = 1,
    refreshInterval = null,
    trackImpression = true
  } = options;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['sponsor-ad', placement],
    queryFn: async () => {
      if (!placement) return [];
      const response = await api.get('/ads/sponsored', {
        params: { placement, limit }
      });
      if (response.data.success && response.data.data?.ads?.length > 0) {
        return response.data.data.ads;
      }
      return [];
    },
    staleTime: refreshInterval || 10 * 60 * 1000, // Use refresh interval as stale time, or 10 min default
    gcTime: 15 * 60 * 1000,
    refetchInterval: refreshInterval || false,
    enabled: !!placement,
  });

  const ads = data || [];

  // Track impressions once when ad data loads
  useEffect(() => {
    if (trackImpression && ads.length > 0) {
      ads.forEach(ad => {
        if (ad._id) {
          api.post(`/ads/${ad._id}/impression`, { placement }).catch(() => {});
        }
      });
    }
  }, [ads, trackImpression, placement]);

  return {
    ads,
    ad: ads[0] || null,
    loading: isLoading,
    error,
    refetch
  };
};

export default useSponsorAds;
