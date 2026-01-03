// FILE: QuickViewModal.jsx - Quick view product modal
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, Heart, Star, Minus, Plus, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '@/utils/format';
import ShinyButton from '@/components/animations/ShinyButton';
import ProductImageCarousel from './ProductImageCarousel';

const QuickViewModal = ({ product, isOpen, onClose, onAddToCart, onToggleWishlist }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(null);

  if (!product) return null;

  const handleAddToCart = () => {
    onAddToCart?.(product, quantity, selectedVariant);
    onClose();
  };

  const handleToggleWishlist = () => {
    onToggleWishlist?.(product);
  };

  // Calculate discount
  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  // Calculate rating
  const rating = product.rating || 0;
  const reviewCount = product.reviewCount || 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: 'spring', duration: 0.5 }}
                className="relative bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-700" />
                </button>

                {/* Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 md:p-8 overflow-y-auto max-h-[90vh]">
                  {/* Left: Image Gallery */}
                  <div className="space-y-4">
                    <ProductImageCarousel
                      images={product.images || []}
                      productName={product.name}
                    />

                    {/* Share Button */}
                    <button className="flex items-center gap-2 text-gray-600 hover:text-primary-600 transition-colors">
                      <Share2 className="w-4 h-4" />
                      <span className="text-sm">Share this product</span>
                    </button>
                  </div>

                  {/* Right: Product Details */}
                  <div className="space-y-6">
                    {/* Title & Brand */}
                    <div>
                      {product.brand && (
                        <p className="text-sm text-gray-600 mb-1">{product.brand}</p>
                      )}
                      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                        {product.name}
                      </h2>

                      {/* Rating */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < Math.floor(rating)
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-gray-600">
                          {rating.toFixed(1)} ({reviewCount} reviews)
                        </span>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-bold text-gray-900">
                        {formatCurrency(product.price)}
                      </span>
                      {hasDiscount && (
                        <>
                          <span className="text-lg text-gray-500 line-through">
                            {formatCurrency(product.compareAtPrice)}
                          </span>
                          <span className="bg-red-100 text-red-700 text-sm font-semibold px-2 py-1 rounded">
                            -{discountPercent}% OFF
                          </span>
                        </>
                      )}
                    </div>

                    {/* Description */}
                    {product.description && (
                      <div>
                        <p className="text-gray-700 leading-relaxed line-clamp-4">
                          {product.description}
                        </p>
                      </div>
                    )}

                    {/* Stock Status */}
                    <div>
                      {product.stock > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm text-green-700 font-medium">
                            In Stock ({product.stock} available)
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span className="text-sm text-red-700 font-medium">Out of Stock</span>
                        </div>
                      )}
                    </div>

                    {/* Variants */}
                    {product.variants && product.variants.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Variant
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {product.variants.map((variant, index) => (
                            <button
                              key={index}
                              onClick={() => setSelectedVariant(variant)}
                              className={`px-4 py-2 border rounded-lg transition-all ${
                                selectedVariant === variant
                                  ? 'border-primary-600 bg-primary-50 text-primary-700'
                                  : 'border-gray-300 hover:border-gray-400'
                              }`}
                            >
                              {variant.name || variant}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quantity */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center border border-gray-300 rounded-lg">
                          <button
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            className="p-2 hover:bg-gray-100 transition-colors"
                          >
                            <Minus className="w-4 h-4 text-gray-700" />
                          </button>
                          <input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-16 text-center border-0 focus:outline-none font-medium"
                          />
                          <button
                            onClick={() => setQuantity(quantity + 1)}
                            className="p-2 hover:bg-gray-100 transition-colors"
                          >
                            <Plus className="w-4 h-4 text-gray-700" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <ShinyButton
                        onClick={handleAddToCart}
                        disabled={product.stock === 0}
                        variant="primary"
                        size="lg"
                        className="flex-1 flex items-center justify-center gap-2"
                      >
                        <ShoppingCart className="w-5 h-5" />
                        Add to Cart
                      </ShinyButton>

                      <button
                        onClick={handleToggleWishlist}
                        className="p-3 border-2 border-gray-300 rounded-lg hover:border-red-500 hover:bg-red-50 transition-all group"
                      >
                        <Heart className="w-6 h-6 text-gray-600 group-hover:text-red-500 group-hover:fill-red-500 transition-all" />
                      </button>
                    </div>

                    {/* View Full Details Link */}
                    <Link
                      to={`/product/${product.slug}`}
                      onClick={onClose}
                      className="block text-center text-primary-600 hover:text-primary-700 font-medium transition-colors"
                    >
                      View Full Product Details →
                    </Link>

                    {/* Trust Badges */}
                    <div className="border-t pt-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Free shipping on orders over ₹500</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>30-day return policy</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Secure checkout</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default QuickViewModal;
