// FILE: apps/web/src/components/common/Button.jsx
import clsx from 'clsx';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  type = 'button',
  onClick,
  className,
  id,
  name,
  value,
  'aria-label': ariaLabel,
  'data-testid': dataTestId,
  form,
  autoFocus,
  tabIndex,
  ...unsafeProps
}) => {
  // Security: Log warning if unsafe props are passed
  if (Object.keys(unsafeProps).length > 0) {
    console.warn('Button: Ignoring unsafe props:', Object.keys(unsafeProps));
  }
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed btn-scale';

  const variants = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 shadow-md hover:shadow-lg btn-add-to-cart',
    secondary: 'bg-secondary-600 text-white hover:bg-secondary-700 focus:ring-secondary-500 shadow-md hover:shadow-lg btn-add-to-cart',
    outline: 'border-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-primary-500 focus:ring-primary-500',
    'outline-light': 'border border-white/50 bg-transparent text-white hover:bg-white/20 focus:ring-white/50',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-md hover:shadow-lg',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 shadow-md hover:shadow-lg',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
    link: 'text-primary-600 hover:text-primary-700 underline-offset-4 hover:underline',
  };

  const sizes = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-1 text-xs sm:text-sm',
    md: 'px-3 py-1.5 sm:px-4 sm:py-2 text-sm',
    lg: 'px-4 py-2 sm:px-5 sm:py-2.5 text-sm sm:text-base',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      id={id}
      name={name}
      value={value}
      aria-label={ariaLabel}
      data-testid={dataTestId}
      form={form}
      autoFocus={autoFocus}
      tabIndex={tabIndex}
      className={clsx(
        baseClasses,
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
};

export default Button;