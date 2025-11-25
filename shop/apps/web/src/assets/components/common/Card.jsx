import clsx from 'clsx';

const Card = ({
  children,
  variant = 'default',
  padding = 'normal',
  hover = false,
  className,
  onClick,
  ...props
}) => {
  const baseClasses = 'bg-white rounded-lg border border-gray-200';

  const variants = {
    default: 'shadow-sm',
    elevated: 'shadow-md',
    outlined: 'border-2',
  };

  const paddings = {
    none: '',
    compact: 'p-4',
    normal: 'p-6',
    spacious: 'p-8',
  };

  const hoverEffect = hover ? 'transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer' : '';

  return (
    <div
      className={clsx(
        baseClasses,
        variants[variant],
        paddings[padding],
        hoverEffect,
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
