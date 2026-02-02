import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const slides = [
  {
    id: 1,
    title: 'Premium Kitchen Essentials',
    subtitle: 'Upgrade your kitchen with top-quality products from trusted brands',
    cta: 'Shop Now',
    ctaLink: '/search',
    bg: 'from-primary-700 via-primary-600 to-blue-500',
    accent: 'bg-white text-primary-700',
  },
  {
    id: 2,
    title: 'Fresh Arrivals This Week',
    subtitle: 'Discover the latest kitchen gadgets, cookware, and appliances',
    cta: 'Explore New',
    ctaLink: '/products?sort=-createdAt',
    bg: 'from-purple-700 via-secondary-600 to-pink-500',
    accent: 'bg-white text-purple-700',
  },
  {
    id: 3,
    title: 'Best Sellers Collection',
    subtitle: 'Shop what everyone is buying — top-rated products at unbeatable prices',
    cta: 'View Best Sellers',
    ctaLink: '/products?sort=-sold',
    bg: 'from-blue-800 via-blue-600 to-cyan-500',
    accent: 'bg-white text-blue-800',
  },
  {
    id: 4,
    title: 'Sell on V-Tech Kitchen',
    subtitle: 'Join our marketplace and reach thousands of customers. Start your business today!',
    cta: 'Become a Vendor',
    ctaLink: '/register?role=vendor',
    bg: 'from-emerald-700 via-emerald-600 to-teal-500',
    accent: 'bg-white text-emerald-700',
  },
];

const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
    scale: 0.95,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    zIndex: 1,
  },
  exit: (direction) => ({
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0,
    scale: 0.95,
    zIndex: 0,
  }),
};

const swipeConfidenceThreshold = 10000;
const swipePower = (offset, velocity) => Math.abs(offset) * velocity;

const HeroCarousel = () => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const paginate = useCallback((newDirection) => {
    setDirection(newDirection);
    setCurrent((prev) => {
      let next = prev + newDirection;
      if (next < 0) next = slides.length - 1;
      if (next >= slides.length) next = 0;
      return next;
    });
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => paginate(1), 5000);
    return () => clearInterval(timer);
  }, [current, isPaused, paginate]);

  const slide = slides[current];

  return (
    <div
      className="relative w-full overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={current}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: 'spring', stiffness: 200, damping: 30 },
            opacity: { duration: 0.3 },
            scale: { duration: 0.3 },
          }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={1}
          onDragEnd={(e, { offset, velocity }) => {
            const swipe = swipePower(offset.x, velocity.x);
            if (swipe < -swipeConfidenceThreshold) paginate(1);
            else if (swipe > swipeConfidenceThreshold) paginate(-1);
          }}
          className={`bg-gradient-to-r ${slide.bg} w-full`}
        >
          <div className="container mx-auto px-4 sm:px-6 py-16 sm:py-20 md:py-28 max-w-screen-2xl relative">
            {/* Decorative circles */}
            <div className="absolute top-10 right-10 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-white/5 rounded-full blur-2xl" />

            <div className="max-w-2xl relative z-10">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-4 leading-tight"
              >
                {slide.title}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-base sm:text-lg md:text-xl text-white/90 mb-8 leading-relaxed"
              >
                {slide.subtitle}
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.5 }}
              >
                <Link
                  to={slide.ctaLink}
                  className={`inline-block ${slide.accent} px-8 py-3 rounded-full font-bold text-base sm:text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300`}
                >
                  {slide.cta}
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Arrows */}
      <button
        onClick={() => paginate(-1)}
        className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white p-2 sm:p-3 rounded-full transition-all duration-200"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>
      <button
        onClick={() => paginate(1)}
        className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white p-2 sm:p-3 rounded-full transition-all duration-200"
        aria-label="Next slide"
      >
        <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setDirection(i > current ? 1 : -1);
              setCurrent(i);
            }}
            className={`rounded-full transition-all duration-300 ${
              i === current
                ? 'w-8 h-2.5 bg-white'
                : 'w-2.5 h-2.5 bg-white/50 hover:bg-white/70'
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroCarousel;
