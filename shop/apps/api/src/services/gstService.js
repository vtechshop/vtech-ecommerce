// FILE: apps/api/src/services/gstService.js
const env = require('../config/env');
const logger = require('../config/logger');

/**
 * Verify a GST number using AppyFlow API
 * @param {string} gstNumber - GST number to verify (15 characters)
 * @returns {Promise<{verified: boolean, data?: object, error?: string}>}
 */
const verifyGST = async (gstNumber) => {
  if (!gstNumber || gstNumber.length !== 15) {
    return { verified: false, error: 'GST number must be exactly 15 characters' };
  }

  // Validate GST format: 2-digit state code + 10-char PAN + 1 entity + 1 Z + 1 check digit
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}[Z]{1}[A-Z0-9]{1}$/;
  if (!gstRegex.test(gstNumber.toUpperCase())) {
    return { verified: false, error: 'Invalid GST number format' };
  }

  const keySecret = env.APPYFLOW_KEY_SECRET;
  if (!keySecret) {
    logger.error('APPYFLOW_KEY_SECRET is not configured');
    return { verified: false, error: 'GST verification service is not configured' };
  }

  try {
    const url = `https://appyflow.in/api/verifyGST?gstNo=${encodeURIComponent(gstNumber.toUpperCase())}&key_secret=${encodeURIComponent(keySecret)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    if (!response.ok) {
      logger.error(`AppyFlow API error: ${response.status} ${response.statusText}`);
      return { verified: false, error: 'GST verification service unavailable' };
    }

    const result = await response.json();

    // AppyFlow returns taxpayer info if valid, or error if invalid
    if (result.error || result.flag === false) {
      return {
        verified: false,
        error: result.message || result.error || 'Invalid GST number',
      };
    }

    // Extract relevant fields from the response
    const gstDetails = {
      gstNumber: result.gstin || gstNumber.toUpperCase(),
      tradeName: result.tradeNam || '',
      legalName: result.lgnm || '',
      status: result.sts || '',
      registrationDate: result.rgdt || '',
      lastUpdateDate: result.lstupdt || '',
      businessType: result.ctb || '',
      stateCode: result.stj || '',
      address: buildAddress(result.pradr),
      natureOfBusiness: result.nba || [],
    };

    const isActive = (gstDetails.status || '').toLowerCase() === 'active';

    logger.info(`GST verified: ${gstNumber} - ${gstDetails.legalName} (${gstDetails.status})`);

    return {
      verified: true,
      active: isActive,
      data: gstDetails,
    };
  } catch (error) {
    logger.error('GST verification failed:', error.message);
    return { verified: false, error: 'GST verification failed. Please try again.' };
  }
};

/**
 * Build address string from AppyFlow address object
 */
const buildAddress = (pradr) => {
  if (!pradr || !pradr.addr) return '';
  const a = pradr.addr;
  const parts = [a.bno, a.bnm, a.flno, a.st, a.loc, a.dst, a.stcd, a.pncd].filter(Boolean);
  return parts.join(', ');
};

module.exports = { verifyGST };
