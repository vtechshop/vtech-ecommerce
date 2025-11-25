// FILE: apps/web/src/constants/theme.js
/**
 * V-Tech E-commerce Platform - Theme Constants
 *
 * Centralized theme configuration for consistent UI across the platform.
 * Use these constants to maintain design consistency.
 *
 * Brand Colors:
 * - White: #ffffff
 * - Cyan: #6cdef3
 * - Teal: #13778a
 * - Gray: #6b6b6b
 * - Dark: #262626
 */

// ============================================
// TYPOGRAPHY HIERARCHY
// ============================================
export const TYPOGRAPHY = {
  // Hero title (Homepage only)
  hero: 'text-4xl md:text-5xl lg:text-6xl font-bold',

  // Page titles (H1)
  h1: 'text-3xl md:text-4xl font-bold',

  // Section titles (H2)
  h2: 'text-xl md:text-2xl font-bold',

  // Subsection titles (H3)
  h3: 'text-lg md:text-xl font-semibold',

  // Card/Component titles (H4)
  h4: 'text-base md:text-lg font-semibold',

  // Body text
  bodyLarge: 'text-lg',
  body: 'text-base',
  bodySmall: 'text-sm',
  caption: 'text-xs',

  // Lead text
  lead: 'text-lg md:text-xl',
};

// ============================================
// BUTTON STYLES (with animations)
// ============================================
export const BUTTONS = {
  // Primary action buttons - Cyan gradient with glow effect
  primary: 'px-6 py-3 bg-gradient-to-r from-primary-300 to-primary-500 text-white rounded-lg font-semibold text-base hover:from-primary-400 hover:to-primary-600 hover:shadow-glow-cyan transition-all duration-300 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg active:scale-95 disabled:from-neutral-400 disabled:to-neutral-500 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:translate-y-0',

  // Secondary buttons - Teal with smooth transition
  secondary: 'px-6 py-3 bg-gradient-to-r from-secondary-500 to-secondary-600 text-white rounded-lg font-semibold text-base hover:from-secondary-600 hover:to-secondary-700 hover:shadow-glow-teal transition-all duration-300 transform hover:-translate-y-0.5 shadow-md active:scale-95',

  // Outline buttons with fill animation
  outline: 'px-4 py-2 border-2 border-primary-300 text-primary-500 bg-transparent rounded-lg font-semibold text-sm hover:bg-primary-300 hover:text-white hover:border-primary-400 transition-all duration-300 transform hover:-translate-y-0.5',

  // Danger/destructive buttons
  danger: 'px-6 py-3 bg-red-600 text-white rounded-lg font-semibold text-base hover:bg-red-700 transition-all duration-300 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg active:scale-95',

  // Compact buttons (navigation, small actions)
  compact: 'px-3 py-1.5 bg-gradient-to-r from-primary-300 to-primary-400 text-white rounded text-xs font-semibold hover:from-primary-400 hover:to-primary-500 transition-all duration-200 shadow-sm hover:shadow-md active:scale-95',

  // Icon buttons with scale effect
  icon: 'p-2 rounded-lg hover:bg-primary-50 transition-all duration-200 hover:scale-110 active:scale-95',

  // Link-style buttons
  link: 'text-primary-500 hover:text-primary-600 font-medium relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-primary-500 after:transition-all after:duration-300 hover:after:w-full',

  // Ghost button - minimal style
  ghost: 'px-4 py-2 text-neutral-600 rounded-lg font-medium text-sm hover:bg-neutral-100 transition-all duration-200 hover:scale-105 active:scale-95',
};

