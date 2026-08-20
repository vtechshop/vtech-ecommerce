import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { normalizeImageUrl } from '../../utils/placeholders';

const HeroCarousel = ({ items = [], fallback = null }) => {
  const [current, setCurrent] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [progressKey, setProgressKey] = useState(0);

  // Inject <link rel="preload"> for the first banner image as early as possible
  // so the browser fetches it at highest priority even before the img tag renders
  useEffect(() => {
    if (!items.length) return;
    const firstUrl = normalizeImageUrl(items[0].image || items[0].imageUrl, { width: 800, quality: 'auto', format: 'auto' });
    if (!firstUrl) return;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = firstUrl;
    link.fetchPriority = 'high';
    document.head.appendChild(link);
    return () => { try { document.head.removeChild(link); } catch {} };
  }, [items]);

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
      className="relative w-full bg-gray-100 overflow-hidden aspect-[2/1] sm:aspect-[21/8] lg:max-h-[500px]"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Slides — all absolutely positioned inside the aspect-ratio wrapper */}
      {items.map((item, index) => (
        <div
          key={item._id || index}
          className={`absolute inset-0 w-full h-full transition-opacity duration-700 ${
            index === current
              ? 'opacity-100 z-10'
              : 'opacity-0 z-0'
          }`}
          aria-hidden={index !== current}
        >
          {/* Full-slide clickable overlay — tabIndex -1 when slide is hidden */}
          {item.link && (
            <Link
              to={item.link}
              className="absolute inset-0 z-10 cursor-pointer"
              aria-label={item.title || 'View product'}
              tabIndex={index !== current ? -1 : 0}
            />
          )}

          {/* Image — height reserved by wrapper aspect-ratio.
              First slide uses <picture> to cap mobile download at 800w even on high-DPR devices,
              avoiding the ~150KB 1200w download on slow 4G (sizes="100vw" + DPR=3 picks 1200w). */}
          {(() => {
            const rawUrl = item.image || item.imageUrl;
            const src640  = normalizeImageUrl(rawUrl, { width: 640,  quality: 'auto', format: 'auto' });
            const src800  = normalizeImageUrl(rawUrl, { width: 800,  quality: 'auto', format: 'auto' });
            const src1200 = normalizeImageUrl(rawUrl, { width: 1200, quality: 'auto', format: 'auto' });
            const src1920 = normalizeImageUrl(rawUrl, { width: 1920, quality: 'auto', format: 'auto' });
            if (index === 0) {
              return (
                <picture>
                  <source media="(max-width: 767px)" srcSet={`${src640} 1x, ${src800} 2x`} />
                  <source media="(min-width: 768px)" srcSet={`${src1200} 1x, ${src1920} 2x`} />
                  <img
                    src={src1200}
                    alt={item.title || ''}
                    width={1920}
                    height={640}
                    className="w-full h-full object-cover block"
                    loading="eager"
                    fetchPriority="high"
                  />
                </picture>
              );
            }
            return (
              <img
                src={src800}
                srcSet={`${src800} 800w, ${src1200} 1200w, ${src1920} 1920w`}
                sizes="100vw"
                alt={item.title || ''}
                width={1920}
                height={640}
                className="w-full h-full object-cover block"
                loading="lazy"
                fetchPriority="auto"
              />
            );
          })()}

          {/* Gradient + text overlay (pointer-events-none so clicks pass to the link above) */}
          {(item.title || item.subtitle || item.description) && (
            <>
              <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/20 to-transparent pointer-events-none" />
              <div className="absolute inset-0 flex items-center pointer-events-none">
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


      {/* Dots */}
      {items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-1">
          {items.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goTo(idx)}
              className="p-2 flex items-center justify-center"
              aria-label={`Go to slide ${idx + 1}`}
            >
              {/* Fixed w-6 outer container keeps layout stable (no shift on active change).
                  Inner span width swaps instantly (no width transition = no non-composited paint).
                  Only opacity transitions — GPU-composited. */}
              <span className="flex items-center justify-center w-6 h-2">
                <span
                  className={`h-2 rounded-full bg-white transition-opacity duration-300 ${
                    current === idx ? 'w-6 opacity-100' : 'w-2 opacity-40'
                  }`}
                />
              </span>
            </button>
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
