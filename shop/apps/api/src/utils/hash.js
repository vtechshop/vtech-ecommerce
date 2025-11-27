// FILE: apps/api/src/utils/hash.js
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function hashPassword(plain) {
  // SECURITY: Use 12 rounds minimum (2025 OWASP recommendation)
  // Each increment doubles the time, making brute-force exponentially harder
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(plain, salt);
}

async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

/**
 * Hash a refresh token using SHA-256
 * Faster than bcrypt since tokens are already cryptographically random
 * @param {string} token - The refresh token to hash
 * @returns {string} - The hashed token
 */
function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Compare a plain refresh token with a hashed one
 * @param {string} plainToken - The plain refresh token
 * @param {string} hashedToken - The hashed refresh token from database
 * @returns {boolean} - True if tokens match
 */
function compareRefreshToken(plainToken, hashedToken) {
  const hashedPlain = hashRefreshToken(plainToken);
  return crypto.timingSafeEqual(
    Buffer.from(hashedPlain, 'hex'),
    Buffer.from(hashedToken, 'hex')
  );
}

module.exports = { hashPassword, comparePassword, hashRefreshToken, compareRefreshToken };
