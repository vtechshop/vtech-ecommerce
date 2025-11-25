// FILE: apps/web/src/components/product/ProductFilters.jsx
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, X, Filter, Star } from 'lucide-react';
import api from '@/utils/api';
import { formatCurrency } from '@/utils/format';

const ProductFilters = ({
  searchParams,
  onFilterChange,
  onClearFilters
}) => {
  const [expandedSections, setExpandedSections] = useState({
    price: true,
    rating: true,
    categories: true,
    brands: false,
    availability: false,
  });
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [priceRange, setPriceRange] = useState({
    min: searchParams.get('minPrice') || '',
    max: searchParams.get('maxPrice') || '',
  });

  // Fetch categories for filter
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/catalog/categories');
      return response.data.data || [];
    },
  });

  // Update price range when search params change
  useEffect(() => {
    setPriceRange({
      min: searchParams.get('minPrice') || '',
      max: searchParams.get('maxPrice') || '',
    });
  }, [searchParams]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handlePriceChange = (type, value) => {
    const newRange = { ...priceRange, [type]: value };
    setPriceRange(newRange);
  };

  const applyPriceFilter = () => {
    onFilterChange('minPrice', priceRange.min);
    onFilterChange('maxPrice', priceRange.max);
  };

  const handleRatingFilter = (rating) => {
    const currentRating = searchParams.get('minRating');
    if (currentRating === rating.toString()) {
      onFilterChange('minRating', '');
    } else {
      onFilterChange('minRating', rating.toString());
    }
  };

  const handleCategoryFilter = (categorySlug) => {
    const currentCategory = searchParams.get('category');
    if (currentCategory === categorySlug) {
      onFilterChange('category', '');
    } else {
      onFilterChange('category', categorySlug);
    }
  };

  const handleAvailabilityFilter = (type) => {
    const current = searchParams.get('availability');
    if (current === type) {
      onFilterChange('availability', '');
    } else {
      onFilterChange('availability', type);
    }
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (searchParams.get('minPrice')) count++;
    if (searchParams.get('maxPrice')) count++;
    if (searchParams.get('minRating')) count++;
    if (searchParams.get('category')) count++;
    if (searchParams.get('availability')) count++;
    return count;
  };

  const activeFilters = getActiveFilterCount();
  const selectedCategory = searchParams.get('category');
  const selectedRating = searchParams.get('minRating');
  const selectedAvailability = searchParams.get('availability');

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Active Filters Count */}
      {activeFilters > 0 && (
        <div className="flex items-center justify-between pb-4 border-b dark:border-gray-700">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {activeFilters} filter{activeFilters > 1 ? 's' : ''} applied
          </span>
          <button
            onClick={onClearFilters}
            className="text-sm text-blue-600 dark:text-primary-400 hover:underline flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Clear all
          </button>
        </div>
      )}

      {/* Price Range */}
      <div className="border-b dark:border-gray-700 pb-4">
        <button
          onClick={() => toggleSection('price')}
          className="flex items-center justify-between w-full text-left"
        >
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Price Range</h3>
          {expandedSections.price ? (
            <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          )}
        </button>

        {expandedSections.price && (
          <div className="mt-4 space-y-3">
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                value={priceRange.min}
                onChange={(e) => handlePriceChange('min', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              />
              <input
                type="number"
                placeholder="Max"
                value={priceRange.max}
                onChange={(e) => handlePriceChange('max', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              />
            </div>
            <button
              onClick={applyPriceFilter}
              className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Apply
            </button>
            {/* Quick price filters */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Under ₹5,000', max: '5000' },
                { label: '₹5K - ₹10K', min: '5000', max: '10000' },
                { label: '₹10K - ₹20K', min: '10000', max: '20000' },
                { label: 'Over ₹20K', min: '20000' },
              ].map((range, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onFilterChange('minPrice', range.min || '');
                    onFilterChange('maxPrice', range.max || '');
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    searchParams.get('minPrice') === (range.min || '') &&
                    searchParams.get('maxPrice') === (range.max || '')
                      ? 'bg-primary-100 dark:bg-primary-900 text-blue-700 dark:text-primary-300 border border-blue-500 dark:border-primary-700'
                      : 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-600'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Customer Rating */}
      <div className="border-b dark:border-gray-700 pb-4">
        <button
          onClick={() => toggleSection('rating')}
          className="flex items-center justify-between w-full text-left"
        >
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Customer Rating</h3>
          {expandedSections.rating ? (
            <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          )}
        </button>

        {expandedSections.rating && (
          <div className="mt-4 space-y-2">
            {[4, 3, 2, 1].map((rating) => (
              <button
                key={rating}
                onClick={() => handleRatingFilter(rating)}
                className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedRating === rating.toString()
                    ? 'bg-primary-50 dark:bg-primary-900/30 border border-blue-500 dark:border-primary-700'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-900'
                }`}
              >
                <div className="flex items-center">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < rating
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300 dark:text-gray-700'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-gray-700 dark:text-gray-300">& Up</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Categories */}
      {categories && categories.length > 0 && (
        <div className="border-b dark:border-gray-700 pb-4">
          <button
            onClick={() => toggleSection('categories')}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Categories</h3>
            {expandedSections.categories ? (
              <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            )}
          </button>

          {expandedSections.categories && (
            <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
              {categories.slice(0, 10).map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() => handleCategoryFilter(cat.slug)}
                  className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedCategory === cat.slug
                      ? 'bg-primary-50 dark:bg-primary-900/30 border border-blue-500 dark:border-primary-700 text-blue-700 dark:text-primary-300'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span>{cat.name}</span>
                  {selectedCategory === cat.slug && (
                    <span className="w-2 h-2 bg-primary-600 dark:bg-primary-400 rounded-full"></span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Availability */}
      <div className="border-b dark:border-gray-700 pb-4">
        <button
          onClick={() => toggleSection('availability')}
          className="flex items-center justify-between w-full text-left"
        >
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Availability</h3>
          {expandedSections.availability ? (
            <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          )}
        </button>

        {expandedSections.availability && (
          <div className="mt-4 space-y-2">
            <button
              onClick={() => handleAvailabilityFilter('in-stock')}
              className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedAvailability === 'in-stock'
                  ? 'bg-primary-50 dark:bg-primary-900/30 border border-blue-500 dark:border-primary-700 text-blue-700 dark:text-primary-300'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300'
              }`}
            >
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                selectedAvailability === 'in-stock'
                  ? 'border-primary-600 dark:border-primary-400 bg-primary-600 dark:bg-primary-400'
                  : 'border-gray-300 dark:border-gray-600'
              }`}>
                {selectedAvailability === 'in-stock' && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span>In Stock</span>
            </button>
            <button
              onClick={() => handleAvailabilityFilter('on-sale')}
              className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedAvailability === 'on-sale'
                  ? 'bg-primary-50 dark:bg-primary-900/30 border border-blue-500 dark:border-primary-700 text-blue-700 dark:text-primary-300'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300'
              }`}
            >
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                selectedAvailability === 'on-sale'
                  ? 'border-primary-600 dark:border-primary-400 bg-primary-600 dark:bg-primary-400'
                  : 'border-gray-300 dark:border-gray-600'
              }`}>
                {selectedAvailability === 'on-sale' && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span>On Sale</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Filters */}
      <aside className="hidden lg:block lg:w-72 flex-shrink-0">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 sticky top-24 max-h-[calc(100vh-6rem)] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-lg text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </h2>
          </div>
          <FilterContent />
        </div>
      </aside>

      {/* Mobile Filter Button */}
      <div className="lg:hidden fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setMobileFiltersOpen(true)}
          className="flex items-center gap-2 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg font-medium"
        >
          <Filter className="w-5 h-5" />
          Filters
          {activeFilters > 0 && (
            <span className="bg-white text-blue-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {activeFilters}
            </span>
          )}
        </button>
      </div>

      {/* Mobile Filter Modal */}
      {mobileFiltersOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setMobileFiltersOpen(false)}>
          <div
            className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white dark:bg-gray-900 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b dark:border-gray-700 p-4 flex items-center justify-between z-10">
              <h2 className="font-bold text-lg text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters
              </h2>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="p-6">
              <FilterContent />
            </div>
            <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t dark:border-gray-700 p-4">
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="w-full px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium"
              >
                View Results
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductFilters;
