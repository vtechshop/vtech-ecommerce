// FILE: apps/web/src/utils/affiliateTracking.js
import api from './api';

/**
 * Affiliate Tracking Utility
 * Handles affiliate link tracking by storing affiliate codes in cookies
 */

/**
 * Track affiliate click via API
 * @param {string} affiliateCode - The affiliate code to track
 */
const trackAffiliateClick = async (affiliateCode) => {
  try {
    await api.post('/affiliates/track/click', { affId: affiliateCode });
  } catch (error) {
    // Don't block the user experience if tracking fails
    console.warn('Failed to track affiliate click:', error.message);
  }
};

/**
 * Captures affiliate code from URL parameter and stores it in a cookie
 * Supports both 'affId' and 'ref' URL parameters
 * Cookie expires after 30 days
 * Also tracks the click via API
 *
 * @param {URLSearchParams} searchParams - URL search parameters
 */
export const captureAffiliateFromURL = async (searchParams) => {
  // Check for affiliate code in URL parameters (support both affId and ref)
  const affiliateCode = searchParams.get('affId') || searchParams.get('ref');

  if (affiliateCode) {
    // Check if we already have this affiliate code stored (to avoid duplicate tracking)
    const existingCode = getAffiliateCode();

    // Store affiliate code in cookie for 30 days
    // Encode the value to handle any special characters safely
    const maxAge = 30 * 24 * 60 * 60; // 30 days in seconds
    document.cookie = `affiliate=${encodeURIComponent(affiliateCode)}; max-age=${maxAge}; path=/; SameSite=Lax`;

    // Track click only if it's a new affiliate code (not already stored)
    if (existingCode !== affiliateCode) {
      trackAffiliateClick(affiliateCode);
    }

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
    const trimmed = cookie.trim();
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const name = trimmed.substring(0, eqIndex);
    const value = trimmed.substring(eqIndex + 1);

    if (name === 'affiliate' && value) {
      // Decode the value in case it was encoded when setting
      try {
        return decodeURIComponent(value);
      } catch {
        return value; // Return as-is if decoding fails
      }
    }
  }

  return null;
};

/**
 * Clears the affiliate cookie
 */
export const clearAffiliateCode = () => {
  document.cookie = 'affiliate=; max-age=0; path=/';
};
