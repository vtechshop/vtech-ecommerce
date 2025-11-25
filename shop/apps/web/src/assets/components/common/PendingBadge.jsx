// FILE: apps/web/src/components/common/PendingBadge.jsx
import PropTypes from 'prop-types';

/**
 * Pending Badge Component
 * Displays a "PENDING" badge for items awaiting approval
 *
 * @param {string} status - Status of the item
 */
const PendingBadge = ({ status }) => {
  if (status !== 'pending') {
    return null;
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 text-xs font-bold bg-yellow-500 text-white rounded-full animate-pulse">
      PENDING
    </span>
  );
};

PendingBadge.propTypes = {
  status: PropTypes.string.isRequired,
};

export default PendingBadge;
