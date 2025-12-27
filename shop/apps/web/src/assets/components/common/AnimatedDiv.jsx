import { motion } from 'framer-motion';

/**
 * Reusable animated div component with common animation presets
 *
 * @param {string} animation - Animation type: fadeIn, slideUp, slideLeft, slideRight, scale, stagger
 * @param {number} delay - Animation delay in seconds
 * @param {number} duration - Animation duration in seconds
 * @param {ReactNode} children - Child components
 */
const AnimatedDiv = ({
  children,
  animation = 'fadeIn',
  delay = 0,
  duration = 0.5,
  className = '',
  ...props
}) => {
  const animations = {
    fadeIn: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
    fadeInDown: {
      initial: { opacity: 0, y: -20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 },
    },
    fadeInUp: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 20 },
    },
    slideLeft: {
      initial: { opacity: 0, x: -30 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -30 },
    },
    slideRight: {
      initial: { opacity: 0, x: 30 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: 30 },
    },
    slideUp: {
      initial: { opacity: 0, y: 30 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 30 },
    },
    scale: {
      initial: { opacity: 0, scale: 0.8 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.8 },
    },
    scaleUp: {
      initial: { scale: 0 },
      animate: { scale: 1 },
      exit: { scale: 0 },
    },
  };

  const selectedAnimation = animations[animation] || animations.fadeIn;

  return (
    <motion.div
      initial={selectedAnimation.initial}
      animate={selectedAnimation.animate}
      exit={selectedAnimation.exit}
      transition={{
        duration,
        delay,
        ease: [0.4, 0, 0.2, 1], // Custom cubic-bezier easing
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedDiv;
