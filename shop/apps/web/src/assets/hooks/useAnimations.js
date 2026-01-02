// FILE: apps/web/src/assets/hooks/useAnimations.js
/**
 * Custom React Hooks for Animations
 * Easy-to-use hooks for common animation patterns
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { animateOnScroll, animateCounter, getStaggerClass } from '@/utils/animations';

/**
 * Hook to animate element on mount
 * @param {string} animationClass - Animation class to apply
 * @param {number} delay - Delay before animation starts (ms)
 * @returns {Object} - Ref to attach to element
 */
export const useAnimateOnMount = (animationClass = 'fade-in', delay = 0) => {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      const timeout = setTimeout(() => {
        ref.current?.classList.add(animationClass);
      }, delay);

      return () => clearTimeout(timeout);
    }
  }, [animationClass, delay]);

  return ref;
};

/**
 * Hook to animate element when it enters viewport
 * @param {string} animationClass - Animation class to apply
 * @param {Object} options - IntersectionObserver options
 * @returns {Object} - Ref to attach to element
 */
export const useAnimateOnScroll = (animationClass = 'fade-in-up', options = {}) => {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      const observer = animateOnScroll(ref.current, animationClass, {
        threshold: 0.1,
        once: true,
        ...options,
      });

      return () => observer.disconnect();
    }
  }, [animationClass, options]);

  return ref;
};

/**
 * Hook for staggered list animations
 * @param {number} count - Number of items
 * @param {string} baseClass - Base animation class
 * @returns {Function} - Function to get class for index
 */
export const useStaggerAnimation = (count, baseClass = 'fade-in') => {
  const getAnimationClass = useCallback(
    (index) => {
      const staggerClass = getStaggerClass(index, Math.min(count, 6));
      return `${baseClass} ${staggerClass}`;
    },
    [count, baseClass]
  );

  return getAnimationClass;
};

/**
 * Hook for counter animation
 * @param {number} target - Target number
 * @param {number} duration - Animation duration (ms)
 * @param {boolean} trigger - When to trigger animation
 * @returns {Object} - Ref and current count
 */
export const useCounterAnimation = (target, duration = 1000, trigger = true) => {
  const ref = useRef(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (trigger && ref.current) {
      animateCounter(ref.current, target, duration);
    }
  }, [target, duration, trigger]);

  return { ref, count };
};

/**
 * Hook for hover animations
 * @returns {Object} - Hover state and handlers
 */
export const useHoverAnimation = () => {
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  return {
    isHovered,
    hoverProps: {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    },
  };
};

/**
 * Hook for toggle animations (expand/collapse)
 * @param {boolean} initialState - Initial expanded state
 * @returns {Object} - State and toggle function
 */
export const useToggleAnimation = (initialState = false) => {
  const [isExpanded, setIsExpanded] = useState(initialState);
  const [animationClass, setAnimationClass] = useState('');

  const toggle = useCallback(() => {
    setIsExpanded((prev) => {
      const newState = !prev;
      setAnimationClass(newState ? 'expand-animation' : 'collapse-animation');
      return newState;
    });
  }, []);

  return { isExpanded, toggle, animationClass };
};

/**
 * Hook for ripple effect on click
 * @returns {Object} - Ref and click handler
 */
export const useRippleEffect = () => {
  const ref = useRef(null);

  const createRipple = useCallback((event) => {
    const button = ref.current;
    if (!button) return;

    const circle = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;

    const rect = button.getBoundingClientRect();
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - rect.left - radius}px`;
    circle.style.top = `${event.clientY - rect.top - radius}px`;
    circle.classList.add('ripple');

    const ripple = button.getElementsByClassName('ripple')[0];
    if (ripple) {
      ripple.remove();
    }

    button.appendChild(circle);

    setTimeout(() => circle.remove(), 600);
  }, []);

  return { ref, onClick: createRipple };
};

/**
 * Hook for page transition animation
 * @param {string} animationClass - Animation class
 * @returns {boolean} - Animation state
 */
export const usePageTransition = (animationClass = 'page-fade') => {
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    // Add animation class on mount
    document.body.classList.add(animationClass);

    // Remove after animation completes
    const timeout = setTimeout(() => {
      setIsAnimating(false);
      document.body.classList.remove(animationClass);
    }, 300);

    return () => {
      clearTimeout(timeout);
      document.body.classList.remove(animationClass);
    };
  }, [animationClass]);

  return isAnimating;
};

/**
 * Hook for scroll-triggered animations
 * @param {number} threshold - Scroll threshold (px)
 * @returns {boolean} - Whether threshold is passed
 */
export const useScrollAnimation = (threshold = 100) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > threshold);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Check initial state

    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return isScrolled;
};

/**
 * Hook for infinite scroll animation
 * @param {Function} loadMore - Function to call when reaching bottom
 * @param {boolean} hasMore - Whether more items exist
 * @returns {Object} - Ref to attach to scroll container
 */
export const useInfiniteScroll = (loadMore, hasMore = true) => {
  const ref = useRef(null);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetching) {
          setIsFetching(true);
          loadMore().finally(() => setIsFetching(false));
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [loadMore, hasMore, isFetching]);

  return { ref, isFetching };
};

/**
 * Hook for skeleton loading animation
 * @param {boolean} isLoading - Loading state
 * @param {number} delay - Delay before showing skeleton (ms)
 * @returns {boolean} - Whether to show skeleton
 */
export const useSkeletonLoading = (isLoading, delay = 200) => {
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => setShowSkeleton(true), delay);
      return () => clearTimeout(timeout);
    } else {
      setShowSkeleton(false);
    }
  }, [isLoading, delay]);

  return showSkeleton;
};

/**
 * Hook for element entrance animation with delay
 * @param {number} delay - Delay in ms
 * @param {string} animationClass - Animation class
 * @returns {Object} - Ref and visibility state
 */
export const useDelayedEntrance = (delay = 300, animationClass = 'fade-in') => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsVisible(true);
      ref.current?.classList.add(animationClass);
    }, delay);

    return () => clearTimeout(timeout);
  }, [delay, animationClass]);

  return { ref, isVisible };
};

/**
 * Hook for parallax scrolling
 * @param {number} speed - Parallax speed (0-1)
 * @returns {Object} - Ref and parallax style
 */
export const useParallax = (speed = 0.5) => {
  const ref = useRef(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (ref.current) {
        const scrolled = window.pageYOffset;
        const rect = ref.current.getBoundingClientRect();
        const elementTop = rect.top + scrolled;
        const offset = (scrolled - elementTop) * speed;
        setOffset(offset);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return {
    ref,
    style: { transform: `translateY(${offset}px)` },
  };
};

/**
 * Hook for image lazy loading with fade-in
 * @returns {Object} - Props for image element
 */
export const useLazyImage = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const ref = useRef(null);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    ref.current?.classList.add('fade-in');
  }, []);

  return {
    ref,
    isLoaded,
    imageProps: {
      onLoad: handleLoad,
      loading: 'lazy',
      style: { opacity: isLoaded ? 1 : 0, transition: 'opacity 0.3s' },
    },
  };
};

// Export all hooks
export default {
  useAnimateOnMount,
  useAnimateOnScroll,
  useStaggerAnimation,
  useCounterAnimation,
  useHoverAnimation,
  useToggleAnimation,
  useRippleEffect,
  usePageTransition,
  useScrollAnimation,
  useInfiniteScroll,
  useSkeletonLoading,
  useDelayedEntrance,
  useParallax,
  useLazyImage,
};
