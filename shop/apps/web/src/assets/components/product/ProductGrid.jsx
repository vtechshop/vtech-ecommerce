// FILE: apps/web/src/components/product/ProductGrid.jsx
import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import ProductSnippet from './ProductSnippet';
import Spinner from '@/components/common/Spinner';
import CustomSelect from '@/components/common/CustomSelect';
import AdBanner from '@/components/common/AdBanner';
import AnimatedDiv from '@/components/common/AnimatedDiv';
import { Grid, List, Filter, SortAsc } from 'lucide-react';
import { ProductGridSkeleton } from './ProductCardSkeleton';

const ProductGrid = React.memo(({
  category,
  searchTerm,
  sortBy = 'newest',
  viewMode = 'grid',
  onViewModeChange,
  onAddToCart,
  onToggleWishlist,
  onViewDetails
}) => {
  const [filters, setFilters] = useState({
    priceRange: '',
    brand: '',
    rating: '',
    availability: ''
  });

  // Memoize filter options to prevent unnecessary re-renders
  const filterOptions = useMemo(() => ({
    priceRange: filters.priceRange,
    brand: filters.brand,
    rating: filters.rating,
    availability: filters.availability
  }), [filters]);

  // Memoize query params
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (searchTerm) params.append('q', searchTerm);
    if (sortBy) params.append('sort', sortBy);
    if (filterOptions.priceRange) params.append('priceRange', filterOptions.priceRange);
    if (filterOptions.brand) params.append('brand', filterOptions.brand);
    if (filterOptions.rating) params.append('rating', filterOptions.rating);
    if (filterOptions.availability) params.append('availability', filterOptions.availability);
    return params.toString();
  }, [category, searchTerm, sortBy, filterOptions]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['products', category, searchTerm, sortBy, filterOptions],
    queryFn: async () => {
      const response = await api.get(`/catalog/products?${queryParams}`);
      return response.data;
    },
  });

  const products = data?.data || [];
  const total = data?.meta?.total || 0;

  if (isLoading) {
    return <ProductGridSkeleton count={8} />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading products</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Ad Banner - Top of Products Page */}
      <AdBanner placement="product_top" position="top" className="mb-6" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {searchTerm ? `Search results for "${searchTerm}"` : 'All Products'}
          </h2>
          <p className="text-gray-700 mt-1">
            {total} {total === 1 ? 'product' : 'products'} found
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Sort */}
          <CustomSelect
            value={sortBy}
            onChange={useCallback((value) => {
              // Sort functionality handled by parent component via onSortChange prop
            }, [])}
            options={[
              { value: 'newest', label: 'Newest' },
              { value: 'price-low', label: 'Price: Low to High' },
              { value: 'price-high', label: 'Price: High to Low' },
              { value: 'rating', label: 'Highest Rated' },
              { value: 'popular', label: 'Most Popular' },
            ]}
            placeholder="Sort by"
            className="w-40"
          />

          {/* View Mode */}
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => onViewModeChange?.('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange?.('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-700" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>
          
          <CustomSelect
            value={filters.priceRange}
            onChange={(value) => setFilters({ ...filters, priceRange: value })}
            options={[
              { value: '', label: 'All Prices' },
              { value: '0-500', label: 'Under ₹500' },
              { value: '500-1000', label: '₹500 - ₹1,000' },
              { value: '1000-2000', label: '₹1,000 - ₹2,000' },
              { value: '2000+', label: '₹2,000+' },
            ]}
            placeholder="All Prices"
            className="w-32 text-sm"
          />

          <CustomSelect
            value={filters.brand}
            onChange={(value) => setFilters({ ...filters, brand: value })}
            options={[
              { value: '', label: 'All Brands' },
              { value: 'nike', label: 'Nike' },
              { value: 'adidas', label: 'Adidas' },
              { value: 'apple', label: 'Apple' },
              { value: 'samsung', label: 'Samsung' },
            ]}
            placeholder="All Brands"
            className="w-32 text-sm"
          />

          <CustomSelect
            value={filters.rating}
            onChange={(value) => setFilters({ ...filters, rating: value })}
            options={[
              { value: '', label: 'All Ratings' },
              { value: '4', label: '4+ Stars' },
              { value: '3', label: '3+ Stars' },
              { value: '2', label: '2+ Stars' },
            ]}
            placeholder="All Ratings"
            className="w-32 text-sm"
          />

          <CustomSelect
            value={filters.availability}
            onChange={(value) => setFilters({ ...filters, availability: value })}
            options={[
              { value: '', label: 'All Items' },
              { value: 'in-stock', label: 'In Stock' },
              { value: 'low-stock', label: 'Low Stock' },
            ]}
            placeholder="All Items"
            className="w-32 text-sm"
          />

          <button
            onClick={() => setFilters({ priceRange: '', brand: '', rating: '', availability: '' })}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Products Grid with Stagger Animation */}
      {products.length > 0 ? (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-4'
        }>
          {products.map((product, index) => (
            <AnimatedDiv
              key={product._id}
              animation="fadeInUp"
              delay={index * 0.05}
              duration={0.4}
              className="product-card"
            >
              <ProductSnippet
                product={product}
                onAddToCart={onAddToCart}
                onToggleWishlist={onToggleWishlist}
                onViewDetails={onViewDetails}
              />
            </AnimatedDiv>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔍</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-700 mb-4">
            Try adjusting your search or filter criteria
          </p>
          <button
            onClick={() => {
              setFilters({ priceRange: '', brand: '', rating: '', availability: '' });
            }}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Load More */}
      {products.length > 0 && products.length < total && (
        <div className="text-center">
          <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg transition-colors">
            Load More Products
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductGrid;