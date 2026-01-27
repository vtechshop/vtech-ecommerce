import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import { normalizeImageUrl } from '@/utils/placeholders';

const AdBanner = ({ placement, position = 'top', className = '' }) => {
  const navigate = useNavigate();
  const [adToShow, setAdToShow] = useState(null);

  const { data: adsData, isError, error } = useQuery({
    queryKey: ['ad-placement', placement],
    queryFn: async () => {
      try {
        const response = await api.get(`/ads/placement/${placement}`);
        return response.data;
      } catch (error) {
        console.error(`Error fetching ads for placement "${placement}":`, error);
        return null;
      }
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: 1,
    enabled: !!placement, // Only fetch if placement is provided
  });

  // Debug logging
  useEffect(() => {
    if (isError) {
      console.error(`Ad placement "${placement}" error:`, error);
    }
    if (adsData) {
      console.log(`Ad data for "${placement}":`, adsData);
    }
  }, [adsData, isError, error, placement]);

  useEffect(() => {
    if (adsData?.data) {
      // If multiple ads, pick one randomly or by highest bid
      const ads = Array.isArray(adsData.data) ? adsData.data : [adsData.data];

      // Filter by position if specified - be more lenient with position matching
      const filteredAds = ads.filter(ad => {
        if (!position) return true; // No position filter
        if (!ad.position) return true; // Ad has no position set, show anyway
        return ad.position === position; // Exact match
      });

      console.log(`Filtered ads for "${placement}" (position: ${position}):`, filteredAds);

      if (filteredAds.length > 0) {
        // Pick highest bid or random
        const selectedAd = filteredAds.sort((a, b) => b.bid - a.bid)[0];
        console.log(`Selected ad for "${placement}":`, selectedAd.name);
        setAdToShow(selectedAd);
      } else {
        console.warn(`No ads matched for "${placement}" with position "${position}"`);
        setAdToShow(null);
      }
    } else {
      setAdToShow(null);
    }
  }, [adsData, position, placement]);

  const handleClick = async () => {
    if (!adToShow) return;

    try {
      // Track click
      await api.post(`/ads/${adToShow._id}/click`);

      // Navigate to target URL
      const targetUrl = adToShow.targetUrl || (adToShow.productSlug ? `/product/${adToShow.productSlug}` : null);

      if (targetUrl) {
        // Check if internal URL (starts with /)
        if (targetUrl.startsWith('/')) {
          navigate(targetUrl);
        } else if (targetUrl.startsWith('http')) {
          window.open(targetUrl, '_blank');
        } else {
          navigate(`/${targetUrl}`);
        }
      }
    } catch (error) {
      console.error('Error tracking ad click:', error);
    }
  };

  const handleImpression = async () => {
    if (!adToShow) return;

    try {
      // Track impression
      await api.post(`/ads/${adToShow._id}/impression`);
    } catch (error) {
      console.error('Error tracking impression:', error);
    }
  };

  useEffect(() => {
    if (adToShow) {
      handleImpression();
    }
  }, [adToShow]);

  if (!adToShow) return null;

  // Determine banner dimensions based on size
  const getDimensions = () => {
    if (adToShow.dimensions?.width && adToShow.dimensions?.height) {
      return {
        width: `${adToShow.dimensions.width}px`,
        height: `${adToShow.dimensions.height}px`,
      };
    }

    switch (adToShow.bannerSize) {
      case 'hero':
        return { width: '100%', height: '600px', maxWidth: '1920px' };
      case 'leaderboard':
        return { width: '728px', height: '90px' };
      case 'side-large':
        return { width: '300px', height: '600px' };
      case 'side-small':
        return { width: '300px', height: '250px' };
      case 'rectangle':
        return { width: '300px', height: '250px' };
      case 'skyscraper':
        return { width: '160px', height: '600px' };
      case 'square':
        return { width: '250px', height: '250px' };
      default:
        return { width: '300px', height: '250px' };
    }
  };

  const dimensions = getDimensions();

  return (
    <div
      className={`ad-banner ${className}`}
      style={{
        width: dimensions.width,
        maxWidth: dimensions.maxWidth,
        margin: position === 'top' || position === 'bottom' ? '0 auto' : '0',
      }}
    >
      {adToShow.bannerImage ? (
        <div
          onClick={handleClick}
          className="cursor-pointer overflow-hidden rounded-lg shadow-sm hover:shadow-md transition-shadow"
          style={{
            width: '100%',
            height: dimensions.height,
          }}
        >
          <img
            src={normalizeImageUrl(adToShow.bannerImage)}
            alt={adToShow.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="text-xs text-gray-500 text-right mt-1">
            Sponsored
          </div>
        </div>
      ) : (
        <div
          onClick={handleClick}
          className="cursor-pointer bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-center items-center text-white"
          style={{
            width: '100%',
            height: dimensions.height,
          }}
        >
          <h3 className="text-2xl font-bold mb-2">{adToShow.name}</h3>
          <p className="text-sm opacity-90">Click to learn more</p>
          <div className="text-xs opacity-75 mt-4">Sponsored</div>
        </div>
      )}
    </div>
  );
};

export default AdBanner;
