// FILE: apps/api/src/utils/helpers.js
// Generate unique order ID
const generateOrderId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `ORD-${timestamp}${random}`;
};

// Generate unique affiliate code
const generateAffiliateCode = (name) => {
  const cleaned = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 6);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${cleaned}${random}`;
};

// Calculate pagination metadata
const getPaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
};

// Slugify string
const slugify = (str) => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Generate SKU
const generateSKU = (prefix = 'SKU') => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${timestamp}${random}`;
};

// SECURITY: Escape regex special characters to prevent ReDoS attacks
const escapeRegex = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

module.exports = {
  generateOrderId,
  generateAffiliateCode,
  getPaginationMeta,
  slugify,
  escapeRegex,
  generateSKU,
};