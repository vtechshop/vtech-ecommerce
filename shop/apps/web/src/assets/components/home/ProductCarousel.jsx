import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';

const ProductCarousel = ({ title, icon, products = [], viewAllLink, viewAllText = 'View All' }) => {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [products]);

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector(':first-child')?.offsetWidth || 250;
    const scrollAmount = cardWidth * 2 + 24; // 2 cards + gap
    el.scrollBy({ left: dir * scrollAmount, behavior: 'smooth' });
  };

  if (!products || products.length === 0) return null;

  return (
    <section className="mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {icon && <span className="text-primary-600">{icon}</span>}
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">{title}</h2>
        </div>
        <div className="flex items-center gap-3">
          {/* Desktop arrows */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => scroll(-1)}
              disabled={!canScrollLeft}
              className="p-2 rounded-full border border-gray-300 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scroll(1)}
              disabled={!canScrollRight}
              className="p-2 rounded-full border border-gray-300 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          {viewAllLink && (
            <a href={viewAllLink} className="text-primary-600 hover:text-primary-700 font-semibold text-sm whitespace-nowrap">
              {viewAllText} &rarr;
            </a>
          )}
        </div>
      </div>

      {/* Scrollable product row */}
      <div className="relative group">
        {/* Left fade + arrow (mobile) */}
        {canScrollLeft && (
          <button
            onClick={() => scroll(-1)}
            className="sm:hidden absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 shadow-lg p-2 rounded-full"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scroll-smooth scrollbar-hide pb-2"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {products.map((product) => (
            <div
              key={product._id}
              className="flex-shrink-0 w-[48%] sm:w-[31%] md:w-[23.5%] lg:w-[19%] xl:w-[19%]"
              style={{ scrollSnapAlign: 'start' }}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        {/* Right fade + arrow (mobile) */}
        {canScrollRight && (
          <button
            onClick={() => scroll(1)}
            className="sm:hidden absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 shadow-lg p-2 rounded-full"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </section>
  );
};

export default ProductCarousel;
