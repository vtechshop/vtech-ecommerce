// CSS-only animated div (no framer-motion dependency for faster initial load)
import { useRef, useEffect, useState } from 'react';

const animationPresets = {
  fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
  fadeInDown: { from: { opacity: 0, transform: 'translateY(-20px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
  fadeInUp: { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
  slideLeft: { from: { opacity: 0, transform: 'translateX(-30px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
  slideRight: { from: { opacity: 0, transform: 'translateX(30px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
  slideUp: { from: { opacity: 0, transform: 'translateY(30px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
  scale: { from: { opacity: 0, transform: 'scale(0.8)' }, to: { opacity: 1, transform: 'scale(1)' } },
  scaleUp: { from: { transform: 'scale(0)' }, to: { transform: 'scale(1)' } },
};

const AnimatedDiv = ({
  children,
  animation = 'fadeIn',
  delay = 0,
  duration = 0.5,
  className = '',
  ...props
}) => {
  const [mounted, setMounted] = useState(false);
  const ref = useRef(null);
  const preset = animationPresets[animation] || animationPresets.fadeIn;

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), delay * 1000);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...(!mounted ? preset.from : preset.to),
        transition: `opacity ${duration}s cubic-bezier(0.4, 0, 0.2, 1), transform ${duration}s cubic-bezier(0.4, 0, 0.2, 1)`,
        willChange: mounted ? 'auto' : 'opacity, transform',
      }}
      {...props}
    >
      {children}
    </div>
  );
};

export default AnimatedDiv;
