// FILE: apps/web/src/components/ads/AdPlacement.jsx
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import { useEffect, useState } from 'react';
import { normalizeImageUrl } from '@/utils/placeholders';

/**
 * AdPlacement Component
 * Displays ads based on placement settings from admin panel
 *
 * @param {string} placement - Placement ID (e.g., 'left_sidebar', 'top_banner', 'right_sidebar')
 * @param {string} className - Additional CSS classes
 * @param {React.ReactNode} fallback - Fallback content when ads are disabled
 */
const AdPlacement = ({ placement, className = '', fallback = null }) => {
  const [adHtml, setAdHtml] = useState(null);

  // Fetch ad settings from backend
  const { data: settings } = useQuery({
    queryKey: ['ad-settings'],
    queryFn: async () => {
      const response = await api.get('/settings/public?category=ads');
      return response.data?.data || [];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch active ad campaign for this placement
  const { data: adData } = useQuery({
    queryKey: ['ad-campaign', placement],
    queryFn: async () => {
      const response = await api.get(`/ads/placement/${placement}`);
      return response.data;
    },
    enabled: settings?.find(s => s.key === 'ads.global.enabled')?.value === 'true',
    staleTime: 30 * 1000, // Cache for 30 seconds
  });

  // Check if ads are globally enabled
  const adsGloballyEnabled = settings?.find(s => s.key === 'ads.global.enabled')?.value === 'true';

  // Check if this specific placement is enabled
  const placementEnabled = settings?.find(
    s => s.key === `ads.placement.${placement}.enabled`
  )?.value === 'true';

  // Auto-refresh ads based on global setting
  const refreshInterval = parseInt(
    settings?.find(s => s.key === 'ads.global.refresh_interval')?.value || '0'
  );

  useEffect(() => {
    if (refreshInterval > 0 && placementEnabled && adsGloballyEnabled) {
      const interval = setInterval(() => {
        // Trigger ad refresh by invalidating query
        queryClient.invalidateQueries(['ad-campaign', placement]);
      }, refreshInterval * 1000);

      return () => clearInterval(interval);
    }
  }, [refreshInterval, placement, placementEnabled, adsGloballyEnabled]);

  // Don't show anything if ads are disabled globally or for this placement
  if (!adsGloballyEnabled || !placementEnabled) {
    return fallback || null;
  }

  // Don't show anything if no ad data
  if (!adData?.data) {
    return fallback || null;
  }

  const ad = adData.data;

  // Render based on ad type
  return (
    <div className={`ad-placement ad-${placement} ${className}`} data-placement={placement}>
      {/* Sponsored label */}
      <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Sponsored</div>

      {/* Ad Content */}
      {ad.type === 'image' && (
        <a
          href={ad.targetUrl}
          target={ad.openInNewTab ? '_blank' : '_self'}
          rel="noopener noreferrer sponsored"
          className="block"
          onClick={() => trackAdClick(ad._id, placement)}
        >
          <img
            src={normalizeImageUrl(ad.imageUrl)}
            alt={ad.title || 'Advertisement'}
            className="w-full h-auto rounded-lg shadow-sm hover:shadow-md transition-shadow"
            loading="lazy"
          />
        </a>
      )}

      {ad.type === 'banner' && (
        <a
          href={ad.targetUrl}
          target={ad.openInNewTab ? '_blank' : '_self'}
          rel="noopener noreferrer sponsored"
          className="block bg-gradient-to-r from-primary-500 to-secondary-500 text-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
          onClick={() => trackAdClick(ad._id, placement)}
        >
          <h3 className="text-xl font-bold mb-2">{ad.title}</h3>
          <p className="text-sm opacity-90">{ad.description}</p>
          {ad.ctaText && (
            <button className="mt-4 bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              {ad.ctaText}
            </button>
          )}
        </a>
      )}

      {ad.type === 'html' && (
        <div
          className="ad-html-content"
          dangerouslySetInnerHTML={{ __html: ad.htmlContent }}
          onClick={() => trackAdClick(ad._id, placement)}
        />
      )}

      {ad.type === 'product' && ad.product && (
        <a
          href={`/product/${ad.product.slug}`}
          className="block bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow"
          onClick={() => trackAdClick(ad._id, placement)}
        >
          <img
            src={normalizeImageUrl(ad.product.images?.[0])}
            alt={ad.product.title}
            className="w-full h-48 object-cover rounded-lg mb-3"
            loading="lazy"
          />
          <h4 className="font-semibold text-gray-900 mb-1">{ad.product.title}</h4>
          <p className="text-blue-600 font-bold text-lg">₹{ad.product.price}</p>
          {ad.product.comparePrice && (
            <p className="text-gray-500 line-through text-sm">₹{ad.product.comparePrice}</p>
          )}
        </a>
      )}
    </div>
  );
};

// Track ad click
const trackAdClick = async (adId, placement) => {
  try {
    await api.post(`/ads/${adId}/click`, { placement });
  } catch {
    // Silent fail for analytics tracking
  }
};

// Track ad impression
export const trackAdImpression = async (adId, placement) => {
  try {
    await api.post(`/ads/${adId}/impression`, { placement });
  } catch {
    // Silent fail for analytics tracking
  }
};

export default AdPlacement;
