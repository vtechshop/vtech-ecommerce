// FILE: apps/web/src/pages/dashboard/customer/Wishlist.jsx
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import {
  Heart,
  ShoppingCart,
  Trash2,
  Search,
  Package,
  ShoppingBag,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Grid,
  List
} from 'lucide-react';
import api from '@/utils/api';
import { addToCart } from '@/store/slices/cartSlice';
import { useToast } from '@/components/common/ToastContainer';
import { formatCurrency } from '@/utils/format';
import { PLACEHOLDER_IMAGE, handleImageError } from '@/utils/placeholders';

// Product Card Component
const ProductCard = ({ product, onAddToCart, onRemove, isRemoving, viewMode }) => {
  const isOutOfStock = !product.stock || product.stock <= 0;

  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all duration-200">
        <div className="flex gap-4">
          {/* Image */}
          <Link to={`/product/${product.slug}`} className="flex-shrink-0">
            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-100 rounded-lg overflow-hidden">
              {product.images && product.images.length > 0 ? (
                <img
                  src={product.images[0]}
                  alt={product.seo?.title || product.title}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  onError={(e) => handleImageError(e, PLACEHOLDER_IMAGE)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>
          </Link>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <Link to={`/product/${product.slug}`}>
              <h3 className="font-semibold text-gray-900 hover:text-primary-600 transition-colors line-clamp-2 mb-1">
                {product.title}
              </h3>
            </Link>

            {/* Stock Status */}
            <div className="flex items-center gap-1.5 mb-2">
              {isOutOfStock ? (
                <>
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-600 font-medium">Out of Stock</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-600 font-medium">In Stock</span>
                </>
              )}
            </div>

            {/* Price */}
            <p className="text-xl font-bold text-primary-600 mb-3">
              {formatCurrency(product.price)}
            </p>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {!isOutOfStock && (
                <button
                  onClick={() => onAddToCart(product)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Add to Cart
                </button>
              )}
              <button
                onClick={() => onRemove(product._id)}
                disabled={isRemoving}
                className="flex items-center gap-1.5 px-3 py-2 text-red-600 text-sm font-medium border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid view (default)
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200 group">
      {/* Image */}
      <Link to={`/product/${product.slug}`} className="block relative">
        <div className="aspect-square bg-gray-100 overflow-hidden">
          {product.images && product.images.length > 0 ? (
            <img
              src={product.images[0]}
              alt={product.seo?.title || product.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => handleImageError(e, PLACEHOLDER_IMAGE)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-12 h-12 text-gray-400" />
            </div>
          )}
        </div>

        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold text-sm">
              Out of Stock
            </span>
          </div>
        )}

        {/* Quick Remove Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove(product._id);
          }}
          disabled={isRemoving}
          className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white text-red-500 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
          title="Remove from wishlist"
        >
          <Heart className="w-5 h-5 fill-current" />
        </button>
      </Link>

      {/* Content */}
      <div className="p-4">
        <Link to={`/product/${product.slug}`}>
          <h3 className="font-semibold text-gray-900 hover:text-primary-600 transition-colors line-clamp-2 mb-2 min-h-[2.5rem]">
            {product.title}
          </h3>
        </Link>

        {/* Stock Status */}
        <div className="flex items-center gap-1.5 mb-2">
          {isOutOfStock ? (
            <>
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-xs text-red-600 font-medium">Out of Stock</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-xs text-green-600 font-medium">In Stock</span>
            </>
          )}
        </div>

        {/* Price */}
        <p className="text-xl font-bold text-primary-600 mb-4">
          {formatCurrency(product.price)}
        </p>

        {/* Actions */}
        <div className="space-y-2">
          {!isOutOfStock ? (
            <button
              onClick={() => onAddToCart(product)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              Add to Cart
            </button>
          ) : (
            <button
              onClick={() => onRemove(product._id)}
              disabled={isRemoving}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-red-600 border border-red-200 font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const Wishlist = () => {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  const { data: wishlist, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: async () => {
      const response = await api.get('/user/wishlist');
      return response.data.data;
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (productId) => {
      await api.delete(`/user/wishlist/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      queryClient.invalidateQueries({ queryKey: ['customer-stats'] });
      toast.success('Removed from wishlist');
    },
    onError: () => {
      toast.error('Failed to remove from wishlist');
    },
  });

  const handleAddToCart = async (product) => {
    try {
      await dispatch(addToCart({
        productId: product._id,
        quantity: 1,
      })).unwrap();
      toast.success('Added to cart');
    } catch (error) {
      toast.error(error.message || 'Failed to add to cart');
    }
  };

  const handleRemove = (productId) => {
    removeMutation.mutate(productId);
  };

  // Filter wishlist by search query
  const filteredWishlist = useMemo(() => {
    if (!wishlist || !searchQuery.trim()) return wishlist || [];
    const query = searchQuery.toLowerCase();
    return wishlist.filter(product =>
      product.title?.toLowerCase().includes(query)
    );
  }, [wishlist, searchQuery]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
              <div className="aspect-square bg-gray-200"></div>
              <div className="p-4">
                <div className="h-5 w-3/4 bg-gray-200 rounded mb-2"></div>
                <div className="h-6 w-1/2 bg-gray-200 rounded mb-4"></div>
                <div className="h-10 w-full bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Wishlist</h1>
          <p className="text-gray-500 text-sm mt-1">
            {wishlist?.length || 0} item{(wishlist?.length || 0) !== 1 ? 's' : ''} saved
          </p>
        </div>

        {/* View Toggle */}
        {wishlist && wishlist.length > 0 && (
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
              title="Grid view"
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
              title="List view"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      {wishlist && wishlist.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search your wishlist..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
          />
        </div>
      )}

      {/* Products */}
      {filteredWishlist && filteredWishlist.length > 0 ? (
        <div className={viewMode === 'grid'
          ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          : "space-y-4"
        }>
          {filteredWishlist.map((product) => (
            <ProductCard
              key={product._id}
              product={product}
              onAddToCart={handleAddToCart}
              onRemove={handleRemove}
              isRemoving={removeMutation.isPending}
              viewMode={viewMode}
            />
          ))}
        </div>
      ) : wishlist && wishlist.length > 0 && searchQuery ? (
        /* No search results */
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Search className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No matching items</h3>
          <p className="text-gray-500 mb-4">Try a different search term</p>
          <button
            onClick={() => setSearchQuery('')}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            Clear search
          </button>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-xl border border-gray-200 p-8 sm:p-12 text-center">
          <div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="w-10 h-10 text-pink-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Your wishlist is empty</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Save items you love by clicking the heart icon on any product. Your wishlist makes it easy to find and buy them later!
          </p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            <ShoppingBag className="w-5 h-5" />
            Explore Products
          </Link>
        </div>
      )}
    </div>
  );
};

export default Wishlist;
