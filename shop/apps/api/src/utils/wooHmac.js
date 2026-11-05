'use strict';
const crypto = require('crypto');

const TIMESTAMP_TOLERANCE_SECONDS = 300; // ±5 minutes
const EXTERNAL_SOURCES = ['woo_vegetablecuttingmachine', 'woo_styleyourlyf'];

/**
 * Builds the canonical string for HMAC signing.
 *
 * Format (each component on its own line, joined with \n):
 *   METHOD
 *   PATH
 *   EXTERNAL_SOURCE
 *   NONCE
 *   TIMESTAMP
 *   ITEMS_JSON
 *   ADDRESS_JSON
 *
 * Items are sorted: by wooProductId ASC (string), then wooVariantId ASC (null → "").
 * Item objects have keys in fixed order: qty, wooProductId, wooVariantId.
 * Address keys are sorted alphabetically.
 * Both JSON blocks are compact (no spaces).
 */
function buildCanonical(method, path, externalSource, nonce, timestamp, items, address) {
  // Sort items deterministically
  const sortedItems = [...items].sort((a, b) => {
    const pa = String(a.wooProductId);
    const pb = String(b.wooProductId);
    if (pa !== pb) return pa < pb ? -1 : 1;
    const va = a.wooVariantId == null ? '' : String(a.wooVariantId);
    const vb = b.wooVariantId == null ? '' : String(b.wooVariantId);
    return va < vb ? -1 : va > vb ? 1 : 0;
  });

  // Normalize items: fixed key order qty → wooProductId → wooVariantId
  const normalizedItems = sortedItems.map(item => ({
    qty: Number(item.qty),
    wooProductId: String(item.wooProductId),
    wooVariantId: item.wooVariantId == null ? null : String(item.wooVariantId),
  }));

  // Sort address keys alphabetically
  const sortedAddress = {};
  Object.keys(address).sort().forEach(k => { sortedAddress[k] = address[k]; });

  return [
    method.toUpperCase(),
    path,
    externalSource,
    nonce,
    String(timestamp),
    JSON.stringify(normalizedItems),
    JSON.stringify(sortedAddress),
  ].join('\n');
}

/**
 * Compute HMAC-SHA256 of the canonical string.
 * Returns lowercase hex string.
 * NEVER log the secret or the returned signature.
 */
function computeHmac(canonical, secret) {
  return crypto.createHmac('sha256', secret).update(canonical, 'utf8').digest('hex');
}

/**
 * Constant-time comparison to prevent timing attacks.
 */
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) {
    // Still do a comparison to consume the same time
    crypto.timingSafeEqual(Buffer.alloc(1), Buffer.alloc(1));
    return false;
  }
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Validate timestamp is within tolerance of now.
 */
function isTimestampValid(timestamp) {
  const now = Math.floor(Date.now() / 1000);
  return Math.abs(now - Number(timestamp)) <= TIMESTAMP_TOLERANCE_SECONDS;
}

/**
 * SHA-256 hash of an arbitrary string. Returns hex.
 */
function sha256hex(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

/**
 * Generate a cryptographically random raw handoff token.
 * Returns 64-char lowercase hex string (32 bytes entropy).
 * NEVER log this value.
 */
function generateRawToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  EXTERNAL_SOURCES,
  TIMESTAMP_TOLERANCE_SECONDS,
  buildCanonical,
  computeHmac,
  safeEqual,
  isTimestampValid,
  sha256hex,
  generateRawToken,
};