// ============================================
// CARD/CONTAINER STYLES (with animations)
// ============================================
export const CARDS = {
  // Default card with subtle hover
  default: 'bg-white rounded-lg shadow-soft border border-neutral-200 p-6 transition-all duration-300',

  // Compact card (for lists, grids)
  compact: 'bg-white rounded-lg shadow-soft border border-neutral-200 p-4 transition-all duration-300',

  // Featured/Hero card with glow
  featured: 'bg-white rounded-xl shadow-card border border-neutral-200 p-8 transition-all duration-400 hover:shadow-card-hover',

  // Interactive card (with hover effect)
  hover: 'bg-white rounded-lg shadow-soft border border-neutral-200 p-6 hover:shadow-card hover:border-primary-200 hover:-translate-y-1 transition-all duration-300 cursor-pointer group',

  // Product card with advanced effects
  product: 'bg-white rounded-lg shadow-soft border border-neutral-200 p-4 hover:shadow-card-hover hover:border-primary-300 hover:-translate-y-2 hover:scale-[1.02] transition-all duration-400 cursor-pointer overflow-hidden relative',

  // Minimal card (no shadow)
  minimal: 'bg-white rounded-lg border border-neutral-200 p-6 hover:border-primary-200 transition-all duration-300',

  // Gradient card
  gradient: 'bg-gradient-to-br from-primary-50 via-white to-secondary-50 rounded-xl shadow-card border border-primary-100 p-6 transition-all duration-300 hover:shadow-card-hover',

  // Glass morphism card
  glass: 'bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-white/20 p-6 transition-all duration-300 hover:bg-white/90',
};

// ============================================
// SPACING SYSTEM
// ============================================
export const SPACING = {
  // Container/Page padding
  container: 'px-3 sm:px-4 md:px-6',
  containerWide: 'px-3 sm:px-4 md:px-6 max-w-screen-2xl',

  // Section spacing
  section: 'py-8 md:py-12',
  sectionCompact: 'py-6 md:py-8',

  // Card padding
  card: 'p-6',
  cardCompact: 'p-4',
  cardLarge: 'p-8',

  // Element gaps
  gapSmall: 'gap-2',
  gap: 'gap-4',
  gapMedium: 'gap-6',
  gapLarge: 'gap-8',

  // Stack spacing
  stackSmall: 'space-y-2',
  stack: 'space-y-4',
  stackMedium: 'space-y-6',
  stackLarge: 'space-y-8',
};

// ============================================
// BORDER RADIUS
// ============================================
export const RADIUS = {
  small: 'rounded',         // 4px - badges, pills
  default: 'rounded-md',    // 6px - inputs, small buttons
  medium: 'rounded-lg',     // 8px - cards, buttons (most common)
  large: 'rounded-xl',      // 12px - featured cards
  xlarge: 'rounded-2xl',    // 16px - hero sections
  full: 'rounded-full',     // 9999px - avatars, pills
};

// ============================================
// SHADOWS
// ============================================
export const SHADOWS = {
  subtle: 'shadow-sm',      // Default cards
  default: 'shadow',        // Standard elements
  medium: 'shadow-md',      // Hover states, featured items
  large: 'shadow-lg',       // Modals, dropdowns
  xlarge: 'shadow-xl',      // Hero sections
  xxlarge: 'shadow-2xl',    // Special emphasis
};

// ============================================
// TRANSITIONS
// ============================================
export const TRANSITIONS = {
  default: 'transition-all duration-200',
  colors: 'transition-colors duration-200',
  shadow: 'transition-shadow duration-200',
  transform: 'transition-transform duration-200',
  slow: 'transition-all duration-300',
  fast: 'transition-all duration-150',
};

// ============================================
// COLOR UTILITIES (Brand Colors)
// ============================================
export const COLORS = {
  // Primary (Cyan #6cdef3)
  primary: {
    bg: 'bg-primary-300',
    bgHover: 'hover:bg-primary-400',
    text: 'text-primary-500',
    textHover: 'hover:text-primary-600',
    border: 'border-primary-300',
    borderHover: 'hover:border-primary-400',
    gradient: 'bg-gradient-to-r from-primary-300 to-primary-500',
    gradientHover: 'hover:from-primary-400 hover:to-primary-600',
    glow: 'shadow-glow-cyan',
  },

  // Secondary (Teal #13778a)
  secondary: {
    bg: 'bg-secondary-500',
    bgHover: 'hover:bg-secondary-600',
    text: 'text-secondary-500',
    textHover: 'hover:text-secondary-600',
    border: 'border-secondary-500',
    borderHover: 'hover:border-secondary-600',
    gradient: 'bg-gradient-to-r from-secondary-500 to-secondary-600',
    gradientHover: 'hover:from-secondary-600 hover:to-secondary-700',
    glow: 'shadow-glow-teal',
  },

  // Neutral (Gray #6b6b6b)
  neutral: {
    bg: 'bg-neutral-500',
    bgHover: 'hover:bg-neutral-600',
    text: 'text-neutral-500',
    textHover: 'hover:text-neutral-600',
    border: 'border-neutral-300',
    borderHover: 'hover:border-neutral-400',
    light: 'bg-neutral-100',
  },

  // Dark (#262626)
  dark: {
    bg: 'bg-dark-500',
    bgHover: 'hover:bg-dark-600',
    text: 'text-dark-500',
    textHover: 'hover:text-dark-600',
    border: 'border-dark-400',
  },

  // Backgrounds
  backgrounds: {
    page: 'bg-gray-50',
    card: 'bg-white',
    subtle: 'bg-neutral-50',
    gradient: 'bg-gradient-to-br from-primary-50 via-white to-secondary-50',
  },

  // Text colors
  text: {
    heading: 'text-dark-500',
    body: 'text-neutral-600',
    bodyDark: 'text-neutral-700',
    muted: 'text-neutral-500',
    light: 'text-neutral-400',
    white: 'text-white',
  },
};

