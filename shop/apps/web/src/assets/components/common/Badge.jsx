import clsx from 'clsx';

const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  rounded = 'md',
  className,
  ...props
}) => {
  const variants = {
    default: 'bg-gray-100 text-neutral-700 border border-gray-200',
    primary: 'bg-primary-100 text-blue-700 border border-blue-500',
    secondary: 'bg-secondary-100 text-secondary-700 border border-secondary-300',
    success: 'bg-green-100 text-green-700',
    danger: 'bg-red-100 text-red-700',
    warning: 'bg-yellow-100 text-yellow-700',
    info: 'bg-primary-50 text-blue-700',
    // Solid variants
    primarySolid: 'bg-primary-600 text-white',
    secondarySolid: 'bg-gradient-to-r from-secondary-500 to-secondary-600 text-white',
    successSolid: 'bg-green-600 text-white',
    dangerSolid: 'bg-red-600 text-white',
    warningSolid: 'bg-yellow-600 text-white',
    infoSolid: 'bg-blue-500 text-white',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  const roundedSizes = {
    sm: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center font-semibold',
        variants[variant],
        sizes[size],
        roundedSizes[rounded],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;
