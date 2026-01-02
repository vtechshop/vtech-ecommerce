// FILE: apps/web/src/assets/components/animations/AnimatedWrapper.jsx
/**
 * Reusable Animated Component Wrappers
 * Easy-to-use components for adding animations to any element
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  useAnimateOnMount,
  useAnimateOnScroll,
  useStaggerAnimation,
  useHoverAnimation,
} from '@/hooks/useAnimations';

/**
 * FadeIn Component
 * Fades in element on mount or when it enters viewport
 */
export const FadeIn = ({
  children,
  delay = 0,
  direction = 'up',
  onScroll = false,
  className = '',
  ...props
}) => {
  const animationClass = direction
    ? `fade-in-${direction}`
    : 'fade-in';

  const ref = onScroll
    ? useAnimateOnScroll(animationClass)
    : useAnimateOnMount(animationClass, delay);

  return (
    <div ref={ref} className={className} {...props}>
      {children}
    </div>
  );
};

FadeIn.propTypes = {
  children: PropTypes.node.isRequired,
  delay: PropTypes.number,
  direction: PropTypes.oneOf(['up', 'down', 'left', 'right', null]),
  onScroll: PropTypes.bool,
  className: PropTypes.string,
};

/**
 * SlideIn Component
 * Slides in element from specified direction
 */
export const SlideIn = ({
  children,
  direction = 'left',
  delay = 0,
  className = '',
  ...props
}) => {
  const animationClass = `slide-in-${direction}`;
  const ref = useAnimateOnMount(animationClass, delay);

  return (
    <div ref={ref} className={className} {...props}>
      {children}
    </div>
  );
};

SlideIn.propTypes = {
  children: PropTypes.node.isRequired,
  direction: PropTypes.oneOf(['left', 'right', 'up', 'down']),
  delay: PropTypes.number,
  className: PropTypes.string,
};

/**
 * ScaleIn Component
 * Scales in element with optional bounce
 */
export const ScaleIn = ({
  children,
  bounce = false,
  delay = 0,
  className = '',
  ...props
}) => {
  const animationClass = bounce ? 'bounce-in' : 'scale-in';
  const ref = useAnimateOnMount(animationClass, delay);

  return (
    <div ref={ref} className={className} {...props}>
      {children}
    </div>
  );
};

ScaleIn.propTypes = {
  children: PropTypes.node.isRequired,
  bounce: PropTypes.bool,
  delay: PropTypes.number,
  className: PropTypes.string,
};

/**
 * Stagger Component
 * Staggered animation for list items
 */
export const Stagger = ({
  children,
  animation = 'fade-in',
  staggerDelay = 100,
  className = '',
  ...props
}) => {
  const items = React.Children.toArray(children);

  return (
    <div className={className} {...props}>
      {items.map((child, index) => (
        <div
          key={index}
          className={`${animation} stagger-${Math.min(index + 1, 6)}`}
          style={{ animationDelay: `${index * staggerDelay}ms` }}
        >
          {child}
        </div>
      ))}
    </div>
  );
};

Stagger.propTypes = {
  children: PropTypes.node.isRequired,
  animation: PropTypes.string,
  staggerDelay: PropTypes.number,
  className: PropTypes.string,
};

/**
 * HoverLift Component
 * Lifts element on hover with shadow
 */
export const HoverLift = ({
  children,
  className = '',
  liftAmount = '4px',
  ...props
}) => {
  const { isHovered, hoverProps } = useHoverAnimation();

  return (
    <div
      className={`hover-lift transition-all duration-300 ${className}`}
      style={{
        transform: isHovered ? `translateY(-${liftAmount})` : 'translateY(0)',
      }}
      {...hoverProps}
      {...props}
    >
      {children}
    </div>
  );
};

HoverLift.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  liftAmount: PropTypes.string,
};

/**
 * HoverScale Component
 * Scales element on hover
 */
export const HoverScale = ({
  children,
  scale = 1.05,
  className = '',
  ...props
}) => {
  const { isHovered, hoverProps } = useHoverAnimation();

  return (
    <div
      className={`transition-transform duration-300 ${className}`}
      style={{
        transform: isHovered ? `scale(${scale})` : 'scale(1)',
      }}
      {...hoverProps}
      {...props}
    >
      {children}
    </div>
  );
};

