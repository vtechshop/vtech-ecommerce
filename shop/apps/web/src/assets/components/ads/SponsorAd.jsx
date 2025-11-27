// FILE: apps/web/src/components/ads/SponsorAd.jsx
import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '@/utils/api';
import SponsoredLabel from './SponsoredLabel';

/**
 * Reusable Sponsor Ad Component
 *
 * @param {Object} ad - The ad object from the API
 * @param {String} variant - Display variant: 'banner', 'sidebar', 'card'
 * @param {Function} onAdClick - Optional callback when ad is clicked
 */
const SponsorAd = ({ ad, variant = 'banner', onAdClick }) => {
  if (!ad) return null;

  const handleClick = useCallback(() => {
    // Track click event
    if (ad._id || ad.campaignId) {
      api.post(`/ads/${ad._id || ad.campaignId}/click`, {
        placement: ad.position || 'unknown'
      }).catch(() => {}); // Silent fail for click tracking
    }

    // Call optional callback
    if (onAdClick) {
      onAdClick(ad);
    }
  }, [ad, onAdClick]);

  // Determine target URL
  const targetUrl = ad.targetUrl || (ad.productSlug ? `/product/${ad.productSlug}` : '#');

  // Banner variant (large horizontal ad)
  if (variant === 'banner') {
    return (
      <div className="relative rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
        <Link to={targetUrl} onClick={handleClick} className="block">
          {(ad.bannerImage || ad.bannerAsset?.imageUrl) ? (
            <div className="relative">
              <SponsoredLabel placement="banner" />
              <img
                src={ad.bannerImage || ad.bannerAsset?.imageUrl}
                alt={ad.name || ad.headline || 'Sponsored Advertisement'}
                className="w-full h-48 sm:h-64 md:h-80 object-cover"
                loading="lazy"
              />
              {(ad.name || ad.headline) && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                  <h3 className="text-white text-xl md:text-2xl font-bold">{ad.name || ad.headline}</h3>
                  {ad.description && (
                    <p className="text-white/90 text-sm md:text-base mt-1">{ad.description}</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="relative bg-gradient-to-r from-primary-600 to-primary-400 h-48 sm:h-64 md:h-80 flex items-center justify-center">
              <SponsoredLabel placement="banner" />
              <div className="text-center text-white p-6 max-w-2xl">
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2">{ad.name || ad.headline || 'Sponsored'}</h2>
                {ad.description && (
                  <p className="text-lg md:text-xl opacity-90">{ad.description}</p>
                )}
              </div>
            </div>
          )}
        </Link>
      </div>
    );
  }

  // Sidebar variant (vertical ad)
  if (variant === 'sidebar') {
    return (
      <div className="sticky top-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 sm:p-6 border border-blue-200 hover:shadow-lg transition-shadow">
          <SponsoredLabel placement="banner" />

          {/* Make image clickable */}
          {(ad.bannerImage || ad.bannerAsset?.imageUrl) && (
            <Link to={targetUrl} onClick={handleClick} className="block">
              <img
                src={ad.bannerImage || ad.bannerAsset?.imageUrl}
                alt={ad.name || ad.headline || 'Sponsored'}
                className="w-full h-32 sm:h-40 object-cover rounded-lg mb-4 hover:opacity-90 transition-opacity cursor-pointer"
                loading="lazy"
              />
            </Link>
          )}

          <div className="text-center mt-8">
            <Link to={targetUrl} onClick={handleClick} className="hover:text-primary-600 transition-colors">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">
                {ad.name || ad.headline || 'Sponsored'}
              </h3>
            </Link>
            {ad.description && (
              <p className="text-xs sm:text-sm text-gray-700 mb-4 line-clamp-3">{ad.description}</p>
            )}
            <Link
              to={targetUrl}
              onClick={handleClick}
              className="inline-block bg-primary-600 text-white px-3 sm:px-4 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors text-xs sm:text-sm"
            >
              Learn More
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Card variant (compact card)
  if (variant === 'card') {
    return (
      <Link
        to={targetUrl}
        onClick={handleClick}
        className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden border border-gray-200"
      >
        <div className="relative">
          <SponsoredLabel placement="banner" />
          {(ad.bannerImage || ad.bannerAsset?.imageUrl) ? (
            <img
              src={ad.bannerImage || ad.bannerAsset?.imageUrl}
              alt={ad.name || ad.headline || 'Sponsored'}
              className="w-full h-40 object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-40 bg-gradient-to-br from-primary-500 to-primary-300 flex items-center justify-center">
              <span className="text-white text-lg font-bold">{ad.name || ad.headline || 'Sponsored'}</span>
            </div>
          )}
        </div>
        <div className="p-4">
          <h4 className="font-bold text-gray-900 mb-1 line-clamp-1">{ad.name || ad.headline || 'Sponsored'}</h4>
          {ad.description && (
            <p className="text-sm text-gray-700 line-clamp-2">{ad.description}</p>
          )}
        </div>
      </Link>
    );
  }

  return null;
};

export default SponsorAd;
