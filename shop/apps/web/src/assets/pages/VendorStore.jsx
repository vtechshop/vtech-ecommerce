// FILE: apps/web/src/pages/VendorStore.jsx
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import ProductCard from '@/components/product/ProductCard';
import CustomSelect from '@/components/common/CustomSelect';
import Spinner from '@/components/common/Spinner';
import { updateMetaTags, injectJSONLD } from '@/utils/seo';

const VendorStore = () => {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('items');

  const { data: vendor, isLoading: vendorLoading } = useQuery({
    queryKey: ['vendor', slug],
    queryFn: async () => {
      const response = await api.get(`/vendors/${slug}`);
      return response.data.data;
    },
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['vendor-products', slug, selectedCategory, sortBy],
    queryFn: async () => {
      let url = `/catalog/products?vendor=${slug}&limit=100`;
      if (selectedCategory !== 'all') {
        url += `&category=${selectedCategory}`;
      }
      if (sortBy === 'price-low') url += '&sort=price';
      else if (sortBy === 'price-high') url += '&sort=-price';
      else if (sortBy === 'rating') url += '&sort=-rating';
      else if (sortBy === 'popular') url += '&sort=-soldCount';
      else url += '&sort=-createdAt';

      const response = await api.get(url);
      return { products: response.data.data, total: response.data.meta?.total || 0 };
    },
    enabled: !!vendor,
  });

  // Get unique categories from products
  const categories = products?.products?.reduce((acc, product) => {
    product.categoryIds?.forEach(cat => {
      if (cat && !acc.find(c => c._id === cat._id)) {
        acc.push(cat);
      }
    });
    return acc;
  }, []) || [];

  // Filter products by search query
  const filteredProducts = products?.products?.filter(product =>
    searchQuery === '' ||
    product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  useEffect(() => {
    if (vendor) {
      updateMetaTags({
        title: `${vendor.storeName} - Shop`,
        description: vendor.description || `Shop products from ${vendor.storeName}`,
        canonical: `${window.location.origin}/vendor/${slug}`,
      });

      injectJSONLD({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        'name': vendor.storeName,
        'description': vendor.description,
        'url': `${window.location.origin}/vendor/${slug}`,
      });
    }
  }, [vendor, slug]);

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    const params = new URLSearchParams(searchParams);
    if (category === 'all') {
      params.delete('category');
    } else {
      params.set('category', category);
    }
    setSearchParams(params);
  };

  const handleSortChange = (sort) => {
    setSortBy(sort);
    const params = new URLSearchParams(searchParams);
    params.set('sort', sort);
    setSearchParams(params);
  };

  if (vendorLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Vendor not found</h1>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 md:px-6 py-8 min-h-screen">
      {/* Vendor Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
        <div className="flex items-start gap-6">
          {vendor.logo ? (
            <img
              src={vendor.logo}
              alt={vendor.storeName}
              className="w-24 h-24 rounded-full object-cover shadow-lg border-2 border-gray-100"
            />
          ) : (
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-lg">
              {vendor.storeName.charAt(0)}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{vendor.storeName}</h1>
            {vendor.description && (
              <p className="text-gray-700 mb-4">{vendor.description}</p>
            )}
            <div className="flex items-center gap-6 text-sm text-gray-700">
              {vendor.rating > 0 && (
                <div className="flex items-center gap-1">
                  <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="font-medium">{vendor.rating.toFixed(1)}</span>
                </div>
              )}
              <span>Member since {new Date(vendor.createdAt).getFullYear()}</span>
              {products?.products && (
                <span className="font-medium">{products.products.length} Products</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('items')}
            className={`px-6 py-4 font-medium transition-colors ${
              activeTab === 'items'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Items
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-6 py-4 font-medium transition-colors ${
              activeTab === 'reviews'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Reviews
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`px-6 py-4 font-medium transition-colors ${
              activeTab === 'about'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            About
          </button>
          <button
            onClick={() => setActiveTab('policies')}
            className={`px-6 py-4 font-medium transition-colors ${
              activeTab === 'policies'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Shop Policies
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'items' && (
        <>
      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Sort */}
          <div>
            <CustomSelect
              value={sortBy}
              onChange={(value) => handleSortChange(value)}
              options={[
                { value: 'newest', label: 'Newest First' },
                { value: 'popular', label: 'Most Popular' },
                { value: 'rating', label: 'Highest Rated' },
                { value: 'price-low', label: 'Price: Low to High' },
                { value: 'price-high', label: 'Price: High to Low' },
              ]}
              placeholder="Sort by"
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      {categories.length > 0 && (
        <div className="mb-6 overflow-x-auto">
          <div className="flex gap-2 min-w-max pb-2">
            <button
              onClick={() => handleCategoryChange('all')}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                selectedCategory === 'all'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              All Products
              <span className="ml-2 text-sm opacity-75">
                ({products?.products?.length || 0})
              </span>
            </button>
            {categories.map((category) => {
              const count = products?.products?.filter(p =>
                p.categoryIds?.some(c => c._id === category._id)
              ).length || 0;

              return (
                <button
                  key={category._id}
                  onClick={() => handleCategoryChange(category.slug)}
                  className={`px-6 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                    selectedCategory === category.slug
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {category.name}
                  <span className="ml-2 text-sm opacity-75">({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Products Grid */}
      <div>
        {productsLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : filteredProducts.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                {selectedCategory === 'all' ? 'All Products' : categories.find(c => c.slug === selectedCategory)?.name}
              </h2>
              <span className="text-gray-700">
                {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-700">
              {searchQuery ? 'Try adjusting your search or filters' : 'This vendor has no products in this category'}
            </p>
          </div>
        )}
      </div>
        </>
      )}

      {/* Reviews Tab */}
      {activeTab === 'reviews' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-bold mb-6">Reviews</h2>
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm text-gray-700">Average item review</span>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-4 h-4 ${i < Math.floor(vendor.rating || 0) ? 'text-yellow-400' : 'text-gray-300'}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-sm text-gray-700">(28)</span>
            </div>
          </div>
          <p className="text-gray-600 text-sm">Customer reviews coming soon...</p>
        </div>
      )}

      {/* About Tab */}
      {activeTab === 'about' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex gap-12">
            {/* Left Sidebar */}
            <div className="w-48 flex-shrink-0">
              <h3 className="text-sm font-semibold mb-4">About {vendor.storeName.split(' ')[0]}</h3>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Sales</div>
                  <div className="text-2xl font-bold">{vendor.totalSales || 215}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">On platform since</div>
                  <div className="text-2xl font-bold">{new Date(vendor.createdAt).getFullYear()}</div>
                </div>
              </div>
            </div>

            {/* Right Content */}
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-6">{vendor.storeName}</h2>

              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p className="text-2xl font-serif leading-relaxed">
                  {vendor.description || `Your trusted source for quality products from ${vendor.storeName}`}
                </p>

                <p>
                  Welcome to {vendor.storeName}, your trusted marketplace for quality products. Our mission is simple: to provide our customers with the best products at competitive prices with excellent service.
                </p>

                <p>
                  We carefully curate our product selection to ensure quality and value for our customers. Every product in our store is chosen with care, focusing on reliability, functionality, and customer satisfaction.
                </p>

                <p>
                  Thank you for choosing {vendor.storeName}. We're committed to providing you with the best shopping experience possible.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shop Policies Tab */}
      {activeTab === 'policies' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="max-w-3xl">
            <h2 className="text-xl font-bold mb-2">Shop policies</h2>
            <p className="text-sm text-gray-600 mb-8">Last updated on</p>

            <div className="space-y-8">
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-3">Accepted payment methods</h3>
                <div className="flex gap-2 items-center mb-3">
                  <span className="border border-gray-300 rounded px-3 py-1.5 text-sm font-medium bg-white">VISA</span>
                  <span className="border border-gray-300 rounded px-3 py-1.5 text-sm font-medium bg-white">Mastercard</span>
                  <span className="border border-gray-300 rounded px-3 py-1.5 text-sm font-medium bg-white">UPI</span>
                  <span className="border border-gray-300 rounded px-3 py-1.5 text-sm font-medium bg-white">Razorpay</span>
                </div>
                <p className="text-sm text-gray-700">Accepts platform Gift Cards and Credits</p>
              </div>

              <div className="border-t border-gray-200 pt-8">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Returns & exchanges</h3>
                <p className="text-sm text-gray-700">
                  {vendor.policies?.returns || 'See item details for return and exchange eligibility.'}
                </p>
              </div>

              <div className="border-t border-gray-200 pt-8">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Shipping</h3>
                <p className="text-sm text-gray-700">
                  {vendor.policies?.shipping || 'Standard shipping available. Processing time varies by product.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorStore;
