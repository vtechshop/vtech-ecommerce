// FILE: TestimonialSlider.jsx - Auto-rotating testimonial slider
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star, Quote } from 'lucide-react';

const TestimonialSlider = ({ testimonials = [], autoPlayInterval = 5000 }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Default testimonials if none provided
  const defaultTestimonials = [
    {
      id: 1,
      name: 'Rajesh Kumar',
      location: 'Mumbai, India',
      rating: 5,
      text: 'Amazing products and fast delivery! The quality exceeded my expectations. Will definitely order again!',
      avatar: 'https://ui-avatars.com/api/?name=Rajesh+Kumar&background=6366f1&color=fff',
    },
    {
      id: 2,
      name: 'Priya Sharma',
      location: 'Delhi, India',
      rating: 5,
      text: 'Best online shopping experience! Customer service was excellent and products arrived in perfect condition.',
      avatar: 'https://ui-avatars.com/api/?name=Priya+Sharma&background=10b981&color=fff',
    },
    {
      id: 3,
      name: 'Amit Patel',
      location: 'Bangalore, India',
      rating: 5,
      text: 'Great variety of products at competitive prices. The checkout process was smooth and hassle-free!',
      avatar: 'https://ui-avatars.com/api/?name=Amit+Patel&background=f59e0b&color=fff',
    },
  ];

  const slides = testimonials.length > 0 ? testimonials : defaultTestimonials;

  const slideVariants = {
    enter: (direction) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  };

  const paginate = (newDirection) => {
    setDirection(newDirection);
    setCurrentIndex((prevIndex) => {
      let nextIndex = prevIndex + newDirection;
      if (nextIndex < 0) nextIndex = slides.length - 1;
      if (nextIndex >= slides.length) nextIndex = 0;
      return nextIndex;
    });
  };

  // Auto-play
  useEffect(() => {
    if (isPaused || slides.length <= 1) return;

    const interval = setInterval(() => {
      paginate(1);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [currentIndex, isPaused, autoPlayInterval, slides.length]);

  if (slides.length === 0) return null;

  return (
    <div
      className="relative bg-gradient-to-br from-primary-50 to-blue-50 rounded-2xl p-8 md:p-12 overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background Quote Icon */}
      <Quote className="absolute top-4 right-4 w-32 h-32 text-primary-100 opacity-50" />

      <div className="relative z-10">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="space-y-6"
          >
            {/* Rating Stars */}
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${
                    i < slides[currentIndex].rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>

            {/* Testimonial Text */}
            <blockquote className="text-lg md:text-xl text-gray-700 leading-relaxed">
              "{slides[currentIndex].text}"
            </blockquote>

            {/* Customer Info */}
            <div className="flex items-center gap-4">
              <img
                src={slides[currentIndex].avatar}
                alt={slides[currentIndex].name}
                className="w-12 h-12 rounded-full border-2 border-white shadow-md"
              />
              <div>
                <p className="font-semibold text-gray-900">{slides[currentIndex].name}</p>
                <p className="text-sm text-gray-600">{slides[currentIndex].location}</p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
        <button
          onClick={() => paginate(-1)}
          className="p-2 rounded-full bg-white hover:bg-gray-100 shadow-md transition-colors"
          aria-label="Previous testimonial"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>

        {/* Dots Indicator */}
        <div className="flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setDirection(index > currentIndex ? 1 : -1);
                setCurrentIndex(index);
              }}
              className={`transition-all duration-300 rounded-full ${
                index === currentIndex
                  ? 'w-8 h-2 bg-primary-600'
                  : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to testimonial ${index + 1}`}
            />
          ))}
        </div>

        <button
          onClick={() => paginate(1)}
          className="p-2 rounded-full bg-white hover:bg-gray-100 shadow-md transition-colors"
          aria-label="Next testimonial"
        >
          <ChevronRight className="w-5 h-5 text-gray-700" />
        </button>
      </div>
    </div>
  );
};

export default TestimonialSlider;
