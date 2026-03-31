import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { normalizeImageUrl } from '@/utils/placeholders';

const HeroCarousel = ({ items = [], fallback = null }) => {
  const [current, setCurrent] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [progressKey, setProgressKey] = useState(0);
  const navigate = useNavigate();

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

  // Auto-play
  useEffect(() => {
    if (items.length <= 1 || isHovering) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [items.length, isHovering, next]);

  if (!items || items.length === 0) return fallback;

  return (
    <div
      className="relative w-full overflow-hidden bg-white"
      style={{ aspectRatio: '1060/370', maxHeight: '370px' }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Slides */}
      {items.map((item, index) => (
        <div
          key={item._id || index}
          className={`absolute inset-0 transition-opacity duration-700 ${
            index === current ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
          aria-hidden={index !== current}
        >
          {/* Entire slide is clickable if link exists */}
          {item.link ? (
            <Link to={item.link} className="absolute inset-0 z-10" aria-label={item.title || 'View product'} />
          ) : null}

          {/* Background image */}
          <img
            src={normalizeImageUrl(item.image || item.imageUrl, { width: 1400 })}
            alt={item.title || ''}
            className="absolute inset-0 w-full h-full"
            style={{ objectFit: 'fill' }}
            loading={index === 0 ? 'eager' : 'lazy'}
            fetchPriority={index === 0 ? 'high' : 'auto'}
          />

          {/* Gradient overlay — only when there is text to display */}
          {(item.title || item.subtitle || item.description) && (
            <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/20 to-transparent" />
          )}

          {/* Text — desktop only, no Shop Now button */}
          {(item.title || item.subtitle || item.description) && (
            <div className="relative z-10 h-full flex items-center pointer-events-none">
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
          <div
            key={progressKey}
            className="h-full bg-white/70 hero-progress"
          />
        </div>
      )}
    </div>
  );
};

export default HeroCarousel;
