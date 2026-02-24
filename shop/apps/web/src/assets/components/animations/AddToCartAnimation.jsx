// CSS-only flying animation (no framer-motion for faster initial load)
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const AddToCartAnimation = ({ product, startPosition, onComplete }) => {
  const [endPosition, setEndPosition] = useState(null);
  const elRef = useRef(null);

  useEffect(() => {
    const cartIcon = document.getElementById('cart-icon') || document.querySelector('[data-cart-icon]');
    if (cartIcon) {
      const rect = cartIcon.getBoundingClientRect();
      setEndPosition({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
    }
  }, []);

  useEffect(() => {
    if (!elRef.current || !endPosition) return;
    const el = elRef.current;
    // Trigger animation on next frame
    requestAnimationFrame(() => {
      el.style.transform = `translate(${endPosition.x - startPosition.x}px, ${endPosition.y - startPosition.y}px) scale(0.3)`;
      el.style.opacity = '0';
    });
    const timer = setTimeout(onComplete, 800);
    return () => clearTimeout(timer);
  }, [endPosition, startPosition, onComplete]);

  if (!startPosition || !endPosition) return null;

  return createPortal(
    <div
      ref={elRef}
      className="fixed z-50 pointer-events-none"
      style={{
        left: startPosition.x,
        top: startPosition.y,
        width: '80px',
        height: '80px',
        transform: 'translate(0, 0) scale(1)',
        opacity: 1,
        transition: 'transform 0.8s cubic-bezier(0.43, 0.13, 0.23, 0.96), opacity 0.8s cubic-bezier(0.43, 0.13, 0.23, 0.96)',
        willChange: 'transform, opacity',
      }}
    >
      <div className="relative w-full h-full">
        <img
          src={product?.image || product?.images?.[0]}
          alt={product?.name}
          className="w-full h-full object-contain rounded-lg shadow-2xl border-2 border-primary-600 bg-white"
        />
        <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg">
          +1
        </div>
      </div>
    </div>,
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
      x: rect.left + rect.width / 2 - 40,
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
