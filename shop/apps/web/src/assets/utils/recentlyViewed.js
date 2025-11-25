// FILE: apps/web/src/utils/recentlyViewed.js
// Utility for managing recently viewed products in localStorage

const STORAGE_KEY = 'recentlyViewedProducts';
const MAX_ITEMS = 12; // Keep last 12 viewed products

/**
 * Add a product to recently viewed list
 * @param {Object} product - Product object with _id, title, slug, images, price
 */
export const addToRecentlyViewed = (product) => {
  try {
    // Get existing items
    const existing = getRecentlyViewed();

    // Create simplified product object to save space
    const simplifiedProduct = {
      _id: product._id,
      title: product.title,
      slug: product.slug,
      image: product.images?.[0] || null,
      price: product.price,
      compareAt: product.compareAt,
      rating: product.rating,
      reviewCount: product.reviewCount,
      stock: product.stock,
      viewedAt: new Date().toISOString(),
    };

    // Remove if already exists (to avoid duplicates and update timestamp)
    const filtered = existing.filter(item => item._id !== product._id);

    // Add to beginning of array
    const updated = [simplifiedProduct, ...filtered];

    // Keep only MAX_ITEMS
    const trimmed = updated.slice(0, MAX_ITEMS);

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));

    return trimmed;
  } catch (error) {
    console.error('Error saving recently viewed product:', error);
    return [];
  }
};

/**
 * Get recently viewed products
 * @param {number} limit - Maximum number of items to return
 * @returns {Array} Array of recently viewed products
 */
export const getRecentlyViewed = (limit = MAX_ITEMS) => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const items = JSON.parse(stored);
    return items.slice(0, limit);
  } catch (error) {
    console.error('Error reading recently viewed products:', error);
    return [];
  }
};

/**
 * Clear all recently viewed products
 */
export const clearRecentlyViewed = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing recently viewed products:', error);
  }
};

/**
 * Remove a specific product from recently viewed
 * @param {string} productId - Product ID to remove
 */
export const removeFromRecentlyViewed = (productId) => {
  try {
    const existing = getRecentlyViewed();
    const filtered = existing.filter(item => item._id !== productId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return filtered;
  } catch (error) {
    console.error('Error removing from recently viewed:', error);
    return [];
  }
};
