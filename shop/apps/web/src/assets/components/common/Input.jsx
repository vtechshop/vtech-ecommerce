// FILE: apps/web/src/components/common/Input.jsx
import { useState } from 'react';
import clsx from 'clsx';
import { Eye, EyeOff } from 'lucide-react';

const Input = ({
  label,
  error,
  helperText,
  required = false,
  fullWidth = false,
  className,
  type,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = type === 'password';
  const inputType = isPasswordField && showPassword ? 'text' : type;

  return (
    <div className={clsx('flex flex-col gap-1', fullWidth && 'w-full')}>
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          className={clsx(
            'px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-blue-500 transition-all duration-200 w-full input-focus',
            error ? 'border-red-500' : 'border-gray-300',
            isPasswordField && 'pr-10',
            className
          )}
          type={inputType}
          required={required}
          {...props}
        />
        {isPasswordField && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-600 focus:outline-none transition-colors"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        )}
      </div>
      {error && <span className="text-sm text-red-600">{error}</span>}
      {helperText && !error && <span className="text-sm text-gray-500">{helperText}</span>}
    </div>
  );
};

export default Input;