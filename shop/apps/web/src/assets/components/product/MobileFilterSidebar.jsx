// FILE: MobileFilterSidebar.jsx - Mobile filter sidebar with slide-in animation
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, SlidersHorizontal } from 'lucide-react';
import { createPortal } from 'react-dom';

const MobileFilterSidebar = ({
  isOpen,
  onClose,
  filters = {},
  onFilterChange,
  children
}) => {
  const sidebarVariants = {
    hidden: {
      x: '-100%',
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
      },
    },
    visible: {
      x: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
      },
    },
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-40"
          />

          {/* Sidebar */}
          <motion.div
            variants={sidebarVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="fixed top-0 left-0 bottom-0 w-80 bg-white shadow-2xl z-50 overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-primary-600" />
                <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close filters"
              >
                <X className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            {/* Filter Content */}
            <div className="p-6">
              {children}
            </div>

            {/* Footer - Apply/Clear Buttons */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Apply Filters
              </button>
              <button
                onClick={() => {
                  if (onFilterChange) {
                    onFilterChange({});
                  }
                }}
                className="px-4 py-3 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-medium rounded-lg transition-colors"
              >
                Clear
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

// Example filter section components
export const FilterSection = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className="border-b border-gray-200 pb-6 mb-6 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between mb-4 text-left"
      >
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          {title}
        </h3>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const CheckboxFilter = ({ label, checked, onChange }) => {
  return (
    <label className="flex items-center gap-3 py-2 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
      />
      <span className="text-sm text-gray-700 group-hover:text-gray-900">
        {label}
      </span>
    </label>
  );
};

export const RangeFilter = ({ min, max, value, onChange, label, formatValue }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">
          {formatValue ? formatValue(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={onChange}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
      />
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{formatValue ? formatValue(min) : min}</span>
        <span>{formatValue ? formatValue(max) : max}</span>
      </div>
    </div>
  );
};

export const ColorFilter = ({ colors = [], selectedColor, onChange }) => {
  return (
    <div className="flex flex-wrap gap-3">
      {colors.map((color) => (
        <button
          key={color.name}
          onClick={() => onChange(color.value)}
          className={`w-10 h-10 rounded-full border-2 transition-all ${
            selectedColor === color.value
              ? 'border-primary-600 ring-2 ring-primary-200 scale-110'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          style={{ backgroundColor: color.value }}
          title={color.name}
          aria-label={color.name}
        />
      ))}
    </div>
  );
};

export default MobileFilterSidebar;
