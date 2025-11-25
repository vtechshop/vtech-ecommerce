// FILE: src/assets/utils/webVitals.js
// Web Vitals Performance Monitoring
// Tracks Core Web Vitals: LCP, FID, CLS, FCP, TTFB

/**
 * Report Web Vitals metrics to analytics
 * @param {Object} metric - Web Vitals metric object
 */
const reportWebVitals = (metric) => {
  // Log to console in development
  if (import.meta.env.DEV) {
    console.log(`[Web Vitals] ${metric.name}:`, metric.value, metric);
  }

  // Send to analytics in production
  if (import.meta.env.PROD && window.gtag) {
    window.gtag('event', metric.name, {
      event_category: 'Web Vitals',
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_label: metric.id,
      non_interaction: true,
    });
  }

  // Send to custom analytics endpoint
  if (import.meta.env.PROD) {
    try {
      navigator.sendBeacon('/api/analytics/web-vitals', JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        id: metric.id,
        navigationType: metric.navigationType,
        timestamp: Date.now(),
      }));
    } catch (error) {
      // Silently fail if analytics endpoint is not available
    }
  }
};

/**
 * Get Web Vitals thresholds
 */
const getThresholds = (metricName) => {
  const thresholds = {
    LCP: { good: 2500, needsImprovement: 4000 },
    INP: { good: 200, needsImprovement: 500 }, // Interaction to Next Paint (replaces FID)
    FID: { good: 100, needsImprovement: 300 }, // Legacy - kept for backwards compatibility
    CLS: { good: 0.1, needsImprovement: 0.25 },
    FCP: { good: 1800, needsImprovement: 3000 },
    TTFB: { good: 800, needsImprovement: 1800 },
  };
  return thresholds[metricName] || {};
};

/**
 * Get rating for a metric value
 */
const getRating = (metricName, value) => {
  const { good, needsImprovement } = getThresholds(metricName);
  if (value <= good) return 'good';
  if (value <= needsImprovement) return 'needs-improvement';
  return 'poor';
};

/**
 * Initialize Web Vitals monitoring
 * Uses the web-vitals library for accurate measurements
 */
export const initWebVitals = async () => {
  try {
    // Dynamically import web-vitals to avoid bundle bloat
    // Note: web-vitals v3+ replaced onFID with onINP (Interaction to Next Paint)
    const { onCLS, onINP, onFCP, onLCP, onTTFB } = await import('web-vitals');

    // Cumulative Layout Shift (CLS)
    onCLS((metric) => {
      metric.rating = getRating('CLS', metric.value);
      reportWebVitals(metric);
    });

    // Interaction to Next Paint (INP) - replaces FID in web-vitals v3+
    onINP((metric) => {
      metric.rating = getRating('INP', metric.value);
      reportWebVitals(metric);
    });

    // First Contentful Paint (FCP)
    onFCP((metric) => {
      metric.rating = getRating('FCP', metric.value);
      reportWebVitals(metric);
    });

    // Largest Contentful Paint (LCP)
    onLCP((metric) => {
      metric.rating = getRating('LCP', metric.value);
      reportWebVitals(metric);
    });

    // Time to First Byte (TTFB)
    onTTFB((metric) => {
      metric.rating = getRating('TTFB', metric.value);
      reportWebVitals(metric);
    });
  } catch (error) {
    console.warn('[Web Vitals] Failed to initialize:', error);
  }
};

/**
 * Manual performance mark for custom measurements
 */
export const mark = (name) => {
  if ('performance' in window && window.performance.mark) {
    window.performance.mark(name);
  }
};

/**
 * Measure time between two marks
 */
export const measure = (name, startMark, endMark) => {
  if ('performance' in window && window.performance.measure) {
    try {
      window.performance.measure(name, startMark, endMark);
      const measure = window.performance.getEntriesByName(name)[0];

      if (import.meta.env.DEV) {
        console.log(`[Performance] ${name}:`, measure.duration.toFixed(2), 'ms');
      }

      return measure.duration;
    } catch (error) {
      console.warn('[Performance] Measurement failed:', error);
    }
  }
  return null;
};

/**
 * Get performance metrics summary
 */
export const getPerformanceMetrics = () => {
  if (!('performance' in window)) return null;

  const navigation = performance.getEntriesByType('navigation')[0];
  const paint = performance.getEntriesByType('paint');

  return {
    // Navigation timing
    dns: navigation?.domainLookupEnd - navigation?.domainLookupStart,
    tcp: navigation?.connectEnd - navigation?.connectStart,
    request: navigation?.responseStart - navigation?.requestStart,
    response: navigation?.responseEnd - navigation?.responseStart,
    domParsing: navigation?.domInteractive - navigation?.responseEnd,
    domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart,
    windowLoad: navigation?.loadEventEnd - navigation?.loadEventStart,

    // Paint timing
    firstPaint: paint.find(p => p.name === 'first-paint')?.startTime,
    firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime,

    // Total page load time
    totalLoadTime: navigation?.loadEventEnd - navigation?.fetchStart,
  };
};

export default initWebVitals;
