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

function generateAccessToken(userId, role) {
  validateRole(role);
  return jwt.sign({ userId, role }, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
}

function generateRefreshToken(userId, role) {
  validateRole(role);
  return jwt.sign({ userId, role }, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
}

function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_TOKEN_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_TOKEN_SECRET);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