// ============================================
// ANIMATION UTILITIES
// ============================================
export const ANIMATIONS = {
  // Fade animations
  fadeIn: 'animate-fade-in',
  fadeInUp: 'animate-fade-in-up',
  fadeInDown: 'animate-fade-in-down',
  fadeInLeft: 'animate-fade-in-left',
  fadeInRight: 'animate-fade-in-right',

  // Scale animations
  scaleIn: 'animate-scale-in',
  scaleUp: 'animate-scale-up',

  // Slide animations
  slideInUp: 'animate-slide-in-up',
  slideInDown: 'animate-slide-in-down',
  slideInLeft: 'animate-slide-in-left',
  slideInRight: 'animate-slide-in-right',

  // Special effects
  bounce: 'animate-bounce-in',
  float: 'animate-float',
  pulse: 'animate-pulse-slow',
  shimmer: 'animate-shimmer',
  glow: 'animate-glow',
  spin: 'animate-spin-slow',

  // Hover effects
  hoverLift: 'hover-lift',
  hoverScale: 'hover-scale',
  hoverGlowCyan: 'hover-glow-cyan',
  hoverGlowTeal: 'hover-glow-teal',
};

// ============================================
// COMMON PATTERNS
// ============================================
export const PATTERNS = {
  // Page header
  pageHeader: 'mb-6 md:mb-8',

  // Section divider
  divider: 'border-t border-gray-200 my-6',

  // Input field
  input: 'w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 transition-all',

  // Form label
  label: 'block text-sm font-medium text-gray-700 mb-2',

  // Badge/Pill
  badge: 'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold',

  // Alert/Banner
  alert: 'p-4 rounded-lg border-l-4',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Combine multiple theme classes
 * @param {...string} classes - Classes to combine
 * @returns {string} Combined class string
 */
export const cx = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

/**
 * Get responsive container classes
 * @param {boolean} wide - Use wide container
 * @returns {string} Container classes
 */
export const getContainer = (wide = false) => {
  return cx(
    'container mx-auto',
    wide ? SPACING.containerWide : SPACING.container
  );
};

/**
 * Get button classes by variant
 * @param {string} variant - Button variant (primary, secondary, etc.)
 * @param {string} size - Button size (default, compact)
 * @returns {string} Button classes
 */
export const getButtonClasses = (variant = 'primary', size = 'default') => {
  const baseClasses = BUTTONS[variant] || BUTTONS.primary;

  if (size === 'compact') {
    return BUTTONS.compact;
  }

  return baseClasses;
};

/**
 * Get card classes by variant
 * @param {string} variant - Card variant (default, compact, featured, hover)
 * @returns {string} Card classes
 */
export const getCardClasses = (variant = 'default') => {
  return CARDS[variant] || CARDS.default;
};

export default {
  TYPOGRAPHY,
  BUTTONS,
  CARDS,
  SPACING,
  RADIUS,
  SHADOWS,
  TRANSITIONS,
  COLORS,
  ANIMATIONS,
  PATTERNS,
  cx,
  getContainer,
  getButtonClasses,
  getCardClasses,
};
