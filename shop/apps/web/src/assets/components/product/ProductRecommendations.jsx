// FILE: apps/web/src/components/product/ProductRecommendations.jsx
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronRight, TrendingUp, ShoppingBag, Heart } from 'lucide-react';
import api from '@/utils/api';
import ProductCard from './ProductCard';
import Spinner from '@/components/common/Spinner';

const ProductRecommendations = ({
  type = 'personalized', // 'personalized', 'similar', 'frequently-bought-together', 'trending', 'top-reviewed'
  productId = null,
  title = null,
  limit = 8,
  showViewAll = false,
  viewAllLink = '/search',
  className = ''
}) => {
  // Fetch recommendations based on type
  const { data: products, isLoading } = useQuery({
    queryKey: ['recommendations', type, productId, limit],
    queryFn: async () => {
      let endpoint = '';

      switch (type) {
        case 'personalized':
          endpoint = `/catalog/recommendations?limit=${limit}`;
          break;
        case 'similar':
          endpoint = `/catalog/products/${productId}/similar?limit=${limit}`;
          break;
        case 'frequently-bought-together':
          endpoint = `/catalog/products/${productId}/bought-together?limit=${limit}`;
          break;
        case 'trending':
          endpoint = `/catalog/recommendations/trending?limit=${limit}`;
          break;
        case 'top-reviewed':
          endpoint = `/catalog/recommendations/top-reviewed?limit=${limit}`;
          break;
        default:
          throw new Error('Invalid recommendation type');
      }

      const { data } = await api.get(endpoint);
      return data.data || [];
    },
    enabled: type === 'personalized' || type === 'trending' || type === 'top-reviewed' || (!!productId),
    staleTime: 300000, // 5 minutes
  });

  // Get default title based on type
  const getDefaultTitle = () => {
    switch (type) {
      case 'personalized':
        return 'Recommended For You';
      case 'similar':
        return 'Similar Products';
      case 'frequently-bought-together':
        return 'Frequently Bought Together';
      case 'trending':
        return 'Trending Now';
      case 'top-reviewed':
        return 'Top Rated Products';
      default:
        return 'You May Also Like';
    }
  };

  // Get icon based on type
  const getIcon = () => {
    switch (type) {
      case 'personalized':
        return <Heart className="w-5 h-5" />;
      case 'similar':
        return <ShoppingBag className="w-5 h-5" />;
      case 'frequently-bought-together':
        return <ShoppingBag className="w-5 h-5" />;
      case 'trending':
        return <TrendingUp className="w-5 h-5" />;
      case 'top-reviewed':
        return <Heart className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const displayTitle = title || getDefaultTitle();
  const icon = getIcon();

  // Don't render if no products
  if (!isLoading && (!products || products.length === 0)) {
    return null;
  }

  return (
    <section className={`py-8 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {icon && <div className="text-blue-600 dark:text-primary-400">{icon}</div>}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {displayTitle}
          </h2>
        </div>
        {showViewAll && products && products.length > 0 && (
          <Link
            to={viewAllLink}
            className="flex items-center gap-1 text-blue-600 dark:text-primary-400 hover:underline font-medium"
          >
            View All
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products && products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
};

export default ProductRecommendations;
