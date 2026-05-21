// FILE: apps/web/src/assets/utils/animations.js
/**
 * Custom Animation Utilities Library for VTech E-Commerce
 * Provides reusable animation configurations and helper functions
 */

// ============ ANIMATION VARIANTS ============

/**
 * Fade animations
 */
export const fadeVariants = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    className: 'fade-in',
  },
  fadeInUp: {
    initial: { opacity: 0, transform: 'translateY(20px)' },
    animate: { opacity: 1, transform: 'translateY(0)' },
    className: 'fade-in-up',
  },
  fadeInDown: {
    initial: { opacity: 0, transform: 'translateY(-20px)' },
    animate: { opacity: 1, transform: 'translateY(0)' },
    className: 'fade-in-down',
  },
  fadeInLeft: {
    initial: { opacity: 0, transform: 'translateX(-20px)' },
    animate: { opacity: 1, transform: 'translateX(0)' },
    className: 'fade-in-left',
  },
  fadeInRight: {
    initial: { opacity: 0, transform: 'translateX(20px)' },
    animate: { opacity: 1, transform: 'translateX(0)' },
    className: 'fade-in-right',
  },
};

/**
 * Scale animations
 */
export const scaleVariants = {
  scaleIn: {
    initial: { opacity: 0, transform: 'scale(0.8)' },
    animate: { opacity: 1, transform: 'scale(1)' },
    className: 'scale-in',
  },
  scaleUp: {
    initial: { transform: 'scale(1)' },
    hover: { transform: 'scale(1.05)' },
    className: 'scale-up-hover',
  },
  bounceIn: {
    initial: { opacity: 0, transform: 'scale(0.3)' },
    animate: { opacity: 1, transform: 'scale(1)' },
    className: 'bounce-in',
  },
};

/**
 * Slide animations
 */
export const slideVariants = {
  slideInLeft: {
    initial: { transform: 'translateX(-100%)' },
    animate: { transform: 'translateX(0)' },
    className: 'slide-in-left',
  },
  slideInRight: {
    initial: { transform: 'translateX(100%)' },
    animate: { transform: 'translateX(0)' },
    className: 'slide-in-right',
  },
  slideInUp: {
    initial: { transform: 'translateY(100%)' },
    animate: { transform: 'translateY(0)' },
    className: 'slide-in-up',
  },
  slideInDown: {
    initial: { transform: 'translateY(-100%)' },
    animate: { transform: 'translateY(0)' },
    className: 'slide-in-down',
  },
};

/**
 * Rotation animations
 */
export const rotateVariants = {
  rotateIn: {
    initial: { opacity: 0, transform: 'rotate(-180deg)' },
    animate: { opacity: 1, transform: 'rotate(0deg)' },
    className: 'rotate-in',
  },
  flipIn: {
    initial: { transform: 'rotateY(90deg)' },
    animate: { transform: 'rotateY(0deg)' },
    className: 'flip-in',
  },
};

// ============ STAGGER CONFIGURATIONS ============

/**
 * Generate stagger delay for child elements
 * @param {number} index - Element index
 * @param {number} baseDelay - Base delay in ms (default: 100)
 * @returns {string} - CSS delay value
 */
export const getStaggerDelay = (index, baseDelay = 100) => {
  return `${index * baseDelay}ms`;
};

/**
 * Stagger class generator
 * @param {number} index - Element index (0-based)
 * @param {number} max - Maximum stagger items (default: 6)
 * @returns {string} - Stagger class name
 */
export const getStaggerClass = (index, max = 6) => {
  const staggerNum = Math.min(index % max + 1, max);
  return `stagger-${staggerNum}`;
};

// ============ ANIMATION DURATION PRESETS ============

export const durations = {
  fastest: '150ms',
  fast: '200ms',
  normal: '300ms',
  slow: '500ms',
  slowest: '700ms',
};

// ============ EASING FUNCTIONS ============

export const easings = {
  linear: 'linear',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',

  // Custom Amazon-style easings
  smooth: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  elastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
};

// ============ ANIMATION COMBINATIONS ============

