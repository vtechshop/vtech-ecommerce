// Amazon-style product gallery: vertical thumbnails (left) + main image with magnifier zoom (right)
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ZoomIn, Maximize2, X } from 'lucide-react';

const ZOOM_FACTOR = 2.5;
const LENS_SIZE = 180; // px
const LIGHTBOX_ZOOM = 3; // zoom level in lightbox

// Amazon-style Lightbox Viewer
const LightboxViewer = ({ images, currentIndex: initialIndex, productName, onClose, onNavigate }) => {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const imageRef = useRef(null);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setActiveIndex(i => (i - 1 + images.length) % images.length);
      if (e.key === 'ArrowRight') setActiveIndex(i => (i + 1) % images.length);
    };
    window.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [images.length, onClose]);

  // Sync back to parent
  useEffect(() => { onNavigate(activeIndex); }, [activeIndex, onNavigate]);

  const handleMouseMove = (e) => {
    if (!zoomed || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  };

  const toggleZoom = (e) => {
    e.stopPropagation();
    setZoomed(z => !z);
  };

  // Touch swipe in lightbox
  const touchX = useRef(0);

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col" onClick={onClose}>
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-900 truncate max-w-[300px]">{productName}</span>
          <span className="text-xs text-gray-500">{activeIndex + 1} / {images.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleZoom}
            className={`p-2 rounded-lg transition-colors ${zoomed ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100 text-gray-600'}`}
            title={zoomed ? 'Exit zoom' : 'Zoom in'}
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Left Thumbnails */}
        {images.length > 1 && (
          <div className="hidden md:flex flex-col gap-2 p-4 w-24 overflow-y-auto border-r border-gray-100 bg-gray-50">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => { setActiveIndex(i); setZoomed(false); }}
                className={`w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${
                  i === activeIndex ? 'border-primary-600 ring-2 ring-primary-200 shadow-md' : 'border-gray-200 hover:border-primary-400 opacity-60 hover:opacity-100'
                }`}
              >
                <img src={img} alt={`${productName} ${i + 1}`} className="w-full h-full object-contain p-1 bg-white" />
              </button>
            ))}
          </div>
        )}

        {/* Center Image */}
        <div className="flex-1 relative flex items-center justify-center bg-white p-4 overflow-hidden">
          {/* Nav arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setActiveIndex(i => (i - 1 + images.length) % images.length); setZoomed(false); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white hover:bg-gray-50 border border-gray-300 rounded-full p-3 shadow-lg z-10 transition-all hover:shadow-xl"
              >
                <ChevronLeft className="w-5 h-5 text-gray-700" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setActiveIndex(i => (i + 1) % images.length); setZoomed(false); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white hover:bg-gray-50 border border-gray-300 rounded-full p-3 shadow-lg z-10 transition-all hover:shadow-xl"
              >
                <ChevronRight className="w-5 h-5 text-gray-700" />
              </button>
            </>
          )}

          <div
            ref={imageRef}
            className={`relative max-w-full max-h-full ${zoomed ? 'cursor-zoom-out overflow-hidden' : 'cursor-zoom-in'}`}
            onClick={toggleZoom}
            onMouseMove={handleMouseMove}
            onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
              const diff = touchX.current - e.changedTouches[0].clientX;
              if (Math.abs(diff) > 50) {
                setActiveIndex(i => diff > 0 ? (i + 1) % images.length : (i - 1 + images.length) % images.length);
                setZoomed(false);
              }
            }}
          >
            <img
              src={images[activeIndex]}
              alt={`${productName} - ${activeIndex + 1}`}
              className="max-h-[calc(100vh-140px)] max-w-full object-contain transition-transform duration-200"
              style={zoomed ? {
                transform: `scale(${LIGHTBOX_ZOOM})`,
                transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
              } : {}}
              draggable={false}
            />
          </div>

          {/* Zoom hint */}
          {!zoomed && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-4 py-2 rounded-full flex items-center gap-2">
              <ZoomIn className="w-3.5 h-3.5" />
              Click image to zoom
            </div>
          )}
        </div>
      </div>

      {/* Bottom Thumbnails (Mobile) */}
      {images.length > 1 && (
        <div className="md:hidden flex gap-2 p-3 border-t border-gray-200 bg-gray-50 overflow-x-auto scrollbar-hide" onClick={e => e.stopPropagation()}>
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => { setActiveIndex(i); setZoomed(false); }}
              className={`w-14 h-14 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${
                i === activeIndex ? 'border-primary-600 ring-2 ring-primary-200' : 'border-gray-200'
              }`}
            >
              <img src={img} alt={`${productName} ${i + 1}`} className="w-full h-full object-contain p-0.5 bg-white" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ProductImageCarousel = ({ images = [], productName = '' }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [magnifierPos, setMagnifierPos] = useState({ x: 0, y: 0 });
  const [lightbox, setLightbox] = useState(false);
  const mainImageRef = useRef(null);
  const thumbContainerRef = useRef(null);

  const slideVariants = {
    enter: (dir) => ({ opacity: 0, scale: 0.95 }),
    center: { opacity: 1, scale: 1, zIndex: 1 },
    exit: (dir) => ({ opacity: 0, scale: 0.95, zIndex: 0 }),
  };

  const paginate = useCallback((newDirection) => {
    setDirection(newDirection);
    setCurrentIndex((prev) => {
      let next = prev + newDirection;
      if (next < 0) next = images.length - 1;
      if (next >= images.length) next = 0;
      return next;
    });
  }, [images.length]);

  const goToSlide = useCallback((index) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  }, [currentIndex]);

  // Magnifier: track mouse position relative to main image
  const handleMouseMove = useCallback((e) => {
    if (!mainImageRef.current) return;
    const rect = mainImageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMagnifierPos({ x, y, px: e.clientX - rect.left, py: e.clientY - rect.top });
  }, []);

  // Touch-based swipe
  const touchStartX = useRef(0);
  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) paginate(diff > 0 ? 1 : -1);
  };

  if (!images || images.length === 0) {
    return (
      <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
        <span className="text-gray-400">No image available</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-3">
        {/* Vertical Thumbnails (Desktop) */}
        {images.length > 1 && (
          <div
            ref={thumbContainerRef}
            className="hidden md:flex flex-col gap-2 w-16 flex-shrink-0 max-h-[500px] overflow-y-auto scrollbar-hide"
          >
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                onMouseEnter={() => goToSlide(index)}
                className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                  index === currentIndex
                    ? 'border-primary-600 ring-2 ring-primary-200 shadow-md'
                    : 'border-gray-200 hover:border-primary-400 opacity-70 hover:opacity-100'
                }`}
              >
                <img
                  src={image}
                  alt={`${productName} thumbnail ${index + 1}`}
                  className="w-full h-full object-contain p-1 bg-white"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}

        {/* Main Image with Magnifier */}
        <div className="flex-1 relative">
          <div
            ref={mainImageRef}
            className="relative aspect-square bg-white rounded-xl overflow-hidden border border-gray-200 group cursor-crosshair"
            onMouseEnter={() => setShowMagnifier(true)}
            onMouseLeave={() => setShowMagnifier(false)}
            onMouseMove={handleMouseMove}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.img
                key={currentIndex}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2, ease: 'easeOut' }}
                src={images[currentIndex]}
                alt={`${productName} - ${currentIndex + 1}`}
                className="w-full h-full object-contain p-4"
                draggable={false}
              />
            </AnimatePresence>

            {/* Magnifier Lens Indicator (desktop) */}
            {showMagnifier && magnifierPos.px && (
              <div
                className="hidden md:block absolute border-2 border-primary-400 bg-primary-100/30 rounded pointer-events-none z-10"
                style={{
                  width: LENS_SIZE,
                  height: LENS_SIZE,
                  left: magnifierPos.px - LENS_SIZE / 2,
                  top: magnifierPos.py - LENS_SIZE / 2,
                }}
              />
            )}

            {/* Navigation Arrows */}
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); paginate(-1); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-700" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); paginate(1); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20"
                >
                  <ChevronRight className="w-5 h-5 text-gray-700" />
                </button>
              </>
            )}

            {/* Fullscreen button */}
            <button
              onClick={(e) => { e.stopPropagation(); setLightbox(true); }}
              className="absolute top-3 right-3 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-20"
            >
              <Maximize2 className="w-4 h-4 text-gray-700" />
            </button>

            {/* Image Counter */}
            {images.length > 1 && (
              <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full font-medium">
                {currentIndex + 1} / {images.length}
              </div>
            )}
          </div>

          {/* Magnifier Preview Panel (Desktop - appears to the right) */}
          {showMagnifier && (
            <div
              className="hidden md:block absolute left-full top-0 ml-4 w-[400px] h-[400px] border border-gray-200 rounded-xl overflow-hidden shadow-2xl bg-white z-30"
              style={{
                backgroundImage: `url(${images[currentIndex]})`,
                backgroundSize: `${ZOOM_FACTOR * 100}%`,
                backgroundPosition: `${magnifierPos.x}% ${magnifierPos.y}%`,
                backgroundRepeat: 'no-repeat',
              }}
            />
          )}

          {/* Horizontal Thumbnails (Mobile) */}
          {images.length > 1 && (
            <div className="flex md:hidden gap-1.5 mt-3 overflow-x-auto pb-1 scrollbar-hide">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                    index === currentIndex
                      ? 'border-primary-600 ring-2 ring-primary-200'
                      : 'border-gray-200'
                  }`}
                >
                  <img
                    src={image}
                    alt={`${productName} thumbnail ${index + 1}`}
                    className="w-full h-full object-contain p-0.5 bg-white"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Amazon-style Fullscreen Lightbox */}
      {lightbox && createPortal(
        <LightboxViewer
          images={images}
          currentIndex={currentIndex}
          productName={productName}
          onClose={() => setLightbox(false)}
          onNavigate={goToSlide}
        />,
        document.body
      )}
    </>
  );
};

export default ProductImageCarousel;
