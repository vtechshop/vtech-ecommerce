// FILE: apps/web/src/components/product/QuickView.jsx
import { useState, useEffect } from 'react';
import { X, Star, Heart, ShoppingCart, Plus, Minus, Check } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { addToCart } from '@/store/slices/cartSlice';
import { useToast } from '@/components/common/ToastContainer';
import { formatCurrency } from '@/utils/format';
import api from '@/utils/api';

const QuickView = ({ product, isOpen, onClose }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState({});
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  // Reset state when modal opens with new product
  useEffect(() => {
    if (isOpen && product) {
      setSelectedImage(0);
      setQuantity(1);
      setSelectedVariants({});
      setAddedToCart(false);
    }
  }, [isOpen, product]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const toggleWishlistMutation = useMutation({
    mutationFn: async (productId) => {
      await api.post(`/user/wishlist/toggle/${productId}`);
    },
    onSuccess: () => {
      setIsWishlisted(!isWishlisted);
      toast.success(isWishlisted ? 'Removed from wishlist' : 'Added to wishlist');
    },
    onError: (error) => {
      if (error.response?.status === 401) {
        toast.error('Please log in to add items to your wishlist');
      } else {
        toast.error(error.response?.data?.error?.message || 'Failed to update wishlist');
      }
    },
  });

  if (!isOpen || !product) return null;

  const discountPercentage = product.comparePrice
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
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

  const handleAddToCart = async () => {
    // Prevent multiple rapid clicks
    if (addedToCart) return;

    // Allow guests to add to cart (stored locally)
    const variantId = Object.keys(selectedVariants).length > 0
      ? JSON.stringify(selectedVariants)
      : undefined;

    try {
      setAddedToCart(true);
      await dispatch(addToCart({
        productId: product._id,
        quantity,
        variantId,
      })).unwrap();

      // Show message - same for all users (3 seconds)
      toast.success('Added to cart!', 3000);

      // Reset after 2 seconds
      setTimeout(() => setAddedToCart(false), 2000);
    } catch (error) {
      console.error('Add to cart error:', error);
      toast.error(error.message || 'Failed to add to cart');
      setAddedToCart(false);
    }
  };

  const handleWishlistToggle = () => {
    if (!isAuthenticated) {
      toast.error('Please log in to add items to your wishlist');
      onClose();
      navigate('/login', { state: { from: `/product/${product.slug}` } });
      return;
    }
    toggleWishlistMutation.mutate(product._id);
  };

  const handleViewFullDetails = () => {
    navigate(`/product/${product.slug}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors shadow-lg"
        >
          <X className="w-6 h-6 text-gray-700" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8">
          {/* Left: Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
              {product.images && product.images.length > 0 ? (
                <img
                  src={product.images[selectedImage]}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <span className="text-6xl">📦</span>
                </div>
              )}
            </div>

            {/* Thumbnail Images */}
            {product.images && product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      index === selectedImage
                        ? 'border-blue-500 scale-105 shadow-md'
                        : 'border-gray-200 hover:border-blue-400'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.title} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Details */}
          <div className="space-y-6">
            {/* Brand */}
            {product.brand && (
              <p className="text-sm text-gray-600">{product.brand}</p>
            )}

            {/* Title */}
            <h2 className="text-2xl font-bold text-gray-900">
              {product.title}
            </h2>

            {/* Rating */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {renderStars(product.rating)}
              </div>
              <span className="text-sm text-gray-600">
                {product.rating} ({product.reviewCount || 0} reviews)
              </span>
            </div>

            {/* Price */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-gray-900">
                  {formatCurrency(product.price)}
                </span>
                {product.comparePrice && (
                  <span className="text-lg text-gray-500 line-through">
                    {formatCurrency(product.comparePrice)}
                  </span>
                )}
                {discountPercentage > 0 && (
                  <span className="bg-red-100 text-red-800 text-sm font-semibold px-2 py-1 rounded">
                    Save {discountPercentage}%
                  </span>
                )}
              </div>
            </div>

            {/* Stock Status */}
            <div>
              {product.stock > 10 ? (
                <p className="text-green-600 font-medium flex items-center gap-1">
                  <Check className="w-4 h-4" /> In Stock
                </p>
              ) : product.stock > 0 ? (
                <p className="text-yellow-600 font-medium">
                  ⚠ Only {product.stock} left!
                </p>
              ) : (
                <p className="text-red-600 font-medium">✗ Out of Stock</p>
              )}
            </div>

            {/* Description - Truncated */}
            {product.description && (
              <div>
                <p className="text-gray-700 text-sm line-clamp-3">
                  {product.description}
                </p>
              </div>
            )}

            {/* Variants */}
            {product.variants && Object.keys(product.variants).length > 0 && (
              <div className="space-y-3">
                {Object.entries(product.variants).map(([key, options]) => (
                  <div key={key}>
                    <h3 className="text-sm font-medium text-gray-900 mb-2 capitalize">
                      {key}:
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {options.map((option) => (
                        <button
                          key={option}
                          onClick={() => setSelectedVariants({ ...selectedVariants, [key]: option })}
                          className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                            selectedVariants[key] === option
                              ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                              : 'border-gray-300 text-gray-700 hover:border-gray-400'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quantity */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-900">Quantity:</label>
              <div className="flex items-center border border-gray-300 rounded-lg">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 hover:bg-gray-100 transition-colors"
                  disabled={quantity <= 1}
                >
                  <Minus className="w-4 h-4 text-gray-700" />
                </button>
                <span className="px-4 py-2 border-x border-gray-300 text-gray-900 font-medium">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="p-2 hover:bg-gray-100 transition-colors"
                  disabled={quantity >= product.stock}
                >
                  <Plus className="w-4 h-4 text-gray-700" />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <div className="flex gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={product.stock === 0 || addedToCart}
                  className={`flex-1 font-medium py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2 ${
                    addedToCart
                      ? 'bg-green-600 text-white'
                      : 'bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white'
                  }`}
                >
                  {addedToCart ? (
                    <>
                      <Check className="w-5 h-5" />
                      Added
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5" />
                      Add to Cart
                    </>
                  )}
                </button>

                <button
                  onClick={handleWishlistToggle}
                  className={`p-3 rounded-lg border transition-colors ${
                    isWishlisted
                      ? 'border-red-500 bg-red-50 text-red-500'
                      : 'border-gray-300 hover:border-red-500 hover:text-red-500 text-gray-600'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
                </button>
              </div>

              <button
                onClick={handleViewFullDetails}
                className="w-full border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 text-gray-700 hover:text-blue-700 font-medium py-3 px-6 rounded-lg transition-all"
              >
                View Full Details
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickView;
