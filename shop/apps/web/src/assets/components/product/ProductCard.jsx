// FILE: apps/web/src/components/product/ProductCard.jsx
import React, { useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, ShoppingCart } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { addToCart } from '@/store/slices/cartSlice';
import { useToast } from '@/components/common/ToastContainer';
import { formatCurrency } from '@/utils/format';
import { normalizeImageUrl } from '@/utils/placeholders';

const ProductCard = React.memo(({ product, onClick, onQuickView }) => {
  const dispatch = useDispatch();
  const toast = useToast();
  const navigate = useNavigate();

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
        className={`w-3 h-3 sm:w-4 sm:h-4 ${
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
    <Link
      to={`/product/${product.slug}`}
      onClick={handleClick}
      className="group bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-xl hover:border-primary-500 transition-all duration-300 block h-full"
      data-testid="product-card"
      data-cy="product-card"
    >
      {/* Image Container */}
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        {product.images && product.images.length > 0 ? (
          <img
            src={normalizeImageUrl(product.images[0])}
            alt={product.title}
            className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
            No image
          </div>
        )}

        {/* Discount Badge */}
        {hasDiscount && (
          <div className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-red-500 text-white text-[10px] sm:text-xs font-bold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded">
            -{discountPercent}%
          </div>
        )}

        {/* Out of Stock Overlay */}
        {product.stock <= 0 && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="bg-white text-gray-900 px-2 py-1 sm:px-4 sm:py-2 rounded text-xs sm:text-sm font-semibold">
              Out of Stock
            </span>
          </div>
        )}

        {/* Quick View - Desktop only */}
        {onQuickView && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onQuickView(product);
            }}
            className="absolute inset-x-0 bottom-0 bg-white/95 py-2 px-3 text-gray-900 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden sm:flex items-center justify-center gap-2 border-t border-gray-200 text-sm"
          >
            <Eye className="w-4 h-4" />
            Quick View
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-2 sm:p-3">
        {/* Title */}
        <h3 className="font-medium text-gray-900 text-xs sm:text-sm line-clamp-2 mb-1 min-h-[2rem] sm:min-h-[2.5rem]">
          {product.title}
        </h3>

        {/* Vendor Name */}
        {product.vendorId && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigate(`/vendor/${product.vendorId.slug}`);
            }}
            className="text-xs text-gray-600 hover:text-primary-600 hover:underline block mb-1 sm:mb-2 text-left"
          >
            {product.vendorId.storeName}
          </button>
        )}

        {/* Rating - Hidden on mobile */}
        <div className="hidden sm:block h-5 mb-2">
          {ratingStars && (
            <div className="flex items-center gap-1">
              <div className="flex">{ratingStars}</div>
              <span className="text-xs text-gray-500">({product.reviewCount || 0})</span>
            </div>
          )}
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-1 sm:gap-2 flex-wrap">
          <span className="text-sm sm:text-lg font-bold text-blue-600">
            {formatCurrency(product.price)}
          </span>
          {hasDiscount && (
            <span className="text-[10px] sm:text-sm text-gray-400 line-through">
              {formatCurrency(product.compareAt)}
            </span>
          )}
        </div>
      </div>

      {/* Add to Cart - Desktop only */}
      <div className="hidden sm:block px-3 pb-3">
        <button
          onClick={handleAddToCart}
          disabled={product.stock <= 0}
          className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 text-sm"
          data-testid="add-to-cart-btn"
        >
          <ShoppingCart className="w-4 h-4" />
          {product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </Link>
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;
