// FILE: apps/web/src/components/common/AnimatedSection.jsx
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

/**
 * Animated Section Component
 * Wraps content with scroll-triggered animations
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content to animate
 * @param {string} props.animation - Animation type: 'fade-up', 'fade-in', 'slide-left', 'slide-right', 'scale-in'
 * @param {number} props.delay - Animation delay in ms
 * @param {number} props.threshold - Intersection threshold (0-1)
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.triggerOnce - Animate only once
 */
const AnimatedSection = ({
  children,
  animation = 'fade-up',
  delay = 0,
  threshold = 0.1,
  className = '',
  triggerOnce = true,
}) => {
  const { ref, isVisible } = useScrollAnimation({ threshold, triggerOnce });

  const animationClasses = {
    'fade-up': 'animate-fade-in-up',
    'fade-in': 'animate-fade-in',
    'fade-down': 'animate-fade-in-down',
    'slide-left': 'animate-slide-in-left',
    'slide-right': 'animate-slide-in-right',
    'scale-in': 'animate-scale-in',
    'bounce-in': 'animate-bounce-in',
  };

  const baseClasses = 'transition-all duration-600';
  const visibilityClasses = isVisible
    ? `${animationClasses[animation] || animationClasses['fade-up']} opacity-100`
    : 'opacity-0 translate-y-4';

  return (
    <div
      ref={ref}
      className={`${baseClasses} ${visibilityClasses} ${className}`}
      style={{
        animationDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
};

export default AnimatedSection;