/**
 * Combine multiple animation classes
 * @param {...string} animations - Animation class names
 * @returns {string} - Combined class string
 */
export const combineAnimations = (...animations) => {
  return animations.filter(Boolean).join(' ');
};

/**
 * Get animation with stagger
 * @param {string} baseAnimation - Base animation class
 * @param {number} index - Element index
 * @returns {string} - Combined animation class
 */
export const withStagger = (baseAnimation, index) => {
  return combineAnimations(baseAnimation, getStaggerClass(index));
};

// ============ INTERSECTION OBSERVER ANIMATIONS ============

/**
 * Animate element when it enters viewport
 * @param {HTMLElement} element - Element to observe
 * @param {string} animationClass - Animation class to add
 * @param {Object} options - IntersectionObserver options
 */
export const animateOnScroll = (element, animationClass, options = {}) => {
  const defaultOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px',
    ...options,
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add(animationClass);
        // Optionally unobserve after animation
        if (options.once !== false) {
          observer.unobserve(entry.target);
        }
      }
    });
  }, defaultOptions);

  observer.observe(element);
  return observer;
};

// ============ LOADING ANIMATIONS ============

/**
 * Loading spinner configurations
 */
export const loaders = {
  spin: 'animate-spin',
  pulse: 'animate-pulse',
  bounce: 'animate-bounce',
  ping: 'animate-ping',
};

/**
 * Skeleton loading configuration
 */
export const skeleton = {
  base: 'bg-gray-200 animate-pulse rounded',
  shimmer: 'shimmer-animation',
};

// ============ HOVER EFFECTS ============

/**
 * Hover effect classes
 */
export const hoverEffects = {
  lift: 'hover-lift',
  glow: 'hover-glow',
  scale: 'hover-scale',
  rotate: 'hover-rotate',
  shadow: 'hover-shadow-lg',
  brighten: 'hover-brighten',
  dim: 'hover-dim',
};

// ============ BUTTON ANIMATIONS ============

/**
 * Button animation classes
 */
export const buttonAnimations = {
  ripple: 'btn-ripple',
  scale: 'btn-scale',
  addToCart: 'btn-add-to-cart',
  success: 'btn-success',
  error: 'btn-error',
  loading: 'btn-loading',
};

// ============ MICRO-INTERACTIONS ============

/**
 * Form input animations
 */
export const inputAnimations = {
  focus: 'input-focus-glow',
  error: 'input-error-shake',
  success: 'input-success-pulse',
  labelFloat: 'label-float',
};

/**
 * Badge animations
 */
export const badgeAnimations = {
  pulse: 'badge-pulse',
  bounce: 'badge-bounce',
  shake: 'badge-shake',
  countUp: 'badge-count-up',
};

/**
 * Icon animations
 */
export const iconAnimations = {
  spin: 'icon-spin',
  bounce: 'icon-bounce',
  shake: 'icon-shake',
  heartbeat: 'icon-heartbeat',
  checkmark: 'checkmark',
  cross: 'cross-mark',
};

// ============ MODAL/DIALOG ANIMATIONS ============

/**
 * Modal animation classes
 */
export const modalAnimations = {
  fadeIn: 'modal-fade-in',
  slideUp: 'modal-slide-up',
  slideDown: 'modal-slide-down',
  scaleIn: 'modal-scale-in',
};

/**
 * Backdrop animation
 */
export const backdropAnimation = 'modal-backdrop-fade';

// ============ TOAST/NOTIFICATION ANIMATIONS ============

/**
 * Toast animation classes
 */
export const toastAnimations = {
  slideIn: 'toast-slide-in',
  slideOut: 'toast-slide-out',
  fadeIn: 'toast-fade-in',
  fadeOut: 'toast-fade-out',
};

// ============ CARD ANIMATIONS ============

/**
 * Product card animations
 */
export const cardAnimations = {
  base: 'product-card',
  imageZoom: 'product-card-image',
  hover: 'product-card-hover',
  flip: 'card-flip',
  expand: 'card-expand',
};

// ============ TRANSITION GROUPS ============

/**
 * List transition configurations
 */
