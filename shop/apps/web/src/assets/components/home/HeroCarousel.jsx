import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { normalizeImageUrl } from '@/utils/placeholders';

const HeroCarousel = ({ items = [], fallback = null }) => {
  const [current, setCurrent] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [progressKey, setProgressKey] = useState(0);

  const next = useCallback(() => {
    setCurrent(prev => (prev + 1) % items.length);
    setProgressKey(k => k + 1);
  }, [items.length]);

  const prev = useCallback(() => {
    setCurrent(prev => (prev - 1 + items.length) % items.length);
    setProgressKey(k => k + 1);
  }, [items.length]);

  const goTo = useCallback((idx) => {
    setCurrent(idx);
    setProgressKey(k => k + 1);
  }, []);

  useEffect(() => {
    if (items.length <= 1 || isHovering) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [items.length, isHovering, next]);

  if (!items || items.length === 0) return fallback;

  return (
    <div
      className="relative w-full bg-white overflow-hidden"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Slides — current is relative (defines height), others are absolute */}
      {items.map((item, index) => (
        <div
          key={item._id || index}
          className={`w-full transition-opacity duration-700 ${
            index === current
              ? 'relative opacity-100 z-10'
              : 'absolute inset-0 opacity-0 z-0'
          }`}
          aria-hidden={index !== current}
        >
          {/* Clickable link over entire slide */}
          {item.link && (
            <Link to={item.link} className="absolute inset-0 z-10" aria-label={item.title || 'View product'} />
          )}

          {/* Image — natural width/height, no cropping */}
          <img
            src={item.image || item.imageUrl}
            alt={item.title || ''}
            className="w-full h-auto block"
            loading={index === 0 ? 'eager' : 'lazy'}
            fetchPriority={index === 0 ? 'high' : 'auto'}
          />

          {/* Gradient + text only when title/subtitle exists */}
          {(item.title || item.subtitle || item.description) && (
            <>
              <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/20 to-transparent" />
              <div className="absolute inset-0 z-10 flex items-center pointer-events-none">
                <div className="container mx-auto px-6 sm:px-10 md:px-16 max-w-screen-2xl">
                  <div className="max-w-lg">
                    {item.title && (
                      <h2 className="hidden sm:block text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 leading-tight">
                        {item.title}
                      </h2>
                    )}
                    {(item.subtitle || item.description) && (
                      <p className="hidden sm:block text-white/80 text-sm md:text-base line-clamp-2 leading-relaxed">
                        {item.subtitle || item.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      ))}

      {/* Arrow buttons */}
      {items.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 bg-black/25 backdrop-blur-sm hover:bg-black/45 rounded-full flex items-center justify-center text-white transition-all"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 bg-black/25 backdrop-blur-sm hover:bg-black/45 rounded-full flex items-center justify-center text-white transition-all"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Dots */}
      {items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {items.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goTo(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                current === idx ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}

      {/* Progress bar */}
      {items.length > 1 && !isHovering && (
        <div className="absolute bottom-0 left-0 right-0 z-20 h-0.5 bg-white/20">
          <div key={progressKey} className="h-full bg-white/70 hero-progress" />
        </div>
      )}
    </div>
  );
};

export default HeroCarousel;
