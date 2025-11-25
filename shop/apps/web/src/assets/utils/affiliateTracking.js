// FILE: apps/web/src/utils/affiliateTracking.js

/**
 * Affiliate Tracking Utility
 * Handles affiliate link tracking by storing affiliate codes in cookies
 */

/**
 * Captures affiliate code from URL parameter and stores it in a cookie
 * Supports both 'affId' and 'ref' URL parameters
 * Cookie expires after 30 days
 *
 * @param {URLSearchParams} searchParams - URL search parameters
 */
export const captureAffiliateFromURL = (searchParams) => {
  // Check for affiliate code in URL parameters (support both affId and ref)
  const affiliateCode = searchParams.get('affId') || searchParams.get('ref');

  if (affiliateCode) {
    // Store affiliate code in cookie for 30 days
    const maxAge = 30 * 24 * 60 * 60; // 30 days in seconds
    document.cookie = `affiliate=${affiliateCode}; max-age=${maxAge}; path=/; SameSite=Lax`;

    console.log(`[Affiliate Tracking] Captured affiliate code: ${affiliateCode}`);
    return affiliateCode;
  }

  return null;
};

/**
 * Gets the current affiliate code from cookie
 *
 * @returns {string|null} The affiliate code or null if not set
 */
export const getAffiliateCode = () => {
  const cookies = document.cookie.split(';');

  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'affiliate') {
      return value;
    }
  }

  return null;
};

/**
 * Clears the affiliate cookie
 */
export const clearAffiliateCode = () => {
  document.cookie = 'affiliate=; max-age=0; path=/';
  console.log('[Affiliate Tracking] Cleared affiliate code');
};
