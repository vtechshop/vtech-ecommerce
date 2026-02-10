// FILE: apps/web/src/pages/Product.jsx
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart } from '@/store/slices/cartSlice';
import { useToast } from '@/components/common/ToastContainer';
import api from '@/utils/api';
import { Star, Heart, ShoppingCart, Truck, Shield, RotateCcw, Share2, Minus, Plus, Check, ChevronLeft, ChevronRight, Edit2, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import { normalizeImageUrl } from '@/utils/placeholders';
import { addToRecentlyViewed } from '@/utils/recentlyViewed';
import { captureAffiliateFromURL } from '@/utils/affiliateTracking';
import RecentlyViewed from '@/components/product/RecentlyViewed';
import SocialProof from '@/components/product/SocialProof';
import ProductRecommendations from '@/components/product/ProductRecommendations';
import ProductImageCarousel from '@/components/product/ProductImageCarousel';
import ReviewForm from '@/components/product/ReviewForm';
import EditReviewModal from '@/components/product/EditReviewModal';
import AdBanner from '@/components/common/AdBanner';
import AnimatedDiv from '@/components/common/AnimatedDiv';
import { useStaggerAnimation, useHoverAnimation } from '@/hooks/useAnimations';
import SEO from '@/components/common/SEO';
import { playWishlistAdd, playAddToCart, playError } from '@/utils/sounds';

// Customer Reviews Carousel Component
const CustomerReviewsCarousel = ({ reviews, renderStars, onEdit, onDelete, currentUser }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextReview = () => {
    setCurrentIndex((prev) => (prev + 1) % reviews.length);
  };

  const prevReview = () => {
    setCurrentIndex((prev) => (prev - 1 + reviews.length) % reviews.length);
  };

  const review = reviews[currentIndex];
  const isOwnReview = currentUser && review.userId?._id === currentUser._id;

  return (
    <div className="bg-gradient-to-br from-white to-primary-50 rounded-xl border-2 border-primary-200 shadow-lg overflow-hidden flex flex-col" style={{height: '400px'}}>
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-4 py-2 relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <h3 className="text-lg font-bold text-white flex items-center gap-2 relative z-10">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          Customer Reviews
        </h3>
        <p className="text-white text-xs font-medium mt-0.5 relative z-10">{reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'}</p>
      </div>

      <div className="flex-1 p-4 flex flex-col overflow-hidden">
        {/* Review Content */}
        <div className="flex-1 mb-3 overflow-hidden">
          <div className="bg-gradient-to-r from-primary-50 to-primary-100 p-3 rounded-lg border-2 border-blue-500 shadow-sm h-full flex flex-col">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="flex">{renderStars(review.rating)}</div>
              <span className="text-sm font-bold text-gray-900">
                {review.rating}/5
              </span>
            </div>

            <div className="flex items-start justify-between mb-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-bold text-gray-900">
                  {review.userId?.name || 'Anonymous'}
                </span>
                <span className="text-xs text-gray-700 bg-white px-1.5 py-0.5 rounded-full border border-gray-300">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
                {review.verified && (
                  <span className="px-1.5 py-0.5 bg-green-100 text-green-800 text-xs font-semibold rounded-full border border-green-300">
                    ✓ Verified
                  </span>
                )}
              </div>

              {/* Edit/Delete buttons for own review */}
              {isOwnReview && (
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => onEdit && onEdit(review)}
                    className="text-blue-600 hover:text-blue-800 p-1.5 hover:bg-blue-50 rounded transition-colors"
                    title="Edit review"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete && onDelete(review._id)}
                    className="text-red-600 hover:text-red-800 p-1.5 hover:bg-red-50 rounded transition-colors"
                    title="Delete review"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              <p className="text-xs text-gray-900 leading-relaxed">{review.comment}</p>

              {/* Vendor/Admin Response */}
              {review.vendorResponse?.text && (
                <div className="mt-2 pl-2 border-l-3 border-primary-500 bg-primary-50 p-2 rounded">
                  <p className="text-xs font-bold text-primary-900 mb-0.5">📢 Seller Response:</p>
                  <p className="text-xs text-primary-800 leading-relaxed">{review.vendorResponse.text}</p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    {new Date(review.vendorResponse.respondedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={prevReview}
            className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded text-xs font-semibold hover:from-primary-600 hover:to-primary-700 transition-all shadow-sm hover:shadow-md"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Previous
          </button>

          <div className="flex gap-1.5">
            {reviews.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  index === currentIndex
                    ? 'bg-blue-500 w-5'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>

          <button
            onClick={nextReview}
            className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded text-xs font-semibold hover:from-primary-600 hover:to-primary-700 transition-all shadow-sm hover:shadow-md"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

const Product = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const toast = useToast();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const [searchParams] = useSearchParams();
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState({});
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  // Capture affiliate code from URL on page load
  useEffect(() => {
    captureAffiliateFromURL(searchParams);
  }, [searchParams]);

  const { data: product, isLoading, error: productError, refetch } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const response = await api.get(`/catalog/products/${slug}`);
      return response.data.data;
    },
    retry: 2,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes to prevent unnecessary refetches
    gcTime: 10 * 60 * 1000, // Keep in garbage collection for 10 minutes
  });

  // Fetch reviews for this product
  const { data: reviewsData, refetch: refetchReviews } = useQuery({
    queryKey: ['product-reviews', product?._id],
    queryFn: async () => {
      if (!product?._id) return { data: [], meta: { total: 0 } };
      const response = await api.get(`/products/${product._id}/reviews?limit=50`);
      return response.data;
    },
    enabled: !!product?._id,
  });

  const handleReviewSubmitted = () => {
    refetch(); // Refresh product data to update rating
    refetchReviews(); // Refresh reviews list
  };

  const toggleWishlistMutation = useMutation({
    mutationFn: async (productId) => {
      await api.post(`/user/wishlist/toggle/${productId}`);
    },
    onSuccess: () => {
      setIsWishlisted(!isWishlisted);
      // Play sound only when adding to wishlist
      if (!isWishlisted) playWishlistAdd();
      toast.success(isWishlisted ? 'Removed from wishlist' : 'Added to wishlist');
    },
    onError: (error) => {
      playError();
      if (error.response?.status === 401) {
        toast.error('Please log in to add items to your wishlist');
      } else {
        toast.error(error.response?.data?.error?.message || 'Failed to update wishlist');
      }
    },
  });

  // Delete review mutation
  const deleteReviewMutation = useMutation({
    mutationFn: async (reviewId) => {
      await api.delete(`/products/${product._id}/reviews/${reviewId}`);
    },
    onSuccess: () => {
      toast.success('Review deleted successfully');
      refetch();
      refetchReviews();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete review');
    },
  });

  // Edit review mutation
  const editReviewMutation = useMutation({
    mutationFn: async ({ reviewId, rating, comment }) => {
      const response = await api.put(`/products/${product._id}/reviews/${reviewId}`, {
        rating,
        comment,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Review updated successfully');
      refetch();
      refetchReviews();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update review');
    },
  });

  useEffect(() => {
    if (product) {
      addToRecentlyViewed(product);
    }
  }, [product]);

  // Close modal on successful edit
  useEffect(() => {
    if (editReviewMutation.isSuccess && isEditModalOpen) {
      setIsEditModalOpen(false);
      setEditingReview(null);
    }
  }, [editReviewMutation.isSuccess, isEditModalOpen]);

  const discountPercentage = product?.comparePrice
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : 0;

  // Memoize normalized images to prevent re-renders
  const normalizedImages = useMemo(() => {
    return product?.images?.map(img => normalizeImageUrl(img)) || [];
  }, [product?.images]);

  const renderStars = (rating = 4.5) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-5 h-5 ${
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

      // Validate product data
      if (!product?._id) {
        throw new Error('Product information is missing. Please refresh the page.');
      }

      await dispatch(addToCart({
        productId: product._id,
        quantity,
        variantId,
      })).unwrap();

      // Play add to cart sound
      playAddToCart();

      // Show message - same for all users (3 seconds)
      toast.success('Added to cart!', 3000);

      // Reset after 2 seconds
      setTimeout(() => setAddedToCart(false), 2000);
    } catch (error) {
      playError();
      console.error('Add to cart error:', error);
      const errorMsg = error.message || error.error?.message || 'Failed to add to cart. Please try again.';
      toast.error(errorMsg);
      setAddedToCart(false);
    }
  };

  const handleBuyNow = async () => {
    // Allow guests to proceed, they'll be prompted to login at checkout
    const variantId = Object.keys(selectedVariants).length > 0
      ? JSON.stringify(selectedVariants)
      : undefined;

    try {
      await dispatch(addToCart({
        productId: product._id,
        quantity,
        variantId,
      })).unwrap();
      navigate('/checkout'); // Checkout will handle login/register prompt
    } catch (error) {
      console.error('Buy now error:', error);
      toast.error(error.message || 'Failed to process. Please try again.');
    }
  };

  const handleWishlistToggle = () => {
    if (!isAuthenticated) {
      toast.error('Please log in to add items to your wishlist');
      navigate('/login', { state: { from: `/product/${slug}` } });
      return;
    }
    toggleWishlistMutation.mutate(product._id);
  };

  const handleShare = async () => {
    const shareData = {
      title: product.title,
      text: `Check out ${product.title} for ${formatCurrency(product.price)}!`,
      url: window.location.href,
    };

    try {
      // Check if Web Share API is supported
      if (navigator.share) {
        await navigator.share(shareData);
        // Share dialog shown by browser/OS - no toast needed
      } else {
        // Fallback: Copy link to clipboard
        await navigator.clipboard.writeText(window.location.href);
        // Silently copied to clipboard
      }
    } catch (error) {
      // User cancelled share or error occurred
      if (error.name !== 'AbortError') {
        // Fallback: Copy to clipboard
        try {
          await navigator.clipboard.writeText(window.location.href);
          // Silently copied to clipboard
        } catch (clipboardError) {
          // Only show error if everything fails
          toast.error('Failed to share product');
        }
      }
    }
  };

  const handleEditReview = (review) => {
    setEditingReview(review);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = ({ rating, comment }) => {
    if (editingReview) {
      editReviewMutation.mutate({
        reviewId: editingReview._id,
        rating,
        comment,
      });
    }
  };

  const handleDeleteReview = (reviewId) => {
    if (window.confirm('Are you sure you want to delete this review?')) {
      deleteReviewMutation.mutate(reviewId);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-700">Loading product...</p>
        </div>
      </div>
    );
  }

  // Product not found
  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl md:text-5xl lg:text-6xl mb-4">📦</div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Product Not Found</h2>
          <p className="text-gray-700 mb-6">The product you're looking for doesn't exist or has been removed.</p>
          <Link to="/" className="btn btn-primary">Back to Home</Link>
        </div>
      </div>
    );
  }

  // SEO metadata for Google indexing
  const seoTitle = product.seo?.title || `${product.title} - V-Tech Kitchen`;
  const seoDescription = (product.seo?.description || product.description?.substring(0, 155) || `Buy ${product.title} at the best price. ${product.brand ? `${product.brand} ` : ''}High-quality kitchen products with fast shipping.`).substring(0, 155);
  const seoKeywords = product.seo?.keywords?.join(', ') || product.tags?.join(', ') || product.title;
  const productImage = normalizedImages[0] || 'https://www.vtechkitchen.com/og-image.jpg';
  const productUrl = `https://www.vtechkitchen.com/product/${product.slug}`;

  // Google Rich Snippets - Product Structured Data
  const structuredData = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.title,
    "image": normalizedImages,
    "description": product.description,
    "sku": product.sku,
    "brand": product.brand ? {
      "@type": "Brand",
      "name": product.brand
    } : undefined,
    "offers": {
      "@type": "Offer",
      "url": productUrl,
      "priceCurrency": "INR",
      "price": product.price,
      "priceValidUntil": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      "itemCondition": "https://schema.org/NewCondition",
      "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Organization",
        "name": product.vendorId?.storeName || "V-Tech Kitchen"
      },
      "hasMerchantReturnPolicy": {
        "@type": "MerchantReturnPolicy",
        "applicableCountry": "IN",
        "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
        "merchantReturnDays": 7,
        "returnMethod": "https://schema.org/ReturnByMail",
        "returnFees": "https://schema.org/FreeReturn"
      },
      "shippingDetails": {
        "@type": "OfferShippingDetails",
        "shippingRate": {
          "@type": "MonetaryAmount",
          "value": 100,
          "currency": "INR"
        },
        "shippingDestination": {
          "@type": "DefinedRegion",
          "addressCountry": "IN"
        },
        "deliveryTime": {
          "@type": "ShippingDeliveryTime",
          "handlingTime": {
            "@type": "QuantitativeValue",
            "minValue": 1,
            "maxValue": 2,
            "unitCode": "DAY"
          },
          "transitTime": {
            "@type": "QuantitativeValue",
            "minValue": 3,
            "maxValue": 7,
            "unitCode": "DAY"
          }
        }
      }
    },
    "aggregateRating": product.reviewCount > 0 ? {
      "@type": "AggregateRating",
      "ratingValue": product.rating || 0,
      "reviewCount": product.reviewCount || 0,
      "bestRating": 5,
      "worstRating": 1
    } : undefined,
    "review": reviewsData?.data?.length > 0 ? reviewsData.data.slice(0, 5).filter(r => r.createdAt && r.rating).map(review => ({
      "@type": "Review",
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": review.rating,
        "bestRating": 5,
        "worstRating": 1
      },
      "author": {
        "@type": "Person",
        "name": review.userId?.name || "Anonymous"
      },
      "datePublished": new Date(review.createdAt).toISOString(),
      "reviewBody": review.comment || ""
    })) : undefined
  };

  return (
    <>
      <SEO
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        image={productImage}
        url={productUrl}
        type="product"
        structuredData={structuredData}
      />
      <div className="min-h-screen bg-blue-50 pt-12">
        <div className="container mx-auto px-3 sm:px-4 md:px-6 max-w-screen-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-6 lg:gap-6">
          {/* Product Images */}
          <div className="lg:col-span-2 fade-in-left">
            <div className="sticky top-4">
              <ProductImageCarousel
                images={normalizedImages}
                productName={product.title}
              />
            </div>
          </div>

        {/* Product Details */}
        <div className="lg:col-span-3 space-y-4 fade-in-right">
          <div className="space-y-2">
            {product.brand && (
              <div className="inline-block fade-in stagger-1">
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                  {product.brand}
                </span>
              </div>
            )}
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-snug fade-in-down">{product.title}</h1>

            {/* Tags hidden - used only for SEO keywords */}

            {/* Vendor Name */}
            {product.vendorId && (
              <Link
                to={`/vendor/${product.vendorId.slug}`}
                className="inline-flex items-center gap-1.5 text-sm text-gray-700 hover:text-primary-600 transition-colors group"
              >
                <span className="font-medium group-hover:underline">{product.vendorId.storeName}</span>
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {renderStars(product.rating)}
              </div>
              <span className="text-sm font-medium text-gray-900">
                {product.rating || 0}
              </span>
              <span className="text-sm text-gray-500">
                ({product.reviewCount || 0} reviews)
              </span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={handleWishlistToggle}
                className={`p-2 rounded-lg border transition-all ${
                  isWishlisted
                    ? 'border-red-500 bg-red-50 text-red-500'
                    : 'border-gray-300 hover:border-red-500 hover:bg-red-50'
                }`}
              >
                <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
              </button>
              <button
                onClick={handleShare}
                className="p-2 rounded-lg border border-gray-300 hover:border-gray-400 hover:bg-blue-100 transition-all"
                title="Share product"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="bg-blue-100 p-4 rounded-lg border border-gray-200">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-3xl font-bold text-gray-900">
                {formatCurrency(product.price)}
              </span>
              {product.comparePrice && (
                <>
                  <span className="text-lg text-gray-500 line-through">
                    {formatCurrency(product.comparePrice)}
                  </span>
                  {discountPercentage > 0 && (
                    <span className="bg-red-500 text-white text-sm font-semibold px-3 py-1 rounded-md">
                      -{discountPercentage}%
                    </span>
                  )}
                </>
              )}
            </div>

            {/* GST/Tax Information */}
            {product.taxable && product.taxRate > 0 ? (
              <div className="mt-2 flex items-center gap-2 text-sm">
                {product.taxIncluded ? (
                  <>
                    <span className="text-green-700 font-medium">
                      Tax Included in Price
                    </span>
                    <span className="text-gray-500">
                      • GST {product.taxRate}%
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-gray-700">
                      Tax will be added at checkout
                    </span>
                    <span className="text-gray-500">
                      • GST {product.taxRate}%
                    </span>
                  </>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-700 mt-2">
                (Price inclusive of all taxes)
              </p>
            )}

            {discountPercentage > 0 && (
              <p className="text-sm text-green-700 font-medium mt-2">
                You save {formatCurrency(product.comparePrice - product.price)}
              </p>
            )}
          </div>

          <SocialProof product={product} />

          <div className="flex items-center gap-2">
            {product.stock > 10 ? (
              <p className="text-green-600 font-medium flex items-center gap-1">
                <Check className="w-5 h-5" /> In Stock
              </p>
            ) : product.stock > 0 ? (
              <p className="text-orange-600 font-medium">
                ⚠ Only {product.stock} left in stock
              </p>
            ) : (
              <p className="text-red-600 font-medium">✗ Out of Stock</p>
            )}
          </div>

          {product.variants && Object.keys(product.variants).length > 0 && (
            <div className="space-y-3">
              {Object.entries(product.variants).map(([key, options]) => (
                <div key={key}>
                  <h3 className="text-sm font-medium text-gray-700 mb-2 capitalize">{key}:</h3>
                  <div className="flex flex-wrap gap-2">
                    {options.map((option) => (
                      <button
                        key={option}
                        onClick={() => setSelectedVariants({ ...selectedVariants, [key]: option })}
                        className={`px-3 py-1.5 text-sm border rounded ${
                          selectedVariants[key] === option
                            ? 'border-primary-600 bg-primary-600 text-white'
                            : 'border-gray-300 hover:border-gray-400'
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

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Quantity:</label>
            <div className="flex items-center border border-gray-300 rounded">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-3 py-2 hover:bg-blue-100"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                name="quantity"
                value={quantity}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value > 0) {
                    setQuantity(value);
                  } else if (e.target.value === '') {
                    // Allow clearing temporarily
                    setQuantity('');
                  }
                }}
                onBlur={() => {
                  // On blur, ensure we have a valid number
                  if (quantity === '' || quantity < 1) {
                    setQuantity(1);
                  }
                }}
                className="w-14 text-center py-2 border-x border-gray-300 focus:outline-none"
                min="1"
              />
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="px-3 py-2 hover:bg-blue-100"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex gap-4 pt-2 fade-in stagger-3">
            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              data-testid="add-to-cart-btn"
              data-cy="add-to-cart-btn"
              className={`btn-add-to-cart btn-scale hover-lift flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-lg transition-all shadow-lg hover:shadow-2xl transform hover:scale-105 active:scale-95 ${
                addedToCart
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white border-2 border-green-400'
                  : product.stock === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed border-2 border-gray-400'
                  : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 border-2 border-primary-400'
              }`}
            >
              {addedToCart ? (
                <>
                  <Check className="w-6 h-6 checkmark" />
                  Added to Cart
                </>
              ) : (
                <>
                  <ShoppingCart className="w-6 h-6" />
                  Add to Cart
                </>
              )}
            </button>
            <button
              onClick={handleBuyNow}
              disabled={product.stock === 0}
              className="btn-scale hover-lift flex-1 bg-gradient-to-r from-secondary-500 to-secondary-600 text-white py-4 rounded-2xl font-bold text-lg hover:from-secondary-600 hover:to-secondary-700 transition-all shadow-lg hover:shadow-2xl transform hover:scale-105 active:scale-95 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed border-2 border-secondary-400 disabled:border-gray-400"
            >
              Buy Now
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t-2 border-gray-200">
            <div className="text-center p-4 bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl border-2 border-primary-200 hover:shadow-lg transition-all transform hover:scale-105">
              <div className="bg-blue-500 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-md">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm font-bold text-gray-900">Fast Delivery</p>
              <p className="text-xs text-gray-700 mt-1">Quick shipping</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-secondary-50 to-secondary-100 rounded-2xl border-2 border-secondary-200 hover:shadow-lg transition-all transform hover:scale-105">
              <div className="bg-secondary-500 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-md">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm font-bold text-gray-900">Secure Payment</p>
              <p className="text-xs text-gray-700 mt-1">100% protected</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-dark-50 to-gray-100 rounded-2xl border-2 border-dark-200 hover:shadow-lg transition-all transform hover:scale-105">
              <div className="bg-gray-900 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-md">
                <RotateCcw className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm font-bold text-gray-900">Easy Returns</p>
              <p className="text-xs text-gray-700 mt-1">Hassle-free</p>
            </div>
          </div>

          {/* Sidebar - Ad Banner */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <AdBanner placement="product_sidebar" position="right" className="mb-6" />
            </div>
          </div>
        </div>
      </div>
      </div>

      <div className="bg-gradient-to-b from-gray-50 to-white py-12 mt-8">
        <div className="container mx-auto px-3 sm:px-4 md:px-6">
          {/* Video and Description Side by Side */}
          {(product.videoUrl || product.description) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Product Video - Left Side */}
              {product.videoUrl && (
                <div className="bg-white rounded-xl border-2 border-primary-200 shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 animate-fadeInUp">
                  <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-4">
                    <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                      Product Video
                    </h2>
                  </div>
                  <div className="p-6 bg-blue-100">
                    <div className="w-full" style={{height: '300px'}}>
                      <iframe
                        width="100%"
                        height="300"
                        src={product.videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                        title="Product Video"
                        style={{ border: 0 }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                        allowFullScreen
                        className="rounded-lg shadow-md w-full"
                      ></iframe>
                    </div>
                  </div>
                </div>
              )}

              {/* Product Description - Right Side */}
              {product.description && (
                <div className={`bg-white rounded-xl border-2 border-primary-200 shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 animate-fadeInUp ${!product.videoUrl ? 'lg:col-span-2' : ''}`}>
                  <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-4">
                    <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Product Description
                    </h2>
                  </div>
                  <div className="p-6" style={{height: product.videoUrl ? '364px' : 'auto', overflowY: 'auto'}}>
                    <div className="text-gray-700 text-base leading-relaxed space-y-3">
                      {product.description.split('\n').map((paragraph, idx) => (
                        paragraph.trim() && <p key={idx} className="text-justify">{paragraph}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Warranty & Specifications - Side by Side Container */}
          {((product.hasWarranty && product.warranty) || (product.specifications && product.specifications.length > 0)) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Warranty Information */}
              {product.hasWarranty && product.warranty && (
                <div className="bg-white rounded-xl border-2 border-blue-200 shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Warranty Information
                    </h2>
                  </div>
                  <div className="p-4">
                    {product.warranty.description && (
                      <p className="text-sm text-gray-800 leading-relaxed mb-4">
                        {product.warranty.description}
                      </p>
                    )}
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <h3 className="text-xs font-semibold text-gray-600 uppercase">Duration</h3>
                          <p className="text-sm font-bold text-gray-900">
                            {product.warranty.duration} {product.warranty.durationType}
                          </p>
                        </div>
                      </div>

                      {product.warranty.provider && (
                        <div className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <div>
                            <h3 className="text-xs font-semibold text-gray-600 uppercase">Provider</h3>
                            <p className="text-sm font-bold text-gray-900">{product.warranty.provider}</p>
                          </div>
                        </div>
                      )}

                      {product.warranty.terms && (
                        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                          <h3 className="text-xs font-semibold text-gray-700 mb-1">Terms & Conditions</h3>
                          <p className="text-xs text-gray-800 leading-relaxed">{product.warranty.terms}</p>
                        </div>
                      )}

                      {product.warranty.activationRequired && (
                        <div className="bg-orange-50 p-3 rounded-lg border border-orange-300">
                          <div className="flex items-start gap-2">
                            <svg className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <div>
                              <h3 className="text-xs font-semibold text-orange-800 mb-1">Activation Required</h3>
                              <p className="text-xs text-orange-900">Requires activation after purchase.</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Technical Specifications */}
              {product.specifications && product.specifications.length > 0 && (
                <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                      Technical Specification
                    </h2>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {product.specifications.map((spec, index) => (
                        <div key={index} className="flex items-start gap-2 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all">
                          <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div className="flex-1">
                            <dt className="text-xs font-bold text-gray-600 uppercase">
                              {spec.label}
                            </dt>
                            <dd className="text-sm font-semibold text-gray-900 mt-0.5">
                              {spec.value}
                            </dd>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {product.keyFeatures && product.keyFeatures.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-5">
                <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Key Features
                </h2>
              </div>
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {product.keyFeatures.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3 bg-primary-50 p-4 rounded-lg border border-primary-200 hover:bg-primary-100 transition-colors">
                      <Check className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span className="text-base text-gray-900 leading-relaxed">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Ad Banner - Bottom of Product Details */}
          <div className="mt-8">
            <AdBanner placement="product_bottom" position="bottom" className="mb-6" />
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-b from-gray-50 to-white py-8 mt-8">
        <div className="container mx-auto px-3 sm:px-4 md:px-6">
          {/* Review Section - Side by Side Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Left Side - Review Form */}
            <div>
              <ReviewForm productId={product._id} onReviewSubmitted={handleReviewSubmitted} />
            </div>

            {/* Right Side - Customer Reviews Carousel */}
            <div>
              {reviewsData?.data && reviewsData.data.length > 0 ? (
                <CustomerReviewsCarousel
                  reviews={reviewsData.data}
                  renderStars={renderStars}
                  onEdit={handleEditReview}
                  onDelete={handleDeleteReview}
                  currentUser={user}
                />
              ) : (
                <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-xl p-12 text-center h-full flex items-center justify-center">
                  <div>
                    <div className="text-4xl md:text-5xl lg:text-6xl mb-4">⭐</div>
                    <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">No Reviews Yet</h3>
                    <p className="text-gray-700">Be the first to review this product!</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* FAQ Section - Collapsible Accordion */}
          {product.faqs && product.faqs.length > 0 && (
            <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden mb-8">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Frequently Asked Questions
                </h2>
              </div>
              <div className="p-4">
                <div className="space-y-2">
                  {product.faqs.map((faq, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Question - Clickable Header */}
                      <button
                        onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                        className="w-full text-left px-4 py-3 bg-gradient-to-r from-blue-50 to-gray-50 hover:from-blue-100 hover:to-gray-100 transition-all flex items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-2 flex-1">
                          <span className="text-blue-600 font-bold flex-shrink-0 text-sm">Q{index + 1}.</span>
                          <span className="text-sm font-semibold text-gray-900">{faq.question}</span>
                        </div>
                        <svg
                          className={`w-5 h-5 text-blue-600 flex-shrink-0 transition-transform duration-200 ${
                            openFaqIndex === index ? 'transform rotate-180' : ''
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Answer - Collapsible Content */}
                      <div
                        className={`overflow-hidden transition-all duration-300 ${
                          openFaqIndex === index ? 'max-h-96' : 'max-h-0'
                        }`}
                      >
                        <div className="px-4 py-3 bg-white border-t border-gray-200">
                          <p className="text-sm text-gray-900 leading-relaxed flex items-start gap-2">
                            <span className="text-blue-600 font-bold flex-shrink-0">A:</span>
                            <span>{faq.answer}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <ProductRecommendations
            type="frequently-bought-together"
            productId={product._id}
            limit={4}
          />

          <ProductRecommendations
            type="similar"
            productId={product._id}
            limit={8}
            showViewAll={true}
            viewAllLink={`/category/${product.categorySlug}`}
          />

          <RecentlyViewed currentProductId={product._id} limit={6} />
        </div>
      </div>

      {/* Edit Review Modal */}
      <EditReviewModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingReview(null);
        }}
        review={editingReview}
        onSubmit={handleEditSubmit}
        isLoading={editReviewMutation.isPending}
      />
      </div>
    </>
  );
};

export default Product;
