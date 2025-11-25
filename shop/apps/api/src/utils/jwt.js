// FILE: apps/api/src/utils/jwt.js
const jwt = require('jsonwebtoken');

// SECURITY: Validate that JWT secrets are properly configured
if (!process.env.ACCESS_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET.length < 32) {
  throw new Error('ACCESS_TOKEN_SECRET must be set and at least 32 characters long');
}
if (!process.env.REFRESH_TOKEN_SECRET || process.env.REFRESH_TOKEN_SECRET.length < 32) {
  throw new Error('REFRESH_TOKEN_SECRET must be set and at least 32 characters long');
}

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d'; // 1 month

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
