// FILE: apps/web/src/components/product/SocialProof.jsx
import { useState, useEffect } from 'react';
import { Eye, TrendingUp, Clock, Package } from 'lucide-react';

/**
 * Social Proof Indicators Component
 * Shows genuine trust signals like stock urgency and sales metrics
 */
const SocialProof = ({ product }) => {
  if (!product) return null;

  const stockPercentage = (product.stock / (product.stock + product.soldCount || 100)) * 100;
  const isLowStock = product.stock > 0 && product.stock <= product.lowStockThreshold;
  const isVeryLowStock = product.stock > 0 && product.stock <= 5;

  return (
    <div className="space-y-3">
      {/* Stock Urgency */}
      {isVeryLowStock && (
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-2 bg-gradient-to-r from-red-50 to-red-100 text-red-900 px-4 py-2.5 rounded-xl border-2 border-red-300 shadow-lg animate-pulse">
            <div className="bg-red-500 p-1.5 rounded-lg">
              <Package className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold">⚠️ Only {product.stock} left</span>
            <span className="text-red-800 font-medium">in stock!</span>
          </div>
        </div>
      )}

      {isLowStock && !isVeryLowStock && (
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-2 bg-gradient-to-r from-primary-50 to-primary-100 text-primary-900 px-4 py-2.5 rounded-xl border-2 border-blue-500 shadow-md hover:shadow-lg transition-all">
            <div className="bg-primary-600 p-1.5 rounded-lg">
              <Package className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold">{product.stock} left</span>
            <span className="text-primary-800 font-medium">in stock</span>
          </div>
        </div>
      )}

      {/* High Demand Indicator */}
      {product.soldCount > 50 && (
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-2 bg-gradient-to-r from-dark-50 to-gray-100 text-dark-900 px-4 py-2.5 rounded-xl border-2 border-dark-200 shadow-md hover:shadow-lg transition-all">
            <div className="bg-gray-900 p-1.5 rounded-lg">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold">🔥 High demand</span>
            <span className="text-dark-800 font-medium">- {product.soldCount}+ sold</span>
          </div>
        </div>
      )}

      {/* Fast Selling */}
      {stockPercentage < 30 && product.stock > 5 && (
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-2 bg-gradient-to-r from-primary-100 to-primary-200 text-primary-900 px-4 py-2.5 rounded-xl border-2 border-blue-500 shadow-md hover:shadow-lg transition-all">
            <div className="bg-blue-500 p-1.5 rounded-lg">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold">⚡ Selling fast</span>
            <span className="text-primary-800 font-medium">- {Math.round(stockPercentage)}% remaining</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialProof;
