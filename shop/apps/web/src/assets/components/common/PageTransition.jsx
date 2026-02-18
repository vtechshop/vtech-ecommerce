// FILE: apps/web/src/components/common/PageTransition.jsx
import { motion } from 'framer-motion';

const reducedMotion = typeof window !== 'undefined'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const PageTransition = ({ children, locationKey }) => {
  if (reducedMotion) return children;

  return (
    <motion.div
      key={locationKey}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