HoverScale.propTypes = {
  children: PropTypes.node.isRequired,
  scale: PropTypes.number,
  className: PropTypes.string,
};

/**
 * RevealOnScroll Component
 * Reveals element when it enters viewport
 */
export const RevealOnScroll = ({
  children,
  animation = 'fade-in-up',
  threshold = 0.1,
  className = '',
  ...props
}) => {
  const ref = useAnimateOnScroll(animation, { threshold });

  return (
    <div ref={ref} className={`scroll-reveal ${className}`} {...props}>
      {children}
    </div>
  );
};

RevealOnScroll.propTypes = {
  children: PropTypes.node.isRequired,
  animation: PropTypes.string,
  threshold: PropTypes.number,
  className: PropTypes.string,
};

/**
 * PulseOnUpdate Component
 * Pulses when content changes
 */
export const PulseOnUpdate = ({
  children,
  value,
  className = '',
  ...props
}) => {
  const [isPulsing, setIsPulsing] = React.useState(false);

  React.useEffect(() => {
    setIsPulsing(true);
    const timeout = setTimeout(() => setIsPulsing(false), 300);
    return () => clearTimeout(timeout);
  }, [value]);

  return (
    <div
      className={`transition-all ${isPulsing ? 'scale-110' : 'scale-100'} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

PulseOnUpdate.propTypes = {
  children: PropTypes.node.isRequired,
  value: PropTypes.any.isRequired,
  className: PropTypes.string,
};

/**
 * CountUp Component
 * Animated counter
 */
export const CountUp = ({
  value,
  duration = 1000,
  className = '',
  prefix = '',
  suffix = '',
  ...props
}) => {
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    const startTime = performance.now();
    const startValue = displayValue;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(startValue + (value - startValue) * easeOut);

      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return (
    <span className={className} {...props}>
      {prefix}{displayValue}{suffix}
    </span>
  );
};

CountUp.propTypes = {
  value: PropTypes.number.isRequired,
  duration: PropTypes.number,
  className: PropTypes.string,
  prefix: PropTypes.string,
  suffix: PropTypes.string,
};

/**
 * Skeleton Component
 * Loading skeleton with shimmer effect
 */
export const Skeleton = ({
  width = '100%',
  height = '20px',
  className = '',
  variant = 'rectangular',
  ...props
}) => {
  const variantClasses = {
    rectangular: 'rounded',
    circular: 'rounded-full',
    text: 'rounded h-4',
  };

  return (
    <div
      className={`bg-gray-200 animate-pulse shimmer-animation ${variantClasses[variant]} ${className}`}
      style={{ width, height }}
      {...props}
    />
  );
};

Skeleton.propTypes = {
  width: PropTypes.string,
  height: PropTypes.string,
  className: PropTypes.string,
  variant: PropTypes.oneOf(['rectangular', 'circular', 'text']),
};

/**
 * ProgressBar Component
 * Animated progress bar
 */
export const ProgressBar = ({
  value = 0,
  max = 100,
  className = '',
  color = 'bg-blue-600',
  showLabel = false,
  ...props
}) => {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className={`w-full bg-gray-200 rounded-full h-2.5 overflow-hidden ${className}`} {...props}>
      <div
        className={`h-full ${color} transition-all duration-500 ease-out`}
        style={{ width: `${percentage}%` }}
      >
        {showLabel && (
          <span className="text-xs text-white px-2">{Math.round(percentage)}%</span>
        )}
      </div>
    </div>
  );
};

ProgressBar.propTypes = {
  value: PropTypes.number,
  max: PropTypes.number,
  className: PropTypes.string,
  color: PropTypes.string,
  showLabel: PropTypes.bool,
};

// Export all components
export default {
  FadeIn,
  SlideIn,
  ScaleIn,
  Stagger,
  HoverLift,
  HoverScale,
  RevealOnScroll,
  PulseOnUpdate,
  CountUp,
  Skeleton,
  ProgressBar,
};