export const listTransitions = {
  fadeMove: 'list-fade-move',
  slideMove: 'list-slide-move',
  scaleMove: 'list-scale-move',
};

// ============ PAGE TRANSITIONS ============

/**
 * Page transition animations
 */
export const pageTransitions = {
  fade: 'page-fade',
  slide: 'page-slide',
  scale: 'page-scale',
};

// ============ ANIMATION UTILITIES ============

/**
 * Apply animation to element with callback
 * @param {HTMLElement} element - Element to animate
 * @param {string} animationClass - Animation class name
 * @param {Function} onComplete - Callback when animation completes
 */
export const animateElement = (element, animationClass, onComplete) => {
  element.classList.add(animationClass);

  const handleAnimationEnd = () => {
    element.removeEventListener('animationend', handleAnimationEnd);
    if (onComplete) onComplete();
  };

  element.addEventListener('animationend', handleAnimationEnd);
};

/**
 * Remove animation class after completion
 * @param {HTMLElement} element - Element with animation
 * @param {string} animationClass - Animation class to remove
 */
export const removeAnimationOnComplete = (element, animationClass) => {
  element.addEventListener('animationend', () => {
    element.classList.remove(animationClass);
  }, { once: true });
};

/**
 * Chain multiple animations
 * @param {HTMLElement} element - Element to animate
 * @param {Array<string>} animations - Array of animation classes
 * @param {number} delay - Delay between animations (ms)
 */
export const chainAnimations = async (element, animations, delay = 0) => {
  for (const animation of animations) {
    await new Promise((resolve) => {
      animateElement(element, animation, resolve);
      if (delay > 0) {
        setTimeout(resolve, delay);
      }
    });
    element.classList.remove(animation);
  }
};

/**
 * Animate counter (count up animation)
 * @param {HTMLElement} element - Element to display count
 * @param {number} target - Target number
 * @param {number} duration - Animation duration (ms)
 */
export const animateCounter = (element, target, duration = 1000) => {
  const start = 0;
  const startTime = performance.now();

  const updateCounter = (currentTime) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Ease out function
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(start + (target - start) * easeOut);

    element.textContent = current;

    if (progress < 1) {
      requestAnimationFrame(updateCounter);
    } else {
      element.textContent = target;
    }
  };

  requestAnimationFrame(updateCounter);
};

/**
 * Parallax scroll effect
 * @param {HTMLElement} element - Element to apply parallax
 * @param {number} speed - Parallax speed (0-1, slower to faster)
 */
export const parallaxScroll = (element, speed = 0.5) => {
  const updateParallax = () => {
    const scrolled = window.pageYOffset;
    const offset = scrolled * speed;
    element.style.transform = `translateY(${offset}px)`;
  };

  window.addEventListener('scroll', updateParallax, { passive: true });
  return () => window.removeEventListener('scroll', updateParallax);
};

/**
 * Reveal on scroll with IntersectionObserver
 * @param {string} selector - CSS selector for elements to animate
 * @param {string} animationClass - Animation class to add
 * @param {Object} options - Observer options
 */
export const revealOnScroll = (selector, animationClass = 'fade-in-up', options = {}) => {
  const elements = document.querySelectorAll(selector);

  elements.forEach((element, index) => {
    element.style.opacity = '0';

    // Add stagger delay
    if (options.stagger) {
      element.style.animationDelay = getStaggerDelay(index, options.staggerDelay || 100);
    }

    animateOnScroll(element, animationClass, options);
  });
};

// ============ EXPORT ALL ============

export default {
  fadeVariants,
  scaleVariants,
  slideVariants,
  rotateVariants,
  getStaggerDelay,
  getStaggerClass,
  durations,
  easings,
  combineAnimations,
  withStagger,
  animateOnScroll,
  loaders,
  skeleton,
  hoverEffects,
  buttonAnimations,
  inputAnimations,
  badgeAnimations,
  iconAnimations,
  modalAnimations,
  backdropAnimation,
  toastAnimations,
  cardAnimations,
  listTransitions,
  pageTransitions,
  animateElement,
  removeAnimationOnComplete,
  chainAnimations,
  animateCounter,
  parallaxScroll,
  revealOnScroll,
};
