// FILE: apps/web/src/components/flash-sale/FlashSaleTimer.jsx
import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

const FlashSaleTimer = ({ endDate, onExpire, className = '' }) => {
  const [timeRemaining, setTimeRemaining] = useState(null);

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date();
      const end = new Date(endDate);
      const diff = end - now;

      if (diff <= 0) {
        setTimeRemaining(null);
        if (onExpire) onExpire();
        return null;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      return { days, hours, minutes, seconds, total: diff };
    };

    setTimeRemaining(calculateTime());

    const timer = setInterval(() => {
      const time = calculateTime();
      setTimeRemaining(time);
      if (!time) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [endDate, onExpire]);

  if (!timeRemaining) {
    return null;
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <Clock className="w-4 h-4 text-red-500 animate-pulse" />
      <div className="flex items-center gap-1 font-mono text-sm font-semibold">
        {timeRemaining.days > 0 && (
          <>
            <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded">
              {String(timeRemaining.days).padStart(2, '0')}d
            </span>
            <span className="text-gray-500">:</span>
          </>
        )}
        <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded">
          {String(timeRemaining.hours).padStart(2, '0')}h
        </span>
        <span className="text-gray-500">:</span>
        <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded">
          {String(timeRemaining.minutes).padStart(2, '0')}m
        </span>
        <span className="text-gray-500">:</span>
        <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded">
          {String(timeRemaining.seconds).padStart(2, '0')}s
        </span>
      </div>
    </div>
  );
};

export default FlashSaleTimer;
