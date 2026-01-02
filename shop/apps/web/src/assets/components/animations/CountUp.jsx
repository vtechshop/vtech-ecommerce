// FILE: CountUp.jsx - Animated number counter
import React, { useEffect, useState, useRef } from 'react';
import { motion, useMotionValue, useSpring, useInView } from 'framer-motion';

const CountUp = ({
  end,
  start = 0,
  duration = 2,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = ''
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const motionValue = useMotionValue(start);
  const springValue = useSpring(motionValue, {
    damping: 60,
    stiffness: 100,
    duration: duration * 1000
  });
  const [displayValue, setDisplayValue] = useState(start);

  useEffect(() => {
    if (isInView) {
      motionValue.set(end);
    }
  }, [isInView, end, motionValue]);

  useEffect(() => {
    const unsubscribe = springValue.on('change', (latest) => {
      setDisplayValue(latest.toFixed(decimals));
    });
    return () => unsubscribe();
  }, [springValue, decimals]);

  return (
    <motion.span ref={ref} className={className}>
      {prefix}
      {displayValue}
      {suffix}
    </motion.span>
  );
};

export default CountUp;
