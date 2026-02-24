// CSS-only page transition (no framer-motion dependency for faster initial load)
import { useRef, useEffect, useState } from 'react';

const reducedMotion = typeof window !== 'undefined'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const PageTransition = ({ children, locationKey }) => {
  const [animate, setAnimate] = useState(false);
  const prevKey = useRef(locationKey);

  useEffect(() => {
    if (prevKey.current !== locationKey) {
      prevKey.current = locationKey;
      setAnimate(false);
      // Trigger reflow then animate
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimate(true));
      });
    } else {
      setAnimate(true);
    }
  }, [locationKey]);

  if (reducedMotion) return children;

  return (
    <div
      style={{
        opacity: animate ? 1 : 0,
        transform: animate ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 0.2s ease-out, transform 0.2s ease-out',
      }}
    >
      {children}
    </div>
  );
};

export default PageTransition;
