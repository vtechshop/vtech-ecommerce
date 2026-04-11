// FILE: apps/web/src/components/product/ProductCard.jsx
import React, { useCallback, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, ShoppingCart } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { addToCart } from '@/store/slices/cartSlice';
import { formatCurrency } from '@/utils/format';
import { normalizeImageUrl, getResponsiveImageUrls } from '@/utils/placeholders';
import { useAddToCartAnimation } from '@/components/animations/AddToCartAnimation';
import { playAddToCart, playError } from '@/utils/sounds';

const ProductCard = React.memo(({ product, onClick, onQuickView }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const addToCartButtonRef = useRef(null);
  const cardRef = useRef(null);
  const { triggerAnimation, AnimationComponent } = useAddToCartAnimation();

  // 3D tilt effect on hover (desktop only, uses refs for performance)
  const handleMouseMove = useCallback((e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotateX = (0.5 - y) * 8;
    const rotateY = (x - 0.5) * 8;
    card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
  }, []);

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = '';
  }, []);

  // Memoize discount calculation
  const hasDiscount = React.useMemo(() => product.compareAt && product.compareAt > product.price, [product.compareAt, product.price]);
  const discountPercent = React.useMemo(() => hasDiscount ? Math.round(((product.compareAt - product.price) / product.compareAt) * 100) : 0, [hasDiscount, product.compareAt, product.price]);

  const handleClick = useCallback((e) => {
    if (onClick) onClick(e);
  }, [onClick]);

  const handleAddToCart = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await dispatch(addToCart({
        productId: product._id,
        quantity: 1
      })).unwrap();

      // Trigger flying animation
      if (addToCartButtonRef.current) {
        triggerAnimation(product, addToCartButtonRef.current);
      }

      playAddToCart();
    } catch (error) {
      playError();
    }
  }, [dispatch, product._id, product, triggerAnimation]);

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

  // Second image for hover (if available)
  const hasSecondImage = product.images && product.images.length > 1;

  return (
    <>
    <Link
      ref={cardRef}
      to={`/product/${product.slug}`}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full group hover:shadow-xl"
      style={{ transition: 'transform 0.15s ease-out, box-shadow 0.3s ease', willChange: 'transform' }}
      data-testid="product-card"
      data-cy="product-card"
    >
      {/* Image Container */}
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        {product.images && product.images.length > 0 ? (
          (() => {
            const { src, srcSet, sizes } = getResponsiveImageUrls(product.images[0]);
            return (
              <>
                <img
                  src={src}
                  srcSet={srcSet}
                  sizes={sizes || '(max-width: 480px) 160px, (max-width: 768px) 200px, 300px'}
                  alt={product.seo?.title || product.title}
                  width={150}
                  height={150}
                  loading="lazy"
                  decoding="async"
                  className={`w-full h-full object-contain p-3 transition-all duration-500 ${hasSecondImage ? 'group-hover:opacity-0' : 'group-hover:scale-105'}`}
                />
                {/* Second image on hover */}
                {hasSecondImage && (() => {
                  const img2 = getResponsiveImageUrls(product.images[1]);
                  return (
                    <img
                      src={img2.src}
                      srcSet={img2.srcSet}
                      sizes={img2.sizes || '(max-width: 480px) 160px, (max-width: 768px) 200px, 300px'}
                      alt={product.title}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-contain p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    />
                  );
                })()}
              </>
            );
          })()
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
            No image
          </div>
        )}

        {/* Discount Badge */}
        {hasDiscount && (
          <div className="absolute top-2 right-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md">
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
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent py-3 px-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onQuickView(product);
              }}
              className="w-full bg-white text-gray-900 font-semibold py-2 px-4 rounded-lg hidden sm:flex items-center justify-center gap-2 text-sm shadow-lg hover:bg-gray-50 transition-colors"
            >
              <Eye className="w-4 h-4" />
              Quick View
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col">
        {/* Vendor Name */}
        {product.vendorId && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigate(`/vendor/${product.vendorId.slug}`);
            }}
            className="text-xs text-gray-500 hover:text-primary-600 transition-colors block mb-2 text-left font-medium"
          >
            {product.vendorId.storeName}
          </button>
        )}

        {/* Title — fixed 2-line height so all cards align consistently */}
        <h3 className="font-semibold text-gray-900 text-sm sm:text-base line-clamp-2 mb-2 leading-snug group-hover:text-primary-600 transition-colors min-h-[2.5rem] sm:min-h-[3rem]">
          {product.title}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-1 mb-3">
          {ratingStars && (
            <>
              <div className="flex gap-0.5">{ratingStars}</div>
              <span className="text-xs text-gray-500 ml-1">({product.reviewCount || 0})</span>
            </>
          )}
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-3 mt-auto">
          <span className={`text-lg sm:text-xl font-bold ${hasDiscount ? 'text-green-700' : 'text-gray-900'}`}>
            {formatCurrency(product.price)}
          </span>
          {hasDiscount && (
            <span className="text-sm text-red-500 line-through">
              {formatCurrency(product.compareAt)}
            </span>
          )}
        </div>
      </div>

      {/* Add to Cart - Desktop only with loading state */}
      <div className="px-3 sm:px-4 pb-3 sm:pb-4 hidden sm:block">
        <button
          ref={addToCartButtonRef}
          onClick={handleAddToCart}
          disabled={product.stock <= 0}
          className="w-full font-bold py-2.5 px-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 text-sm shadow-md bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white active:scale-95"
          data-testid="add-to-cart-btn"
        >
          <ShoppingCart className="w-4 h-4" />
          {product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </Link>
    {AnimationComponent}
    </>
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;
