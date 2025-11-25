// FILE: apps/web/src/components/common/NotificationBadge.jsx
import PropTypes from 'prop-types';

/**
 * Notification Badge Component
 * Displays a small badge with a count (like the shopping cart badge)
 *
 * @param {number} count - Number to display in the badge
 * @param {string} variant - Color variant: 'red', 'blue', 'green', 'yellow', 'purple'
 * @param {string} className - Additional CSS classes
 * @param {number} maxCount - Maximum count to display before showing "99+"
 */
const NotificationBadge = ({
  count = 0,
  variant = 'red',
  className = '',
  maxCount = 99,
  showZero = false
}) => {
  // Don't render if count is 0 and showZero is false
  if (count === 0 && !showZero) {
    return null;
  }

  // Get color classes based on variant
  const colorClasses = {
    red: 'bg-red-500 text-white',
    blue: 'bg-blue-500 text-white',
    green: 'bg-green-500 text-white',
    yellow: 'bg-yellow-500 text-white',
    purple: 'bg-purple-500 text-white',
    orange: 'bg-orange-500 text-white',
  };

  // Format the display count
  const displayCount = count > maxCount ? `${maxCount}+` : count;

  return (
    <span
      className={`
        ${colorClasses[variant] || colorClasses.red}
        text-xs font-bold rounded-full
        min-w-[20px] h-5 px-1.5 flex items-center justify-center
        shadow-md
        ${className}
      `}
      data-testid="notification-badge"
      data-cy="notification-badge"
      data-count={count}
    >
      {displayCount}
    </span>
  );
};

NotificationBadge.propTypes = {
  count: PropTypes.number,
  variant: PropTypes.oneOf(['red', 'blue', 'green', 'yellow', 'purple', 'orange']),
  className: PropTypes.string,
  maxCount: PropTypes.number,
  showZero: PropTypes.bool,
};

export default NotificationBadge;
