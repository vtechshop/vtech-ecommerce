// FILE: apps/web/src/components/common/IconButton.jsx
import PropTypes from 'prop-types';
import { getIconButtonLabel } from '@/utils/accessibility';

/**
 * Accessible Icon Button Component
 * Wraps icon-only buttons with proper ARIA labels
 *
 * @param {object} props
 * @param {React.ReactNode} props.icon - Icon component (from lucide-react)
 * @param {string} props.label - Accessible label (if not provided, auto-generated from iconName)
 * @param {string} props.iconName - Name of icon for auto-label generation
 * @param {string} props.context - Context for auto-label (e.g., "user", "product")
 * @param {Function} props.onClick - Click handler
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.variant - Button variant: 'primary', 'secondary', 'danger', 'ghost'
 * @param {string} props.size - Button size: 'sm', 'md', 'lg'
 * @param {boolean} props.disabled - Disabled state
 * @param {string} props.title - Tooltip text (optional)
 * @param {string} props.type - Button type attribute
 */
const IconButton = ({
  icon: Icon,
  label,
  iconName,
  context,
  onClick,
  className = '',
  variant = 'ghost',
  size = 'md',
  disabled = false,
  title,
  type = 'button',
  ...rest
}) => {
  // Generate accessible label if not provided
  const ariaLabel = label || (iconName ? getIconButtonLabel(iconName, context) : 'Button');

  // Size classes
  const sizeClasses = {
    sm: 'p-1',
    md: 'p-2',
    lg: 'p-3',
  };

  // Variant classes
  const variantClasses = {
    primary: 'text-blue-600 hover:bg-primary-50 hover:text-blue-700',
    secondary: 'text-secondary-600 hover:bg-secondary-50 hover:text-secondary-700',
    danger: 'text-red-600 hover:bg-red-50 hover:text-red-700',
    success: 'text-green-600 hover:bg-green-50 hover:text-green-700',
    warning: 'text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700',
    ghost: 'text-gray-700 hover:bg-gray-100 hover:text-gray-700',
  };

  // Icon size based on button size
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className={`
        inline-flex items-center justify-center
        rounded-md transition-colors
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${className}
      `}
      aria-label={ariaLabel}
      title={title || ariaLabel}
      disabled={disabled}
      {...rest}
    >
      {Icon && <Icon className={iconSizes[size]} aria-hidden="true" />}
    </button>
  );
};

IconButton.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string,
  iconName: PropTypes.string,
  context: PropTypes.string,
  onClick: PropTypes.func,
  className: PropTypes.string,
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'success', 'warning', 'ghost']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  disabled: PropTypes.bool,
  title: PropTypes.string,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
};

export default IconButton;
