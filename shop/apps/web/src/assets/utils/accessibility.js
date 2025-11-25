// FILE: apps/web/src/utils/accessibility.js

/**
 * Accessibility Utility Functions
 * Helper functions to improve keyboard navigation and screen reader support
 */

/**
 * Get ARIA label for common icon buttons
 * @param {string} iconName - Name of the icon (Eye, Trash, Edit, etc.)
 * @param {string} context - Optional context (e.g., "user", "product")
 * @returns {string} - Accessible label
 */
export const getIconButtonLabel = (iconName, context = '') => {
  const labels = {
    Eye: `View${context ? ` ${context}` : ''} details`,
    Trash: `Delete${context ? ` ${context}` : ''}`,
    Trash2: `Delete${context ? ` ${context}` : ''}`,
    Edit: `Edit${context ? ` ${context}` : ''}`,
    Search: 'Search',
    CheckCircle: `Approve${context ? ` ${context}` : ''}`,
    XCircle: `Reject${context ? ` ${context}` : ''}`,
    X: 'Close',
    UserX: `Remove${context ? ` ${context}` : ''}`,
    Plus: `Add${context ? ` ${context}` : ''}`,
    Minus: `Remove${context ? ` ${context}` : ''}`,
    Download: `Download${context ? ` ${context}` : ''}`,
    Upload: `Upload${context ? ` ${context}` : ''}`,
    Send: `Send${context ? ` ${context}` : ''}`,
    Filter: 'Filter results',
    RefreshCw: 'Refresh',
    Settings: 'Settings',
    Bell: 'Notifications',
    User: 'Profile',
    ShoppingCart: 'Shopping cart',
    Heart: `Add to wishlist${context ? ` - ${context}` : ''}`,
    Share: `Share${context ? ` ${context}` : ''}`,
    ExternalLink: 'Open in new tab',
    Copy: 'Copy to clipboard',
    Check: 'Confirm',
    ChevronDown: 'Expand',
    ChevronUp: 'Collapse',
    ChevronLeft: 'Previous',
    ChevronRight: 'Next',
    Menu: 'Menu',
    MoreVertical: 'More options',
    MoreHorizontal: 'More options',
  };

  return labels[iconName] || `${iconName} action`;
};

/**
 * Handle keyboard navigation for interactive elements
 * @param {KeyboardEvent} event - Keyboard event
 * @param {Function} callback - Function to call on Enter/Space
 */
export const handleKeyboardClick = (event, callback) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    callback(event);
  }
};

/**
 * Get ARIA live region settings based on urgency
 * @param {string} urgency - 'polite', 'assertive', or 'off'
 * @returns {object} - ARIA attributes
 */
export const getLiveRegionProps = (urgency = 'polite') => {
  return {
    'aria-live': urgency,
    'aria-atomic': 'true',
  };
};

/**
 * Announce message to screen readers
 * @param {string} message - Message to announce
 * @param {string} urgency - 'polite' or 'assertive'
 */
export const announce = (message, urgency = 'polite') => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', urgency);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

/**
 * Trap focus within a modal/dialog
 * @param {HTMLElement} element - Container element
 * @returns {Function} - Cleanup function
 */
export const trapFocus = (element) => {
  const focusableElements = element.querySelectorAll(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleTabKey = (e) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  element.addEventListener('keydown', handleTabKey);

  // Focus first element
  if (firstElement) {
    firstElement.focus();
  }

  // Return cleanup function
  return () => {
    element.removeEventListener('keydown', handleTabKey);
  };
};

/**
 * Get form field error ARIA attributes
 * @param {string} fieldId - Form field ID
 * @param {string} error - Error message
 * @returns {object} - ARIA attributes
 */
export const getFieldErrorProps = (fieldId, error) => {
  if (!error) return {};

  return {
    'aria-invalid': 'true',
    'aria-describedby': `${fieldId}-error`,
  };
};

/**
 * Get status badge ARIA label
 * @param {string} status - Status value
 * @returns {string} - Accessible status label
 */
export const getStatusLabel = (status) => {
  const labels = {
    pending: 'Status: Pending approval',
    approved: 'Status: Approved',
    active: 'Status: Active',
    inactive: 'Status: Inactive',
    rejected: 'Status: Rejected',
    completed: 'Status: Completed',
    cancelled: 'Status: Cancelled',
    processing: 'Status: Processing',
    shipped: 'Status: Shipped',
    delivered: 'Status: Delivered',
    paid: 'Status: Paid',
    unpaid: 'Status: Unpaid',
    refunded: 'Status: Refunded',
  };

  return labels[status] || `Status: ${status}`;
};

/**
 * Manage focus restoration after modal/dialog close
 */
export class FocusManager {
  constructor() {
    this.previousFocus = null;
  }

  saveFocus() {
    this.previousFocus = document.activeElement;
  }

  restoreFocus() {
    if (this.previousFocus && this.previousFocus.focus) {
      this.previousFocus.focus();
    }
  }
}

export default {
  getIconButtonLabel,
  handleKeyboardClick,
  getLiveRegionProps,
  announce,
  trapFocus,
  getFieldErrorProps,
  getStatusLabel,
  FocusManager,
};
