// FILE: apps/api/src/utils/jwt.js
const jwt = require('jsonwebtoken');
const env = require('../config/env');

// Use centralized config which validates secrets
const ACCESS_TOKEN_SECRET = env.JWT_ACCESS_SECRET;
const REFRESH_TOKEN_SECRET = env.JWT_REFRESH_SECRET;
const ACCESS_TOKEN_EXPIRES_IN = env.JWT_ACCESS_TTL;
const REFRESH_TOKEN_EXPIRES_IN = env.JWT_REFRESH_TTL;

// SECURITY: Whitelist of allowed roles
const ALLOWED_ROLES = ['guest', 'customer', 'vendor', 'affiliate', 'support', 'admin'];

function validateRole(role) {
  if (!role || !ALLOWED_ROLES.includes(role)) {
    throw new Error(`Invalid role: ${role}. Must be one of: ${ALLOWED_ROLES.join(', ')}`);
  }
}

function generateAccessToken(userId, role, email = null) {
  validateRole(role);
  const payload = { userId, role };
  if (email) payload.email = email;
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
}

function generateRefreshToken(userId, role, email = null) {
  validateRole(role);
  const payload = { userId, role };
  if (email) payload.email = email;
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
}

function verifyAccessToken(token) {
  const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);

  // Validate role in decoded token to prevent tampering
  if (!decoded.role || !ALLOWED_ROLES.includes(decoded.role)) {
    throw new Error('Invalid role in token');
  }

  return decoded;
}

function verifyRefreshToken(token) {
  const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET);

  // Validate role in decoded token to prevent tampering
  if (!decoded.role || !ALLOWED_ROLES.includes(decoded.role)) {
    throw new Error('Invalid role in token');
  }

  return decoded;
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
