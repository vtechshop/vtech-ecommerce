// FILE: apps/web/src/components/product/SearchSnippets.jsx
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, ChevronRight } from 'lucide-react';
import api from '@/utils/api';
import ProductCard from './ProductCard';
import Spinner from '@/components/common/Spinner';

/**
 * SearchSnippets Component
 * Displays product recommendations based on popular search queries
 * Shows what other customers are searching for and relevant products
 */
const SearchSnippets = ({ limit = 3, className = '' }) => {
  const { data: snippets, isLoading } = useQuery({
    queryKey: ['search-snippets', limit],
    queryFn: async () => {
      const { data } = await api.get(`/catalog/recommendations/search-snippets?limit=${limit}`);
      return data.data || [];
    },
    staleTime: 600000, // 10 minutes
  });

  // Don't render if no snippets
  if (!isLoading && (!snippets || snippets.length === 0)) {
    return null;
  }

  return (
    <section className={`py-8 ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        <div className="text-blue-600 dark:text-primary-400">
          <Search className="w-5 h-5" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Trending Searches
        </h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="space-y-12">
          {snippets && snippets.map((snippet, index) => (
            <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-8 last:border-0">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <span className="text-blue-600 dark:text-primary-400">"</span>
                    {snippet.query}
                    <span className="text-blue-600 dark:text-primary-400">"</span>
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Searched {snippet.searchCount} times this week
                  </p>
                </div>
                <Link
                  to={`/products?q=${encodeURIComponent(snippet.query)}`}
                  className="flex items-center gap-1 text-blue-600 dark:text-primary-400 hover:underline font-medium text-sm"
                >
                  View All
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {snippet.products && snippet.products.slice(0, 5).map((product) => (
                  <ProductCard key={product._id} product={product} compact />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default SearchSnippets;
