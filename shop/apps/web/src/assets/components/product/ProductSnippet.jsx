// FILE: apps/web/src/components/product/ProductSnippet.jsx
import React, { useState, useCallback } from 'react';
import { Star, Heart, ShoppingCart, Eye, Share2, Truck, Shield, RotateCcw } from 'lucide-react';
import { formatCurrency } from '@/utils/format';

const ProductSnippet = React.memo(({ product, onAddToCart, onViewDetails, onToggleWishlist }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const handleWishlistToggle = useCallback(() => {
    setIsWishlisted(!isWishlisted);
    onToggleWishlist?.(product._id, !isWishlisted);
  }, [isWishlisted, onToggleWishlist, product._id]);

  const discountPercentage = product.compareAt
    ? Math.round(((product.compareAt - product.price) / product.compareAt) * 100)
    : 0;

  const renderStars = (rating = 4.5) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 overflow-hidden">
      {/* Product Images */}
      <div className="relative">
        <div className="aspect-square bg-gray-100 relative overflow-hidden">
          {product.images && product.images.length > 0 ? (
            <>
              <img
                src={product.images[currentImageIndex]}
                alt={product.title}
                className="w-full h-full object-cover transition-transform duration-200 hover:scale-105"
              />
              {product.images.length > 1 && (
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
                  {product.images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full ${
                        index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center mb-2">
                  <span className="text-2xl">📦</span>
                </div>
                <p className="text-sm">No Image</p>
              </div>
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.featured && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
              Featured
            </span>
          )}
          {discountPercentage > 0 && (
            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
              -{discountPercentage}%
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={handleWishlistToggle}
          className="absolute top-2 right-2 p-2 bg-white/80 hover:bg-white rounded-full shadow-sm transition-colors"
        >
          <Heart
            className={`w-4 h-4 ${
              isWishlisted ? 'text-red-500 fill-current' : 'text-gray-400'
            }`}
          />
        </button>

        {/* Quick Actions */}
        <div className="absolute inset-0 bg-black/0 hover:bg-black/5 transition-colors duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
          <div className="flex space-x-2">
            <button
              onClick={() => onViewDetails?.(product)}
              className="p-2 bg-white rounded-full shadow-sm hover:shadow-md transition-shadow"
              title="Quick View"
            >
              <Eye className="w-4 h-4 text-gray-700" />
            </button>
            <button
              className="p-2 bg-white rounded-full shadow-sm hover:shadow-md transition-shadow"
              title="Share"
            >
              <Share2 className="w-4 h-4 text-gray-700" />
            </button>
          </div>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4">
        {/* Brand */}
        {product.brand && (
          <p className="text-xs text-gray-500 mb-1">{product.brand}</p>
        )}

        {/* Title */}
        <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 hover:text-gray-600 cursor-pointer">
          {product.title}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-1 mb-2">
          <div className="flex">{renderStars(product.rating)}</div>
          <span className="text-xs text-gray-500 ml-1">
            ({product.reviewCount || Math.floor(Math.random() * 100) + 10})
          </span>
        </div>

        {/* Price */}
        <div className="mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900">
              {formatCurrency(product.price)}
            </span>
            {product.comparePrice && (
              <span className="text-sm text-gray-500 line-through">
                {formatCurrency(product.comparePrice)}
              </span>
            )}
          </div>
          {product.shipping && (
            <p className="text-xs text-green-600 mt-1">Free shipping</p>
          )}
        </div>

        {/* Stock Status */}
        <div className="mb-3">
          {product.stock > 10 ? (
            <span className="text-xs text-green-600 font-medium">In Stock</span>
          ) : product.stock > 0 ? (
            <span className="text-xs text-yellow-600 font-medium">
              Only {product.stock} left in stock
            </span>
          ) : (
            <span className="text-xs text-red-600 font-medium">Out of Stock</span>
          )}
        </div>

        {/* Key Features */}
        <div className="space-y-1 mb-4">
          {product.keyFeatures?.slice(0, 2).map((feature, index) => (
            <div key={index} className="flex items-center text-xs text-gray-700">
              <div className="w-1 h-1 bg-gray-400 rounded-full mr-2"></div>
              {feature}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onAddToCart?.(product)}
            disabled={product.stock === 0}
            className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>

        {/* Trust Signals */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Truck className="w-3 h-3" />
              <span>Free delivery</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              <span>Secure</span>
            </div>
            <div className="flex items-center gap-1">
              <RotateCcw className="w-3 h-3" />
              <span>Returns</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

ProductSnippet.displayName = 'ProductSnippet';

export default ProductSnippet;
