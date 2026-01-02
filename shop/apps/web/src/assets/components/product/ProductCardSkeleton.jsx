// FILE: ProductCardSkeleton.jsx - Etsy-style loading skeleton
import React from 'react';

const ProductCardSkeleton = () => {
  return (
    <div className="etsy-skeleton-card animate-pulse">
      {/* Image skeleton */}
      <div className="etsy-skeleton-image"></div>

      {/* Content skeleton */}
      <div className="space-y-3">
        {/* Vendor name */}
        <div className="etsy-skeleton-text etsy-skeleton-text-short"></div>

        {/* Title */}
        <div className="etsy-skeleton-text"></div>
        <div className="etsy-skeleton-text etsy-skeleton-text-short"></div>

        {/* Rating */}
        <div className="flex gap-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-4 h-4 bg-gray-200 rounded"></div>
          ))}
        </div>

        {/* Price */}
        <div className="etsy-skeleton-text w-24 h-6"></div>

        {/* Button */}
        <div className="etsy-skeleton-text h-10"></div>
      </div>
    </div>
  );
};

// Grid of skeletons
export const ProductGridSkeleton = ({ count = 8 }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {[...Array(count)].map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
};

export default ProductCardSkeleton;
