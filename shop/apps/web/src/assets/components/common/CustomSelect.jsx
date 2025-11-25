// FILE: apps/web/src/components/common/CustomSelect.jsx
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

const CustomSelect = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className = '',
  disabled = false,
  error = false,
  size = 'md' // 'sm', 'md', 'lg'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const selectedOption = options.find(opt => opt.value === value);

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-5 py-3 text-base'
  };

  return (
    <div
      ref={selectRef}
      className={`relative ${className}`}
    >
      {/* Select Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full ${sizeClasses[size]} rounded-lg
          bg-white border transition-all duration-200
          text-left font-medium
          flex items-center justify-between gap-3
          ${disabled
            ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-200'
            : 'cursor-pointer hover:border-gray-400 hover:shadow-sm'
          }
          ${error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
            : isOpen
              ? 'border-blue-500 ring-4 ring-blue-500/10 shadow-sm'
              : 'border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
          }
          focus:outline-none
        `}
      >
        <span className={`flex-1 truncate ${selectedOption ? 'text-gray-900' : 'text-gray-500 font-normal'}`}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180 text-blue-600' : ''}`}
        />
      </button>

      {/* Dropdown Options */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-64 overflow-auto">
          <div className="py-1">
            {options.map((option, index) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`
                  w-full px-4 py-2.5 text-sm text-left
                  flex items-center justify-between gap-3
                  transition-colors duration-150
                  ${option.value === value
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50 font-normal'
                  }
                  ${index === 0 ? 'rounded-t-lg' : ''}
                  ${index === options.length - 1 ? 'rounded-b-lg' : ''}
                `}
              >
                <span className="flex-1 truncate">{option.label}</span>
                {option.value === value && (
                  <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
