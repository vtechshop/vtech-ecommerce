// FILE: apps/web/src/pages/ProductDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart } from '@/store/slices/cartSlice';
import { useToast } from '@/components/common/ToastContainer';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import ProductGallery from '@/components/products/ProductGallery';
import ProductReviews from '@/components/products/ProductReviews';
import RelatedProducts from '@/components/products/RelatedProducts';
import EditReviewModal from '@/components/product/EditReviewModal';
import { formatCurrency } from '@/utils/format';
import { generateProductSchema } from '@/utils/seo';
import SEO from '@/components/common/SEO';
import { Star, ShoppingCart, Heart, Share2, Shield } from 'lucide-react';

const ProductDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const toast = useToast();
  const { isAuthenticated } = useSelector((state) => state.auth);

  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [editingReview, setEditingReview] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { data: product, isLoading, refetch } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const response = await api.get(`/catalog/products/${slug}`);
      return response.data.data;
    },
  });

  const { data: relatedProducts } = useQuery({
    queryKey: ['related-products', product?._id],
    queryFn: async () => {
      const response = await api.get(`/catalog/products/${product._id}/related`);
      return response.data.data;
    },
    enabled: !!product,
  });

  // Delete review mutation
  const deleteReviewMutation = useMutation({
    mutationFn: async (reviewId) => {
      await api.delete(`/products/${product._id}/reviews/${reviewId}`);
    },
    onSuccess: () => {
      toast.success('Review deleted successfully');
      refetch(); // Refresh product data to update reviews
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
      setEditingReview(null);
      refetch(); // Refresh product data to update reviews
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update review');
    },
  });

  // SEO data is now handled by SEO component in the render
  const productSchema = product ? generateProductSchema(product) : null;

  const handleAddToCart = () => {
    dispatch(
      addToCart({
        product,
        quantity,
        variantId: selectedVariant?._id,
      })
    );
    // Show success message or open cart drawer
    alert('Added to cart!');
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('/checkout');
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

  // Close modal on successful edit
  useEffect(() => {
    if (editReviewMutation.isSuccess && isEditModalOpen) {
      setIsEditModalOpen(false);
      setEditingReview(null);
    }
  }, [editReviewMutation.isSuccess, isEditModalOpen]);

  const handleDeleteReview = (reviewId) => {
    if (window.confirm('Are you sure you want to delete this review?')) {
      deleteReviewMutation.mutate(reviewId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Product not found</h2>
        <Button onClick={() => navigate('/')} variant="primary">
          Go to Home
        </Button>
      </div>
    );
  }

  const isOutOfStock = product.stock <= 0;
  const price = selectedVariant?.price || product.price;
  const compareAtPrice = selectedVariant?.compareAt || product.compareAt;

  return (
    <>
      {/* SEO Meta Tags */}
      {product && (
        <SEO
          title={product.seo?.title || `${product.title} - V-Tech Kitchen`}
          description={product.seo?.description || product.description?.substring(0, 160) || `Buy ${product.title} at V-Tech Kitchen. Premium quality at great prices.`}
          keywords={product.seo?.keywords?.join(', ') || `${product.title}, ${product.brand || 'kitchen'}, ${product.tags?.join(', ') || 'kitchenware'}`}
          image={product.images?.[0]}
          url={typeof window !== 'undefined' ? window.location.href : `https://vtechkitchen.com/product/${product.slug}`}
          type="product"
          structuredData={productSchema}
        />
      )}

      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="text-sm text-gray-700 mb-6">
          <Link to="/" className="hover:text-gray-600">Home</Link>
          <span className="mx-2">/</span>
          <Link to="/products" className="hover:text-gray-600">Products</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{product.title}</span>
        </div>

        {/* Main Product Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Gallery */}
          <div>
            <ProductGallery images={product.images} productTitle={product.seo?.title || product.title} />
          </div>

          {/* Product Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <h1 className="text-3xl font-bold mb-2">{product.title}</h1>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${
                      i < Math.floor(product.rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-700">
                {product.rating?.toFixed(1)} ({product.reviewCount} reviews)
              </span>
            </div>

            {/* Brand */}
            {product.brand && (
              <p className="text-gray-700 mb-4">
                Brand: <span className="font-semibold">{product.brand}</span>
              </p>
            )}

            {/* Price */}
            <div className="mb-6">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-blue-600">
                  {formatCurrency(price)}
                </span>
                {compareAtPrice && (
                  <span className="text-xl text-gray-500 line-through">
                    {formatCurrency(compareAtPrice)}
                  </span>
                )}
                {compareAtPrice && (
                  <span className="bg-red-100 text-red-800 text-sm font-semibold px-2 py-1 rounded">
                    Save {Math.round(((compareAtPrice - price) / compareAtPrice) * 100)}%
                  </span>
                )}
              </div>
            </div>

            {/* Variants */}
            {product.variants?.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Select {product.variants[0].name}
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant) => (
                    <button
                      key={variant._id}
                      onClick={() => setSelectedVariant(variant)}
                      className={`px-4 py-2 border-2 rounded-lg transition-all ${
                        selectedVariant?._id === variant._id
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {variant.value}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Quantity</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 border rounded flex items-center justify-center hover:bg-gray-50"
                  disabled={quantity <= 1}
                >
                  -
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 text-center border rounded py-2"
                  min="1"
                  max={product.stock}
                />
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="w-10 h-10 border rounded flex items-center justify-center hover:bg-gray-50"
                  disabled={quantity >= product.stock}
                >
                  +
                </button>
                <span className="text-sm text-gray-700">
                  {product.stock} available
                </span>
              </div>
            </div>

            {/* Stock Status */}
            <div className="mb-6">
              {isOutOfStock ? (
                <span className="text-red-600 font-semibold">Out of Stock</span>
              ) : product.stock < 10 ? (
                <span className="text-orange-600 font-semibold">
                  Only {product.stock} left in stock!
                </span>
              ) : (
                <span className="text-green-600 font-semibold">In Stock</span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 mb-6">
              <Button
                onClick={handleBuyNow}
                variant="primary"
                className="w-full"
                disabled={isOutOfStock}
              >
                Buy Now
              </Button>
              <Button
                onClick={handleAddToCart}
                variant="outline"
                className="w-full"
                disabled={isOutOfStock}
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Add to Cart
              </Button>
            </div>

            {/* Additional Actions */}
            <div className="flex gap-3 pb-6 border-b">
              <button className="flex items-center gap-2 text-gray-700 hover:text-gray-600">
                <Heart className="w-5 h-5" />
                <span className="text-sm">Add to Wishlist</span>
              </button>
              <button className="flex items-center gap-2 text-gray-700 hover:text-gray-600">
                <Share2 className="w-5 h-5" />
                <span className="text-sm">Share</span>
              </button>
            </div>

            {/* Features */}
            <div className="space-y-3 mt-6">
              <div className="flex items-center gap-3 text-sm">
                <Shield className="w-5 h-5 text-blue-600" />
                <span>7-day return policy</span>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Description</h2>
          <div className="prose max-w-none text-gray-700">
            {product.description}
          </div>
        </div>

        {/* Reviews */}
        <ProductReviews
          reviews={product.reviews || []}
          rating={product.rating}
          reviewCount={product.reviewCount}
          onEdit={handleEditReview}
          onDelete={handleDeleteReview}
        />

        {/* Related Products */}
        {relatedProducts && relatedProducts.length > 0 && (
          <div className="mt-12">
            <RelatedProducts products={relatedProducts} />
          </div>
        )}
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

export default ProductDetail;