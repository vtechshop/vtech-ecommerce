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
  const { width, quality = 'auto', format = 'auto' } = options;

  // Check if it's a Cloudinary URL
  if (!url.includes('res.cloudinary.com')) {
    return url;
  }

  // If width requested and already has w_ transform at the right size, skip
  if (width && url.includes(`/w_${width}`)) {
    return url;
  }

  // Strip existing transform segments between /upload/ and /v1/ (or version folder)
  // Handles both comma-separated (q_auto,f_auto) and slash-separated (q_auto:good/f_auto)
  let cleanUrl = url;
  const uploadIdx = cleanUrl.indexOf('/upload/');
  if (uploadIdx !== -1) {
    const afterUpload = cleanUrl.substring(uploadIdx + 8); // after "/upload/"
    // Find the version folder (v1/, v2/, etc.) or the asset path
    const versionMatch = afterUpload.match(/^(.*?)(v\d+\/)/);
    if (versionMatch && versionMatch[1]) {
      // Remove existing transforms before version folder
      cleanUrl = cleanUrl.substring(0, uploadIdx + 8) + versionMatch[2] + afterUpload.substring(versionMatch[0].length);
    }
  }

  // Build new transforms
  const transforms = [`q_${quality}`, `f_${format}`];
  if (width) transforms.push(`w_${width}`, 'c_fill');
  const transformations = transforms.join(',');

  return cleanUrl.replace('/upload/', `/upload/${transformations}/`);
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

  // Strip ALL existing transforms between /upload/ and version folder
  let baseUrl = url;
  const uploadIdx = baseUrl.indexOf('/upload/');
  if (uploadIdx !== -1) {
    const afterUpload = baseUrl.substring(uploadIdx + 8);
    const versionMatch = afterUpload.match(/^(.*?)(v\d+\/)/);
    if (versionMatch && versionMatch[1]) {
      baseUrl = baseUrl.substring(0, uploadIdx + 8) + versionMatch[2] + afterUpload.substring(versionMatch[0].length);
    }
  }

  // Responsive widths - smaller for mobile, matches actual card display sizes
  const widths = [160, 200, 300];
  const srcSet = widths.map(w => {
    const optimized = baseUrl.replace('/upload/', `/upload/q_auto,f_auto,w_${w},c_fill/`);
    return `${optimized} ${w}w`;
  }).join(', ');

  // Default src - mobile-first size
  const src = baseUrl.replace('/upload/', '/upload/q_auto,f_auto,w_200,c_fill/');

  // Sizes attribute - match actual card display sizes on different screens
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
