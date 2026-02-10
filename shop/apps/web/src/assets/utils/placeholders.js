// Placeholder images as data URLs to avoid 404 errors

// Small product image placeholder (48x48)
export const PLACEHOLDER_IMAGE_SM = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"%3E%3Crect width="48" height="48" fill="%23f3f4f6"/%3E%3Cpath d="M19 17a3 3 0 1 1 6 0 3 3 0 0 1-6 0zm-2 14l5-6 3 3 7-9 6 8v4H17v-0z" fill="%239ca3af"/%3E%3C/svg%3E';

// Medium product image placeholder (100x100)
export const PLACEHOLDER_IMAGE_MD = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23f3f4f6"/%3E%3Cpath d="M35 30a8 8 0 1 1 16 0 8 8 0 0 1-16 0zm-5 45l15-18 10 10 20-25 15 20v13H30v-0z" fill="%239ca3af"/%3E%3C/svg%3E';

// Large product image placeholder (400x300)
export const PLACEHOLDER_IMAGE_LG = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"%3E%3Crect width="400" height="300" fill="%23f3f4f6"/%3E%3Cpath d="M120 80a25 25 0 1 1 50 0 25 25 0 0 1-50 0zm-20 150l60-70 40 40 80-100 60 80v50H100v-0z" fill="%239ca3af"/%3E%3Ctext x="200" y="260" text-anchor="middle" fill="%239ca3af" font-family="Arial" font-size="16">No Image</text>%3C/svg%3E';

// Blog image placeholder
export const PLACEHOLDER_BLOG = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"%3E%3Crect width="400" height="300" fill="%23e2e8f0"/%3E%3Cpath d="M120 80a25 25 0 1 1 50 0 25 25 0 0 1-50 0zm-20 150l60-70 40 40 80-100 60 80v50H100v-0z" fill="%2394a3b8"/%3E%3Ctext x="200" y="260" text-anchor="middle" fill="%2364748b" font-family="Arial" font-size="16">Blog Post</text>%3C/svg%3E';

// Default placeholder (same as MD)
export const PLACEHOLDER_IMAGE = PLACEHOLDER_IMAGE_MD;

// Helper function for image error handling
export const handleImageError = (e, placeholder = PLACEHOLDER_IMAGE) => {
  e.target.onerror = null; // Prevent infinite loop
  e.target.src = placeholder;
};

/**
 * Optimize Cloudinary URL with transformations for better performance
 * @param {string} url - Cloudinary URL
 * @param {object} options - Transformation options
 * @returns {string} - Optimized Cloudinary URL
 */
const optimizeCloudinaryUrl = (url, options = {}) => {
  const { width = 200, quality = 'auto', format = 'auto' } = options;

  // Check if it's a Cloudinary URL
  if (!url.includes('res.cloudinary.com')) {
    return url;
  }

  // Check if transformations already exist
  if (url.includes('/q_auto') || url.includes('/f_auto') || url.includes('/w_')) {
    return url;
  }

  // Add transformations to Cloudinary URL with c_fill for proper cropping
  const transformations = `q_${quality},f_${format},w_${width},c_fill`;
  return url.replace('/upload/', `/upload/${transformations}/`);
};

/**
 * Generate srcset for responsive Cloudinary images
 * @param {string} url - Cloudinary URL
 * @returns {object} - { src, srcSet, sizes } for responsive images
 */
export const getResponsiveImageUrls = (url) => {
  if (!url || !url.includes('res.cloudinary.com')) {
    return { src: url, srcSet: null, sizes: null };
  }

  // Remove existing transformations if any
  let baseUrl = url;
  const uploadMatch = url.match(/\/upload\/([^/]+)\//);
  if (uploadMatch && uploadMatch[1].includes(',')) {
    // Has transformations (comma-separated), remove them
    baseUrl = url.replace(`/upload/${uploadMatch[1]}/`, '/upload/');
  }

  // Responsive widths matching actual card display sizes
  const widths = [200, 300, 400];
  const srcSet = widths.map(w => {
    const optimized = baseUrl.replace('/upload/', `/upload/q_auto,f_auto,w_${w},c_fill/`);
    return `${optimized} ${w}w`;
  }).join(', ');

  // Default src - good quality for most screens
  const src = baseUrl.replace('/upload/', '/upload/q_auto,f_auto,w_300,c_fill/');

  // Sizes attribute - match actual card display sizes
  const sizes = '(max-width: 480px) 160px, (max-width: 768px) 200px, 300px';

  return { src, srcSet, sizes };
};

/**
 * Normalize image URL to fix mixed content issues
 * Converts localhost URLs to production API URL and ensures HTTPS
 * Also optimizes Cloudinary URLs for better performance
 * @param {string} url - The image URL to normalize
 * @param {object} options - Optional optimization settings
 * @returns {string} - Normalized image URL
 */
export const normalizeImageUrl = (url, options = {}) => {
  if (!url) return PLACEHOLDER_IMAGE;

  // If it's already a data URL or blob, return as-is
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  // Get the API base URL from environment
  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
  // Remove '/api' suffix to get the server base URL
  const serverBaseUrl = apiBaseUrl.replace(/\/api$/, '');

  // Replace localhost URLs with production URL
  let normalizedUrl = url
    .replace(/^https?:\/\/localhost:\d+/, serverBaseUrl)
    .replace(/^http:\/\/127\.0\.0\.1:\d+/, serverBaseUrl);

  // Replace old Render domain with new one (vtech-shop -> vtech-ecommerce)
  normalizedUrl = normalizedUrl.replace(
    /https?:\/\/vtech-shop\.onrender\.com/g,
    serverBaseUrl
  );

  // If URL starts with /uploads, prepend the server base URL
  if (normalizedUrl.startsWith('/uploads')) {
    normalizedUrl = serverBaseUrl + normalizedUrl;
  }

  // In production, upgrade HTTP to HTTPS (except for localhost)
  if (import.meta.env.MODE === 'production' &&
      normalizedUrl.startsWith('http://') &&
      !normalizedUrl.includes('localhost') &&
      !normalizedUrl.includes('127.0.0.1')) {
    normalizedUrl = normalizedUrl.replace('http://', 'https://');
  }

  // Optimize Cloudinary URLs in production
  if (import.meta.env.MODE === 'production') {
    normalizedUrl = optimizeCloudinaryUrl(normalizedUrl, options);
  }

  return normalizedUrl;
};
