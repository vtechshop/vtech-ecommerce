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
  const [reviewSort, setReviewSort] = useState('recent');
  const [showAllReviews, setShowAllReviews] = useState(false);
  // Initialize activeSection from URL hash or default to 'items'
  const [activeSection, setActiveSection] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return ['items', 'reviews', 'about', 'policies'].includes(hash) ? hash : 'items';
  });

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

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ['vendor-reviews', slug, reviewSort],
    queryFn: async () => {
      const response = await api.get(`/vendors/${slug}/reviews?limit=50&sort=${reviewSort}`);
      return response.data.data;
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

  // Scroll spy to highlight active section
  useEffect(() => {
    if (!vendor) return;

    let observerCleanup = null;
    const sections = ['items', 'reviews', 'about', 'policies'];

    const timeoutId = setTimeout(() => {
      const observerOptions = {
        root: null,
        rootMargin: '-80px 0px -80% 0px',
        threshold: 0,
      };

      const observerCallback = (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      };

      const observer = new IntersectionObserver(observerCallback, observerOptions);

      sections.forEach((sectionId) => {
        const element = document.getElementById(sectionId);
        if (element) {
          observer.observe(element);
        }
      });

      observerCleanup = () => {
        sections.forEach((sectionId) => {
          const element = document.getElementById(sectionId);
          if (element) {
            observer.unobserve(element);
          }
        });
        observer.disconnect();
      };
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      if (observerCleanup) observerCleanup();
    };
  }, [vendor]);

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
              className="w-24 h-24 rounded-2xl object-contain bg-white shadow-lg border-2 border-gray-100 p-2"
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

      {/* Navigation Links */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 sticky top-0 z-10">
        <div className="flex gap-2 p-4">
          <a
            href="#items"
            className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg ${
              activeSection === 'items'
                ? 'text-primary-600 bg-primary-50 border-b-2 border-primary-600'
                : 'text-gray-700 hover:text-primary-600 hover:bg-blue-100'
            }`}
          >
            Items
          </a>
          <a
            href="#reviews"
            className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg ${
              activeSection === 'reviews'
                ? 'text-primary-600 bg-primary-50 border-b-2 border-primary-600'
                : 'text-gray-700 hover:text-primary-600 hover:bg-blue-100'
            }`}
          >
            Reviews
          </a>
          <a
            href="#about"
            className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg ${
              activeSection === 'about'
                ? 'text-primary-600 bg-primary-50 border-b-2 border-primary-600'
                : 'text-gray-700 hover:text-primary-600 hover:bg-blue-100'
            }`}
          >
            About
          </a>
          <a
            href="#policies"
            className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg ${
              activeSection === 'policies'
                ? 'text-primary-600 bg-primary-50 border-b-2 border-primary-600'
                : 'text-gray-700 hover:text-primary-600 hover:bg-blue-100'
            }`}
          >
            Shop Policies
          </a>
        </div>
      </div>

      {/* Items Section */}
      <div id="items" className="scroll-mt-24">
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
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-blue-100'
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
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-blue-100'
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
      </div>

      {/* Reviews Section */}
      <div id="reviews" className="scroll-mt-24 mt-12">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-bold mb-6">Customer Reviews</h2>

          {reviewsLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : reviewsData?.reviews?.length > 0 ? (
            <>
              {/* Review Statistics */}
              <div className="mb-8 pb-8 border-b border-gray-200">
                <div className="flex items-start gap-8">
                  {/* Average Rating */}
                  <div className="text-center">
                    <div className="text-5xl font-bold mb-2">
                      {reviewsData.stats.averageRating.toFixed(1)}
                    </div>
                    <div className="flex items-center gap-1 mb-2 justify-center">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className={`w-5 h-5 ${i < Math.floor(reviewsData.stats.averageRating) ? 'text-yellow-400' : 'text-gray-300'}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <div className="text-sm text-gray-600">
                      {reviewsData.stats.totalReviews} reviews
                    </div>
                  </div>

                  {/* Rating Breakdown */}
                  <div className="flex-1 max-w-md">
                    {[5, 4, 3, 2, 1].map((rating) => {
                      const count = reviewsData.stats[`rating${rating}`] || 0;
                      const percentage = reviewsData.stats.totalReviews > 0
                        ? (count / reviewsData.stats.totalReviews) * 100
                        : 0;

                      return (
                        <div key={rating} className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-medium w-8">{rating} ★</span>
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-yellow-400"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Sort Options */}
              <div className="mb-6">
                <CustomSelect
                  value={reviewSort}
                  onChange={setReviewSort}
                  options={[
                    { value: 'recent', label: 'Most Recent' },
                    { value: 'rating_high', label: 'Highest Rating' },
                    { value: 'rating_low', label: 'Lowest Rating' },
                    { value: 'helpful', label: 'Most Helpful' },
                  ]}
                  placeholder="Sort reviews"
                  className="w-64"
                />
              </div>

              {/* Reviews List */}
              <div className="space-y-6">
                {(showAllReviews ? reviewsData.reviews : reviewsData.reviews.slice(0, 3)).map((review) => (
                  <div key={review._id} className="border-b border-gray-200 pb-6 last:border-0">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-medium">{review.userId?.name || 'Anonymous'}</span>
                          {review.verified && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Verified Purchase
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <svg
                                key={i}
                                className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                          <span>•</span>
                          <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {review.title && (
                      <h4 className="font-medium mb-2">{review.title}</h4>
                    )}

                    {review.comment && (
                      <p className="text-gray-700 mb-3">{review.comment}</p>
                    )}

                    {review.images && review.images.length > 0 && (
                      <div className="flex gap-2 mb-3">
                        {review.images.map((image, idx) => (
                          <img
                            key={idx}
                            src={image}
                            alt={`Review image ${idx + 1}`}
                            className="w-20 h-20 object-cover rounded border border-gray-200"
                          />
                        ))}
                      </div>
                    )}

                    {review.productId && (
                      <div className="text-sm text-gray-600 mb-3">
                        Product: <a href={`/products/${review.productId.slug}`} className="text-primary-600 hover:underline">{review.productId.title}</a>
                      </div>
                    )}

                    {review.vendorResponse && (
                      <div className="mt-4 ml-6 p-4 bg-blue-100 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-sm">Response from {vendor.storeName}</span>
                          <span className="text-xs text-gray-600">
                            {new Date(review.vendorResponse.respondedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{review.vendorResponse.text}</p>
                      </div>
                    )}

                    {(review.helpfulCount > 0 || review.unhelpfulCount > 0) && (
                      <div className="text-sm text-gray-600 mt-3">
                        {review.helpfulCount} {review.helpfulCount === 1 ? 'person' : 'people'} found this helpful
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Show More / Show Less Button */}
              {reviewsData.reviews.length > 3 && (
                <div className="mt-6 pt-6 border-t text-center">
                  <button
                    onClick={() => setShowAllReviews(!showAllReviews)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all"
                  >
                    {showAllReviews ? (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                        Show Less
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        See More Reviews ({reviewsData.reviews.length - 3} more)
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No reviews yet</h3>
              <p className="text-gray-600">Be the first to review a product from this vendor!</p>
            </div>
          )}
        </div>
      </div>

      {/* About Section */}
      <div id="about" className="scroll-mt-24 mt-12">
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
      </div>

      {/* Shop Policies Section */}
      <div id="policies" className="scroll-mt-24 mt-12">
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
      </div>
    </div>
  );
};

export default VendorStore;
