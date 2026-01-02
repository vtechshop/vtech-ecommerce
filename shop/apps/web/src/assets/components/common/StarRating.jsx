import { Star } from 'lucide-react';
import clsx from 'clsx';

const StarRating = ({
  rating = 0,
  maxStars = 5,
  size = 'md',
  showCount = false,
  count = 0,
  interactive = false,
  onChange,
}) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6',
  };

  const handleClick = (index) => {
    if (interactive && onChange) {
      onChange(index + 1);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <div className="star-rating flex">
        {Array.from({ length: maxStars }, (_, i) => (
          <Star
            key={i}
            className={clsx(
              'star-icon',
              sizeClasses[size],
              i < Math.floor(rating) ? 'text-yellow-400 fill-current star-fill' : 'text-gray-300',
              interactive && 'cursor-pointer hover:text-yellow-500 transition-colors'
            )}
            onClick={() => handleClick(i)}
          />
        ))}
      </div>
      {showCount && (
        <span className="text-sm text-gray-700 ml-1">
          ({count})
        </span>
      )}
    </div>
  );
};

export default StarRating;
