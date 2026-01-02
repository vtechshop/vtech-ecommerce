// FILE: FloatingParticles.jsx - Subtle background animation
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

const FloatingParticles = ({ count = 20, color = 'primary' }) => {
  const colors = {
    primary: 'bg-primary-500/10',
    gray: 'bg-gray-300/10',
    blue: 'bg-blue-500/10',
    purple: 'bg-purple-500/10'
  };

  const particles = useMemo(() => {
    return [...Array(count)].map((_, i) => ({
      id: i,
      size: Math.random() * 60 + 20,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 20 + 10,
      delay: Math.random() * 5
    }));
  }, [count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className={`absolute rounded-full blur-xl ${colors[color]}`}
          style={{
            width: particle.size,
            height: particle.size,
            left: `${particle.x}%`,
            top: `${particle.y}%`
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, 15, -15, 0],
            scale: [1, 1.1, 0.9, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
      ))}
    </div>
  );
};

export default FloatingParticles;
