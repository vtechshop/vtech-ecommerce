// FILE: apps/web/src/components/product/RecentlyViewed.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getRecentlyViewed, removeFromRecentlyViewed } from '@/utils/recentlyViewed';
import { formatCurrency } from '@/utils/format';
import { Eye, ShoppingCart, Star } from 'lucide-react';

const RecentlyViewed = ({ currentProductId = null, limit = 6 }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentProducts = async () => {
      try {
        setLoading(true);

        // Get recently viewed products from localStorage
        let recentProducts = getRecentlyViewed(limit + 5); // Get extra to account for deleted products

        // Filter out the current product if viewing a product page
        if (currentProductId) {
          recentProducts = recentProducts.filter(p => p._id !== currentProductId);
        }

        if (recentProducts.length === 0) {
          setProducts([]);
          setLoading(false);
          return;
        }

        // Extract product IDs
        const productIds = recentProducts.map(p => p._id);

        // Validate products exist in database and aren't deleted
        const response = await fetch(`/api/products/validate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ productIds }),
        });

        if (response.ok) {
          const data = await response.json();
          const validProductIds = new Set(data.validProducts || []);

          // Filter to only valid products
          const validProducts = recentProducts.filter(p => validProductIds.has(p._id));

          // Remove invalid products from localStorage
          const invalidProducts = recentProducts.filter(p => !validProductIds.has(p._id));
          invalidProducts.forEach(p => removeFromRecentlyViewed(p._id));

          // Limit to requested number
          setProducts(validProducts.slice(0, limit));
        } else {
          // If validation fails, show products from localStorage (fallback)
          setProducts(recentProducts.slice(0, limit));
        }
      } catch (error) {
        console.error('Error fetching recently viewed products:', error);
        // Fallback to localStorage data
        let recentProducts = getRecentlyViewed(limit + 1);
        if (currentProductId) {
          recentProducts = recentProducts.filter(p => p._id !== currentProductId);
        }
        setProducts(recentProducts.slice(0, limit));
      } finally {
        setLoading(false);
      }
    };

    fetchRecentProducts();
  }, [currentProductId, limit]);

  if (products.length === 0) {
    return null; // Don't show section if no products
  }

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border-2 border-gray-200 p-6 sm:p-8 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-3 rounded-xl shadow-lg">
            <Eye className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Recently Viewed</h2>
            <p className="text-sm text-gray-700 mt-1">Products you've recently checked out</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 sm:gap-6">
        {products.map((product) => {
          const discountPercentage = product.compareAt && product.compareAt > product.price
            ? Math.round(((product.compareAt - product.price) / product.compareAt) * 100)
            : 0;

          return (
            <Link
              key={product._id}
              to={`/product/${product.slug}`}
              className="group"
            >
              <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden hover:border-primary-400 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                {/* Product Image */}
                <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.title}
                      className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <div className="text-4xl mb-2">📦</div>
                        <p className="text-xs">No image</p>
                      </div>
                    </div>
                  )}

                  {/* Discount Badge */}
                  {discountPercentage > 0 && (
                    <div className="absolute top-3 left-3">
                      <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg">
                        -{discountPercentage}%
                      </span>
                    </div>
                  )}

                  {/* Out of Stock Badge */}
                  {product.stock <= 0 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                      <span className="bg-white text-gray-900 px-4 py-2 rounded-xl text-sm font-bold shadow-lg">
                        Out of Stock
                      </span>
                    </div>
                  )}

                  {/* Quick View Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                    <div className="flex gap-2">
                      <button className="bg-white text-gray-900 p-2.5 rounded-xl hover:bg-primary-600 hover:text-white transition-colors shadow-lg transform hover:scale-110">
                        <ShoppingCart className="w-4 h-4" />
                      </button>
                      <button className="bg-white text-gray-900 p-2.5 rounded-xl hover:bg-primary-600 hover:text-white transition-colors shadow-lg transform hover:scale-110">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3 className="text-sm font-bold text-gray-900 line-clamp-2 group-hover:text-gray-600 transition-colors min-h-[2.5rem] mb-2">
                    {product.title}
                  </h3>

                  {/* Rating */}
                  {product.rating > 0 && (
                    <div className="flex items-center gap-1 mb-2">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < Math.floor(product.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      {product.reviewCount > 0 && (
                        <span className="text-xs text-gray-700 font-semibold">({product.reviewCount})</span>
                      )}
                    </div>
                  )}

                  {/* Price */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-primary-700">
                      {formatCurrency(product.price)}
                    </span>
                    {product.compareAt && product.compareAt > product.price && (
                      <span className="text-xs text-gray-500 line-through font-medium">
                        {formatCurrency(product.compareAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default RecentlyViewed;
