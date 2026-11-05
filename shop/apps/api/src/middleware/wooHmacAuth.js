'use strict';
const WooProductMapping = require('../models/WooProductMapping');
const { buildCanonical, computeHmac, safeEqual, isTimestampValid } = require('../utils/wooHmac');

const SECRETS = {
  woo_vegetablecuttingmachine: () => process.env.WOO_SECRET_VEGETABLE,
  woo_styleyourlyf:            () => process.env.WOO_SECRET_STYLE,
};

/**
 * Middleware that verifies the HMAC-SHA256 signature on incoming WooCommerce handoff requests.
 *
 * Expects:
 *   Header:  X-Woo-Signature: sha256=<hex>
 *   Body fields: externalSource, nonce, timestamp, items[], address{}
 *
 * On success: attaches req.woo = { externalSource, nonce, timestamp, items, address }
 * On failure: returns 401 JSON error — never reveals which check failed beyond the category.
 */
async function verifyWooHmac(req, res, next) {
  try {
    const sigHeader = req.headers['x-woo-signature'] || '';
    if (!sigHeader.startsWith('sha256=')) {
      return _reject(res, 'MISSING_SIGNATURE', 'Request signature is required');
    }
    const receivedSig = sigHeader.slice(7); // strip "sha256="

    const { externalSource, nonce, timestamp, items, address } = req.body || {};

    // Validate externalSource first (before secret lookup to avoid leaking valid sources
    // — always respond with the same error message regardless of which check failed)
    if (!externalSource || !WooProductMapping.EXTERNAL_SOURCES.includes(externalSource)) {
      return _reject(res, 'INVALID_REQUEST', 'Request could not be authenticated');
    }

    // Secret must be configured for this storefront
    const secret = SECRETS[externalSource]();
    if (!secret) {
      // Misconfiguration — not a client error
      return res.status(503).json({
        success: false,
        error: { code: 'INTEGRATION_NOT_CONFIGURED', message: 'Integration not configured for this storefront' },
      });
    }

    // Validate timestamp before expensive DB operations
    if (!timestamp || !isTimestampValid(timestamp)) {
      return _reject(res, 'INVALID_REQUEST', 'Request could not be authenticated');
    }

    // Validate nonce format (8–128 chars, alphanumeric + hyphen + underscore)
    if (!nonce || typeof nonce !== 'string' || !/^[a-zA-Z0-9_\-]{8,128}$/.test(nonce)) {
      return _reject(res, 'INVALID_REQUEST', 'Request could not be authenticated');
    }

    // Validate items and address are present and correctly typed
    if (!Array.isArray(items) || items.length === 0) {
      return _reject(res, 'INVALID_REQUEST', 'Request could not be authenticated');
    }
    if (!address || typeof address !== 'object' || Array.isArray(address)) {
      return _reject(res, 'INVALID_REQUEST', 'Request could not be authenticated');
    }

    // Rebuild canonical string from received body (same algorithm as PHP signer)
    const canonical = buildCanonical(
      req.method,
      // Full mounted path ("/api/woo/handoff"), which is what the storefront signs;
      // req.path would only be "/handoff" inside this router.
      req.baseUrl + req.path,
      externalSource,
      nonce,
      timestamp,
      items,
      address
    );

    const expectedSig = computeHmac(canonical, secret);

    if (!safeEqual(receivedSig, expectedSig)) {
      return _reject(res, 'INVALID_REQUEST', 'Request could not be authenticated');
    }

    // Attach parsed, validated payload for the controller
    req.woo = { externalSource, nonce, timestamp: Number(timestamp), items, address };
    return next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Authentication failed' },
    });
  }
}

function _reject(res, code, message) {
  return res.status(401).json({ success: false, error: { code, message } });
}

module.exports = { verifyWooHmac };
