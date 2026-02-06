// FILE: ProductCardSkeleton.jsx - Etsy-style loading skeleton
import React from 'react';

const ProductCardSkeleton = () => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-pulse h-full">
      {/* Image skeleton - matches ProductCard aspect-square */}
      <div className="aspect-square bg-gray-200"></div>

      {/* Content skeleton - matches ProductCard padding */}
      <div className="p-3 sm:p-4 space-y-3">
        {/* Vendor name */}
        <div className="h-3 bg-gray-200 rounded w-20"></div>

        {/* Title - 2 lines */}
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>

        {/* Rating */}
        <div className="flex gap-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-3 h-3 sm:w-4 sm:h-4 bg-gray-200 rounded"></div>
          ))}
          <div className="h-3 bg-gray-200 rounded w-8 ml-1"></div>
        </div>

        {/* Price */}
        <div className="h-6 bg-gray-200 rounded w-24"></div>
      </div>

      {/* Button skeleton - desktop only, matches ProductCard */}
      <div className="px-3 sm:px-4 pb-3 sm:pb-4 hidden sm:block">
        <div className="h-10 bg-gray-200 rounded-lg w-full"></div>
      </div>
    </div>
  );
};

// Grid of skeletons - MUST match the grid in Home.jsx exactly
export const ProductGridSkeleton = ({ count = 8, className = '' }) => {
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6 ${className}`}>
      {[...Array(count)].map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
};

export default ProductCardSkeleton;
