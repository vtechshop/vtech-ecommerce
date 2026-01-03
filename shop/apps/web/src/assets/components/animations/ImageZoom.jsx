// FILE: ImageZoom.jsx - Image zoom on hover effect
import React, { useState, useRef } from 'react';

const ImageZoom = ({ src, alt, className = '' }) => {
  const [isZooming, setIsZooming] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const imageRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!imageRef.current) return;

    const { left, top, width, height } = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;

    setPosition({ x, y });
  };

  const handleMouseEnter = () => {
    setIsZooming(true);
  };

  const handleMouseLeave = () => {
    setIsZooming(false);
  };

  return (
    <div
      ref={imageRef}
      className={`relative overflow-hidden cursor-crosshair ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-contain transition-transform duration-200 ${
          isZooming ? 'scale-150' : 'scale-100'
        }`}
        style={
          isZooming
            ? {
                transformOrigin: `${position.x}% ${position.y}%`,
              }
            : {}
        }
      />
      {isZooming && (
        <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded pointer-events-none">
          Hover to zoom
        </div>
      )}
    </div>
  );
};

export default ImageZoom;
