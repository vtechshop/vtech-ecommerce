// FILE: apps/web/src/hooks/useAnalytics.js
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { loadGA4, loadMetaPixel, trackPageView } from '@/utils/analytics';

const GA4_MEASUREMENT_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID;
const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID || '1324439793116161';

const useAnalytics = () => {
  const location = useLocation();
  const { preferences } = useSelector((state) => state.consent);
  const previous = useRef({ analytics: false, marketing: false });

  // Load analytics scripts when consent is granted
  useEffect(() => {
    // GA + Clarity from index.html (production domain only); stopped again if consent is withdrawn
    if (preferences.analytics) {
      window.vtechAnalytics?.enable();
    } else if (previous.current.analytics) {
      window.vtechAnalytics?.disable();
    }
    if (!preferences.marketing && previous.current.marketing && window.fbq) {
      window.fbq('consent', 'revoke');
    }
    previous.current = { analytics: preferences.analytics, marketing: preferences.marketing };

    if (preferences.analytics && GA4_MEASUREMENT_ID) {
      loadGA4(GA4_MEASUREMENT_ID);
      window.GA_MEASUREMENT_ID = GA4_MEASUREMENT_ID;
    }

    if (preferences.marketing && META_PIXEL_ID) {
      loadMetaPixel(META_PIXEL_ID);
    }
  }, [preferences.analytics, preferences.marketing]);

  // Track page views
  useEffect(() => {
    if (preferences.analytics) {
      trackPageView(location.pathname + location.search);
    } else if (preferences.marketing && window.fbq) {
      // Fire Meta PageView even when only marketing consent given
      window.fbq('track', 'PageView');
    }
  }, [location, preferences.analytics, preferences.marketing]);
};

export default useAnalytics;