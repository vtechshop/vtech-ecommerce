// CDN URL Helper
const env = require('../config/env');

/**
 * Get CDN URL or fallback to local server URL
 * @param {string} path - Path to the asset (e.g., '/uploads/image.jpg')
 * @returns {string} Full URL to the asset
 */
const getCdnUrl = (path) => {
  if (!path) return '';
  
  // If CDN is configured, use it
  if (env.CDN_URL) {
    // Remove leading slash if CDN_URL already has trailing slash
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const cdnBase = env.CDN_URL.endsWith('/') ? env.CDN_URL.slice(0, -1) : env.CDN_URL;
    return `${cdnBase}/${cleanPath}`;
  }
  
  // Otherwise, use local server URL
  return `${env.APP_URL}${path.startsWith('/') ? path : '/' + path}`;
};

/**
 * Transform product image URLs to use CDN
 * @param {object} product - Product object
 * @returns {object} Product with CDN URLs
 */
const addCdnToProduct = (product) => {
  if (!product) return product;
  
  const prod = { ...product };
  
  if (prod.images && Array.isArray(prod.images)) {
    prod.images = prod.images.map(img => ({
      ...img,
      url: getCdnUrl(img.url)
    }));
  }
  
  return prod;
};

module.exports = { getCdnUrl, addCdnToProduct };
