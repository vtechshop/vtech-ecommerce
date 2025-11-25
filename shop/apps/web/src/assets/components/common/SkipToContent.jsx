// FILE: apps/web/src/components/common/SkipToContent.jsx
import PropTypes from 'prop-types';

/**
 * Skip to Content Link
 * Provides accessibility for keyboard users to skip navigation
 * and jump directly to main content
 */
const SkipToContent = ({ targetId = 'main-content', label = 'Skip to main content' }) => {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      tabIndex={0}
    >
      {label}
    </a>
  );
};

SkipToContent.propTypes = {
  targetId: PropTypes.string,
  label: PropTypes.string,
};

export default SkipToContent;
