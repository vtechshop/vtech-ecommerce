import React, { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import useMobile from '@/hooks/useMobile';

const ThreeDCarousel = ({
  items = [],
  autoRotate = true,
  rotateInterval = 4000,
  cardHeight = 560,
}) => {
  const [active, setActive] = useState(0);
  const carouselRef = useRef(null);
  const [isInView, setIsInView] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const isMobile = useMobile();
  const minSwipeDistance = 50;

  // Auto-rotate when in view and not hovering
  useEffect(() => {
    if (autoRotate && isInView && !isHovering && items.length > 1) {
      const interval = setInterval(() => {
        setActive((prev) => (prev + 1) % items.length);
      }, rotateInterval);
      return () => clearInterval(interval);
    }
  }, [isInView, isHovering, autoRotate, rotateInterval, items.length]);

  // Intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0.2 }
    );

    if (carouselRef.current) {
      observer.observe(carouselRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const onTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
    setTouchEnd(null);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) {
      setActive((prev) => (prev + 1) % items.length);
    } else if (distance < -minSwipeDistance) {
      setActive((prev) => (prev - 1 + items.length) % items.length);
    }
  };

  const getCardAnimationClass = (index) => {
    if (index === active) return 'scale-100 opacity-100 z-20';
    if (index === (active + 1) % items.length)
      return 'translate-x-[40%] scale-95 opacity-60 z-10';
    if (index === (active - 1 + items.length) % items.length)
      return 'translate-x-[-40%] scale-95 opacity-60 z-10';
    return 'scale-90 opacity-0';
  };

  if (!items || items.length === 0) return null;

  return (
    <section
      id="ThreeDCarousel"
      className="bg-transparent w-full flex items-center justify-center py-8"
    >
      <div className="w-full px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div
          className="relative overflow-hidden h-[620px]"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          ref={carouselRef}
        >
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
            {items.map((item, index) => (
              <div
                key={item.id}
                className={`absolute top-0 w-full max-w-md transform transition-all duration-500 ${getCardAnimationClass(
                  index
                )}`}
              >
                <div
                  className="overflow-hidden bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md flex flex-col"
                  style={{ height: `${cardHeight}px` }}
                >
                  {/* Image Header */}
                  <div
                    className="relative p-6 flex items-center justify-center h-72 overflow-hidden"
                    style={{
                      backgroundImage: `url(${item.imageUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    <div className="absolute inset-0 bg-black/50" />
                    <div className="relative z-10 text-center text-white">
                      <h3 className="text-2xl font-bold mb-2">
                        {item.brand?.toUpperCase() || item.title?.toUpperCase()}
                      </h3>
                      <div className="w-12 h-1 bg-white mx-auto mb-2" />
                      <p className="text-sm">{item.title}</p>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-6 flex flex-col flex-grow">
                    <h3 className="text-xl font-bold mb-1 text-gray-900">
                      {item.title}
                    </h3>
                    <p className="text-gray-500 text-sm font-medium mb-2">
                      {item.brand}
                    </p>
                    <p className="text-gray-600 text-sm flex-grow line-clamp-3">
                      {item.description}
                    </p>

                    <div className="mt-4">
                      {/* Tags */}
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {item.tags.slice(0, 3).map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Link */}
                      <Link
                        to={item.link}
                        className="text-primary-600 flex items-center hover:underline relative group"
                      >
                        <span className="relative z-10">Learn more</span>
                        <ArrowRight className="ml-2 w-4 h-4 relative z-10 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Arrows - Desktop only */}
          {!isMobile && items.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center text-gray-500 hover:bg-white z-30 shadow-md transition-all hover:scale-110"
                onClick={() =>
                  setActive((prev) => (prev - 1 + items.length) % items.length)
                }
                aria-label="Previous"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center text-gray-500 hover:bg-white z-30 shadow-md transition-all hover:scale-110"
                onClick={() => setActive((prev) => (prev + 1) % items.length)}
                aria-label="Next"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Dots Indicator */}
          {items.length > 1 && (
            <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center space-x-3 z-30">
              {items.map((_, idx) => (
                <button
                  key={idx}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    active === idx
                      ? 'bg-primary-600 w-5'
                      : 'bg-gray-300 w-2 hover:bg-gray-400'
                  }`}
                  onClick={() => setActive(idx)}
                  aria-label={`Go to item ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ThreeDCarousel;
