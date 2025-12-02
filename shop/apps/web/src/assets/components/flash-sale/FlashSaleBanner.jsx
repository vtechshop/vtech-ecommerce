// FILE: apps/web/src/components/flash-sale/FlashSaleBanner.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Zap, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import { normalizeImageUrl } from '@/utils/placeholders';

const FlashSaleBanner = ({ sale }) => {
  const [timeRemaining, setTimeRemaining] = useState(sale.timeRemaining);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!sale.timeRemaining || sale.timeRemaining.total <= 0) {
        clearInterval(timer);
        return;
      }

      const now = new Date();
      const end = new Date(sale.endDate);
      const diff = end - now;

      if (diff <= 0) {
        setTimeRemaining(null);
        clearInterval(timer);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining({ days, hours, minutes, seconds, total: diff });
    }, 1000);

    return () => clearInterval(timer);
  }, [sale.endDate, sale.timeRemaining]);

  if (!timeRemaining || timeRemaining.total <= 0) {
    return null;
  }

  const backgroundColor = sale.banner?.backgroundColor || '#FF6B6B';
  const textColor = sale.banner?.textColor || '#FFFFFF';

  return (
    <div
      className="relative overflow-hidden rounded-2xl shadow-xl mb-8"
      style={{ backgroundColor }}
    >
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-shimmer"></div>
      </div>

      <div className="relative px-6 py-8 md:px-12 md:py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left: Sale Info */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
              <Zap className="w-6 h-6 animate-pulse" style={{ color: textColor }} />
              <span
                className="text-sm font-bold uppercase tracking-wider"
                style={{ color: textColor }}
              >
                Flash Sale
              </span>
            </div>

            <h2
              className="text-3xl md:text-4xl font-bold mb-2"
              style={{ color: textColor }}
            >
              {sale.title}
            </h2>

            {sale.description && (
              <p
                className="text-lg opacity-90 mb-4"
                style={{ color: textColor }}
              >
                {sale.description}
              </p>
            )}

            {/* Product count and savings */}
            <div className="flex items-center justify-center md:justify-start gap-4 text-sm">
              <div className="flex items-center gap-1" style={{ color: textColor }}>
                <TrendingUp className="w-4 h-4" />
                <span>{sale.products.length} Products</span>
              </div>
              <div className="px-3 py-1 bg-white/20 rounded-full backdrop-blur-sm">
                <span style={{ color: textColor }}>Up to 70% OFF</span>
              </div>
            </div>
          </div>

          {/* Right: Countdown Timer */}
          <div className="flex-shrink-0">
            <div className="flex items-center gap-2 mb-3 justify-center">
              <Clock className="w-5 h-5" style={{ color: textColor }} />
              <span className="text-sm font-semibold" style={{ color: textColor }}>
                Ends In
              </span>
            </div>

            <div className="flex gap-2">
              {timeRemaining.days > 0 && (
                <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg px-3 py-2 min-w-[60px] text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {String(timeRemaining.days).padStart(2, '0')}
                  </div>
                  <div className="text-xs text-gray-700 dark:text-gray-400">Days</div>
                </div>
              )}
              <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg px-3 py-2 min-w-[60px] text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {String(timeRemaining.hours).padStart(2, '0')}
                </div>
                <div className="text-xs text-gray-700 dark:text-gray-400">Hours</div>
              </div>
              <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg px-3 py-2 min-w-[60px] text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {String(timeRemaining.minutes).padStart(2, '0')}
                </div>
                <div className="text-xs text-gray-700 dark:text-gray-400">Mins</div>
              </div>
              <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg px-3 py-2 min-w-[60px] text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {String(timeRemaining.seconds).padStart(2, '0')}
                </div>
                <div className="text-xs text-gray-700 dark:text-gray-400">Secs</div>
              </div>
            </div>
          </div>
        </div>

        {/* Featured Products Preview */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {sale.products.slice(0, 6).map((item) => (
            <Link
              key={item._id}
              to={`/product/${item.productId.slug}`}
              className="group bg-white dark:bg-gray-900 rounded-lg p-3 hover:scale-105 transition-transform"
            >
              <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden mb-2">
                {item.productId.images && item.productId.images[0] ? (
                  <img
                    src={normalizeImageUrl(item.productId.images[0])}
                    alt={item.productId.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <span className="text-3xl">📦</span>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-900 dark:text-gray-100 font-medium line-clamp-1">
                  {item.productId.title}
                </p>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(item.flashPrice)}
                  </span>
                  <span className="text-xs text-gray-500 line-through">
                    {formatCurrency(item.originalPrice)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* View All Button */}
        <div className="mt-6 text-center">
          <Link
            to={`/flash-sale/${sale._id}`}
            className="inline-block px-8 py-3 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-bold rounded-lg hover:scale-105 transition-transform shadow-lg"
          >
            View All Deals →
          </Link>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 3s infinite;
        }
      `}</style>
    </div>
  );
};

export default FlashSaleBanner;
