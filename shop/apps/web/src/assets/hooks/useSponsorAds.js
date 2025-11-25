// FILE: apps/web/src/hooks/useSponsorAds.js
import { useState, useEffect, useCallback } from 'react';
import api from '@/utils/api';

/**
 * Custom hook to fetch and manage sponsor ads
 *
 * @param {String} placement - Ad placement (e.g., 'homepage_banner', 'homepage_sidebar_left')
 * @param {Object} options - Configuration options
 * @param {Number} options.limit - Number of ads to fetch (default: 1)
 * @param {Number} options.refreshInterval - Auto-refresh interval in ms (default: null, no auto-refresh)
 * @param {Boolean} options.trackImpression - Automatically track impressions (default: true)
 * @returns {Object} { ads, loading, error, refetch }
 */
const useSponsorAds = (placement, options = {}) => {
  const {
    limit = 1,
    refreshInterval = null,
    trackImpression = true
  } = options;

  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAds = useCallback(async () => {
    if (!placement) {
      setAds([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log(`[useSponsorAds] Fetching ads for placement: ${placement}`);

      const response = await api.get('/ads/sponsored', {
        params: {
          placement,
          limit,
          _ts: Date.now() // Cache busting
        }
      });

      if (response.data.success && response.data.data?.ads?.length > 0) {
        const fetchedAds = response.data.data.ads;
        setAds(fetchedAds);
        console.log(`[useSponsorAds] Loaded ${fetchedAds.length} ad(s) for ${placement}`);

        // Track impressions for all ads
        if (trackImpression) {
          fetchedAds.forEach(ad => {
            if (ad._id) {
              api.post(`/ads/${ad._id}/impression`, {
                placement
              }).catch(err =>
                console.warn(`[useSponsorAds] Failed to track impression for ad ${ad._id}:`, err.message)
              );
            }
          });
        }
      } else {
        console.log(`[useSponsorAds] No ads available for ${placement}`);
        setAds([]);
      }
    } catch (err) {
      console.error(`[useSponsorAds] Failed to fetch ads for ${placement}:`, {
        message: err.message,
        status: err.response?.status
      });
      setError(err);
      setAds([]);
    } finally {
      setLoading(false);
    }
  }, [placement, limit, trackImpression]);

  useEffect(() => {
    fetchAds();

    // Set up auto-refresh if interval is specified
    if (refreshInterval && refreshInterval > 0) {
      const intervalId = setInterval(fetchAds, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [fetchAds, refreshInterval]);

  return {
    ads,
    ad: ads[0] || null, // Convenience property for single ad
    loading,
    error,
    refetch: fetchAds
  };
};

export default useSponsorAds;
