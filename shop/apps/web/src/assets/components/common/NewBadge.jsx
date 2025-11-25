// FILE: apps/web/src/components/common/NewBadge.jsx
import PropTypes from 'prop-types';

/**
 * New Badge Component
 * Displays a "NEW" badge for items created in the last 24 hours
 *
 * @param {string|Date} createdAt - Creation timestamp
 * @param {number} hoursThreshold - Hours threshold to consider item as "new" (default: 24)
 */
const NewBadge = ({ createdAt, hoursThreshold = 24 }) => {
  const isNew = () => {
    if (!createdAt) return false;
    const now = new Date();
    const created = new Date(createdAt);
    const hoursDiff = (now - created) / (1000 * 60 * 60);
    return hoursDiff <= hoursThreshold;
  };

  if (!isNew()) {
    return null;
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 text-xs font-bold bg-blue-500 text-white rounded-full animate-pulse">
      NEW
    </span>
  );
};

NewBadge.propTypes = {
  createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]).isRequired,
  hoursThreshold: PropTypes.number,
};

export default NewBadge;
