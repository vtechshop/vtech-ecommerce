// FILE: apps/web/src/store/slices/consentSlice.js
import { createSlice } from '@reduxjs/toolkit';
import Cookies from 'js-cookie';

const CONSENT_COOKIE_NAME = 'cookie_consent';
const CONSENT_VERSION = '1.0';
const CONSENT_EXPIRY_DAYS = 30; // 1 month expiration

// Check if consent cookie exists synchronously to avoid flash
const checkConsentCookie = () => {
  try {
    const saved = Cookies.get(CONSENT_COOKIE_NAME);
    if (!saved || saved === 'undefined' || saved === '') {
      return false; // No cookie found - show banner
    }
    const parsed = JSON.parse(saved);
    // Check if version matches and has valid preferences
    if (parsed.version === CONSENT_VERSION && parsed.preferences) {
      return true; // Valid consent exists - hide banner
    }
    return false; // Invalid or outdated consent - show banner
  } catch (e) {
    // Any error means we should show the banner
    console.warn('Error checking consent cookie:', e);
    return false;
  }
};

const initialState = {
  bannerVisible: !checkConsentCookie(), // Show banner only if no valid consent exists
  preferences: {
    essential: true, // Always true
    analytics: false,
    marketing: false,
  },
  version: null,
};

const consentSlice = createSlice({
  name: 'consent',
  initialState,
  reducers: {
    loadConsent: (state) => {
      try {
        const saved = Cookies.get(CONSENT_COOKIE_NAME);
        if (!saved || saved === 'undefined' || saved === '') {
          // No valid cookie - show banner to new/unknown visitors
          state.bannerVisible = true;
          return;
        }

        const parsed = JSON.parse(saved);
        if (parsed.version === CONSENT_VERSION && parsed.preferences) {
          // Valid consent found - hide banner
          state.preferences = parsed.preferences;
          state.version = parsed.version;
          state.bannerVisible = false;
        } else {
          // Version mismatch or invalid data - show banner again
          state.bannerVisible = true;
        }
      } catch (e) {
        // Parse error - show banner for safety
        console.warn('Error loading consent:', e);
        state.bannerVisible = true;
      }
    },
    setConsent: (state, action) => {
      state.preferences = {
        essential: true,
        ...action.payload,
      };
      state.version = CONSENT_VERSION;
      state.bannerVisible = false;

      // Save to cookie (30 days / 1 month) - ensure it's available across the entire site
      Cookies.set(
        CONSENT_COOKIE_NAME,
        JSON.stringify({
          preferences: state.preferences,
          version: state.version,
          timestamp: new Date().toISOString(),
        }),
        {
          expires: CONSENT_EXPIRY_DAYS,
          path: '/',
          sameSite: 'Lax'
        }
      );
    },
    acceptAll: (state) => {
      state.preferences = {
        essential: true,
        analytics: true,
        marketing: true,
      };
      state.version = CONSENT_VERSION;
      state.bannerVisible = false;

      Cookies.set(
        CONSENT_COOKIE_NAME,
        JSON.stringify({
          preferences: state.preferences,
          version: state.version,
          timestamp: new Date().toISOString(),
        }),
        {
          expires: CONSENT_EXPIRY_DAYS,
          path: '/',
          sameSite: 'Lax'
        }
      );
    },
    rejectNonEssential: (state) => {
      state.preferences = {
        essential: true,
        analytics: false,
        marketing: false,
      };
      state.version = CONSENT_VERSION;
      state.bannerVisible = false;

      Cookies.set(
        CONSENT_COOKIE_NAME,
        JSON.stringify({
          preferences: state.preferences,
          version: state.version,
          timestamp: new Date().toISOString(),
        }),
        {
          expires: CONSENT_EXPIRY_DAYS,
          path: '/',
          sameSite: 'Lax'
        }
      );
    },
    showBanner: (state) => {
      state.bannerVisible = true;
    },
  },
});

export const { loadConsent, setConsent, acceptAll, rejectNonEssential, showBanner } =
  consentSlice.actions;
export default consentSlice.reducer;