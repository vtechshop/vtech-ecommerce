// FILE: apps/web/src/components/product/ProductCard.jsx
import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Eye, ShoppingCart } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { addToCart } from '@/store/slices/cartSlice';
import { useToast } from '@/components/common/ToastContainer';
import { formatCurrency } from '@/utils/format';
import { normalizeImageUrl } from '@/utils/placeholders';

const ProductCard = React.memo(({ product, onClick, onQuickView }) => {
  const dispatch = useDispatch();
  const toast = useToast();

  // Memoize discount calculation
  const hasDiscount = React.useMemo(() => product.compareAt && product.compareAt > product.price, [product.compareAt, product.price]);
  const discountPercent = React.useMemo(() => hasDiscount ? Math.round(((product.compareAt - product.price) / product.compareAt) * 100) : 0, [hasDiscount, product.compareAt, product.price]);


  const handleClick = useCallback((e) => {
    if (onClick) {
      onClick(e);
    }
  }, [onClick]);

  const handleAddToCart = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await dispatch(addToCart({
        productId: product._id,
        quantity: 1
      })).unwrap();
      toast.success('Added to cart!');
    } catch (error) {
      toast.error(error?.message || 'Failed to add to cart');
    }
  }, [dispatch, product._id, toast]);

  // Memoize rating rendering
  const ratingStars = React.useMemo(() => {
    if (!product.rating || product.rating <= 0) return null;
    return [...Array(5)].map((_, i) => (
      <svg
        key={i}
        className={`w-4 h-4 ${
          i < Math.floor(product.rating) ? 'text-yellow-400' : 'text-gray-300'
        }`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
  }, [product.rating]);

  return (
    <div
      className="group bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-2xl hover:border-primary-500 hover:-translate-y-3 hover:scale-102 transition-all duration-400 relative product-card transform h-full flex flex-col"
      data-testid="product-card"
      data-cy="product-card"
    >
      <Link
        to={`/product/${product.slug}`}
        onClick={handleClick}
      >
        {/* Image - Auto height to show full image */}
        <div className="relative bg-gray-50 flex-shrink-0 flex items-center justify-center min-h-[180px] sm:min-h-[200px] p-3">
          {product.images && product.images.length > 0 ? (
            <img
              src={normalizeImageUrl(product.images[0])}
              alt={product.title}
              className="max-w-full max-h-[200px] sm:max-h-[250px] w-auto h-auto object-contain group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No image
            </div>
          )}
          {hasDiscount && (
            <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded animate-bounce-in product-badge">
              -{discountPercent}%
            </div>
          )}
          {product.stock <= 0 && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <span className="bg-white text-gray-900 px-4 py-2 rounded font-semibold">
                Out of Stock
              </span>
            </div>
          )}

          {/* Quick View Button - Shows on hover */}
          {onQuickView && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onQuickView(product);
              }}
              className="absolute inset-x-0 bottom-0 bg-white/95 py-2.5 px-4 text-gray-900 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 border-t border-gray-200"
            >
              <Eye className="w-4 h-4" />
              Quick View
            </button>
          )}
        </div>
      </Link>

      {/* Content - Flex grow to fill space */}
      <Link
        to={`/product/${product.slug}`}
        onClick={handleClick}
        className="p-4 flex-grow flex flex-col"
      >
        {/* Title - Fixed height with line clamp */}
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-gray-600 transition-colors min-h-[2.5rem]">
          {product.title}
        </h3>

        {/* Rating - Fixed height slot */}
        <div className="h-6 mb-2">
          {ratingStars && (
            <div className="flex items-center gap-1">
              <div className="flex">
                {ratingStars}
              </div>
              <span className="text-xs text-gray-700">({product.reviewCount || 0})</span>
            </div>
          )}
        </div>

        {/* Tags - Fixed height slot */}
        <div className="h-6 mb-2">
          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 overflow-hidden">
              {product.tags.slice(0, 2).map((tag, index) => (
                <span
                  key={index}
                  className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded truncate max-w-[100px]"
                >
                  #{tag}
                </span>
              ))}
              {product.tags.length > 2 && (
                <span className="text-xs text-gray-500">+{product.tags.length - 2}</span>
              )}
            </div>
          )}
        </div>

        {/* Price - Push to bottom */}
        <div className="flex items-baseline gap-2 mt-auto">
          <span className="text-xl font-bold text-blue-600">
            {formatCurrency(product.price)}
          </span>
          {hasDiscount && (
            <span className="text-sm text-gray-500 line-through">
              {formatCurrency(product.compareAt)}
            </span>
          )}
        </div>
      </Link>

      {/* Add to Cart Button - Fixed at bottom */}
      <div className="px-4 pb-4 mt-auto">
        <button
          onClick={handleAddToCart}
          disabled={product.stock <= 0}
          className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          data-testid="add-to-cart-btn"
        >
          <ShoppingCart className="w-4 h-4" />
          {product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;
