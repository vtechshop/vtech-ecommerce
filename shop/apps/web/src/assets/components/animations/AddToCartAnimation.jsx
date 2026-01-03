// FILE: AddToCartAnimation.jsx - Flying product animation to cart
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

const AddToCartAnimation = ({ product, startPosition, onComplete }) => {
  const [endPosition, setEndPosition] = useState(null);

  useEffect(() => {
    // Find cart icon position (assumes cart icon has id="cart-icon")
    const cartIcon = document.getElementById('cart-icon') || document.querySelector('[data-cart-icon]');
    if (cartIcon) {
      const rect = cartIcon.getBoundingClientRect();
      setEndPosition({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
    }
  }, []);

  if (!startPosition || !endPosition) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{
          x: startPosition.x,
          y: startPosition.y,
          scale: 1,
          opacity: 1,
        }}
        animate={{
          x: endPosition.x,
          y: endPosition.y,
          scale: 0.3,
          opacity: 0.7,
        }}
        exit={{
          opacity: 0,
          scale: 0,
        }}
        transition={{
          duration: 0.8,
          ease: [0.43, 0.13, 0.23, 0.96],
        }}
        onAnimationComplete={onComplete}
        className="fixed z-50 pointer-events-none"
        style={{
          width: '80px',
          height: '80px',
        }}
      >
        <div className="relative w-full h-full">
          {/* Product Image */}
          <img
            src={product?.image || product?.images?.[0]}
            alt={product?.name}
            className="w-full h-full object-contain rounded-lg shadow-2xl border-2 border-primary-600 bg-white"
          />

          {/* Plus Icon */}
          <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg">
            +1
          </div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

// Hook to trigger the animation
export const useAddToCartAnimation = () => {
  const [animation, setAnimation] = useState(null);

  const triggerAnimation = (product, element) => {
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const startPosition = {
      x: rect.left + rect.width / 2 - 40, // Center the 80px image
      y: rect.top + rect.height / 2 - 40,
    };

    setAnimation({
      product,
      startPosition,
      id: Date.now(),
    });
  };

  const clearAnimation = () => {
    setAnimation(null);
  };

  return {
    triggerAnimation,
    AnimationComponent: animation ? (
      <AddToCartAnimation
        key={animation.id}
        product={animation.product}
        startPosition={animation.startPosition}
        onComplete={clearAnimation}
      />
    ) : null,
  };
};

export default AddToCartAnimation;
