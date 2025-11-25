// FILE: apps/web/src/utils/dateHelpers.js

/**
 * Check if a date is within the last N hours
 * @param {string|Date} date - The date to check
 * @param {number} hours - Number of hours threshold (default: 24)
 * @returns {boolean} - True if date is within the threshold
 */
export const isWithinHours = (date, hours = 24) => {
  if (!date) return false;
  const now = new Date();
  const target = new Date(date);
  const hoursDiff = (now - target) / (1000 * 60 * 60);
  return hoursDiff <= hours && hoursDiff >= 0;
};

/**
 * Check if item is new (created in last 24 hours)
 * @param {string|Date} createdAt - Creation timestamp
 * @returns {boolean} - True if item is new
 */
export const isNewItem = (createdAt) => {
  return isWithinHours(createdAt, 24);
};

/**
 * Get row highlight classes for new items
 * @param {string|Date} createdAt - Creation timestamp
 * @returns {string} - Tailwind CSS classes
 */
export const getNewItemClasses = (createdAt) => {
  return isNewItem(createdAt)
    ? 'bg-blue-50 hover:bg-blue-100'
    : 'hover:bg-gray-50';
};

/**
 * Get row highlight classes for pending items
 * @param {string} status - Status of the item
 * @returns {string} - Tailwind CSS classes
 */
export const getPendingItemClasses = (status) => {
  return status === 'pending'
    ? 'bg-yellow-50 hover:bg-yellow-100'
    : 'hover:bg-gray-50';
};

/**
 * Format relative time (e.g., "2 hours ago", "3 days ago")
 * @param {string|Date} date - The date to format
 * @returns {string} - Formatted relative time
 */
export const formatRelativeTime = (date) => {
  if (!date) return '';

  const now = new Date();
  const target = new Date(date);
  const diffMs = now - target;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return target.toLocaleDateString();
};
