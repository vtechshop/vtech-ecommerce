// FILE: apps/web/src/components/common/SearchAutocomplete.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, TrendingUp, Clock, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import { formatCurrency } from '@/utils/format';

const SearchAutocomplete = React.memo(({ className = '' }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState([]);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load recent searches:', e);
      }
    }
  }, []);

  // Fetch autocomplete suggestions
  const { data: suggestions, isLoading } = useQuery({
    queryKey: ['search-autocomplete', query],
    queryFn: async () => {
      if (!query.trim() || query.length < 2) return null;

      const response = await api.get(`/catalog/products?q=${encodeURIComponent(query)}&limit=5`);
      return response.data.data || [];
    },
    enabled: query.length >= 2,
    staleTime: 60 * 1000, // Cache for 1 minute
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  // Fetch trending searches (popular products)
  const { data: trending } = useQuery({
    queryKey: ['trending-searches'],
    queryFn: async () => {
      const response = await api.get('/catalog/products?sort=-sold&limit=5');
      return response.data.data || [];
    },
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    const itemCount = suggestions?.length || trending?.length || recentSearches.length || 0;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < itemCount - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          const items = suggestions || trending || recentSearches;
          if (items[selectedIndex]) {
            handleSelectProduct(items[selectedIndex]);
          }
        } else if (query.trim()) {
          handleSearch(query);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
      default:
        break;
    }
  };

  const handleSearch = (searchQuery) => {
    if (!searchQuery.trim()) return;

    // Save to recent searches
    saveRecentSearch(searchQuery);

    // Navigate to search page
    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleSelectProduct = (product) => {
    // Save to recent searches
    saveRecentSearch(product.title);

    // Navigate to product page
    navigate(`/product/${product.slug}`);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const saveRecentSearch = (searchTerm) => {
    const updated = [
      searchTerm,
      ...recentSearches.filter(s => s !== searchTerm)
    ].slice(0, 5); // Keep only 5 recent searches

    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    setIsOpen(true);
    setSelectedIndex(-1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      handleSearch(query);
    }
  };

  const shouldShowDropdown = useMemo(() =>
    isOpen && (query.length >= 2 || recentSearches.length > 0 || trending?.length > 0),
    [isOpen, query.length, recentSearches.length, trending?.length]
  );

  const handleFocus = useCallback(() => setIsOpen(true), []);

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search products..."
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          className="w-full px-4 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
          autoComplete="off"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-primary-400 transition-colors"
        >
          <Search className="w-5 h-5" />
        </button>
      </form>

      {/* Dropdown */}
      {shouldShowDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-h-[500px] overflow-y-auto z-50">
          {/* Loading State */}
          {isLoading && query.length >= 2 && (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
            </div>
          )}

          {/* Search Suggestions */}
          {suggestions && suggestions.length > 0 && (
            <div className="py-2">
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                Products
              </div>
              {suggestions.map((product, index) => (
                <button
                  key={product._id}
                  onClick={() => handleSelectProduct(product)}
                  className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    selectedIndex === index ? 'bg-gray-50 dark:bg-gray-700' : ''
                  }`}
                >
                  {/* Product Image */}
                  <div className="w-12 h-12 flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
                    {product.images && product.images[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        No img
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 text-left overflow-hidden">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {product.title}
                    </p>
                    <p className="text-sm font-semibold text-blue-600 dark:text-primary-400">
                      {formatCurrency(product.price)}
                    </p>
                  </div>

                  {/* Search Icon */}
                  <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* No Results */}
          {!isLoading && query.length >= 2 && suggestions && suggestions.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400 mb-2">No products found</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Try different keywords
              </p>
            </div>
          )}

          {/* Recent Searches */}
          {query.length < 2 && recentSearches.length > 0 && (
            <div className="py-2 border-t border-gray-200 dark:border-gray-700">
              <div className="px-4 py-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  Recent Searches
                </span>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-blue-600 dark:text-primary-400 hover:underline"
                >
                  Clear
                </button>
              </div>
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => handleSearch(search)}
                  className={`w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    selectedIndex === index ? 'bg-gray-50 dark:bg-gray-700' : ''
                  }`}
                >
                  <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="flex-1 text-left text-sm text-gray-900 dark:text-gray-100">
                    {search}
                  </span>
                  <X
                    className="w-4 h-4 text-gray-400 hover:text-red-500 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      const updated = recentSearches.filter((_, i) => i !== index);
                      setRecentSearches(updated);
                      localStorage.setItem('recentSearches', JSON.stringify(updated));
                    }}
                  />
                </button>
              ))}
            </div>
          )}

          {/* Trending Searches */}
          {query.length < 2 && trending && trending.length > 0 && (
            <div className="py-2 border-t border-gray-200 dark:border-gray-700">
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                <TrendingUp className="w-3 h-3 inline mr-1" />
                Trending
              </div>
              {trending.map((product, index) => (
                <button
                  key={product._id}
                  onClick={() => handleSelectProduct(product)}
                  className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="w-10 h-10 flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
                    {product.images && product.images[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        📦
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left overflow-hidden">
                    <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                      {product.title}
                    </p>
                  </div>
                  <TrendingUp className="w-4 h-4 text-green-500 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

SearchAutocomplete.displayName = 'SearchAutocomplete';

export default SearchAutocomplete;
