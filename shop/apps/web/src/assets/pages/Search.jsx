import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import ProductCard from '@/components/product/ProductCard';
import CustomSelect from '@/components/common/CustomSelect';
import QuickView from '@/components/product/QuickView';
import Pagination from '@/components/common/Pagination';
import Spinner from '@/components/common/Spinner';
import SponsoredLabel from '@/components/ads/SponsoredLabel';
import AdBanner from '@/components/common/AdBanner';
import { updateMetaTags } from '@/utils/seo';
import useTranslation from '@/hooks/useTranslation';
import { ProductGridSkeleton } from '@/components/product/ProductCardSkeleton';
import AnimatedDiv from '@/components/common/AnimatedDiv';

const Search = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sponsoredAds, setSponsoredAds] = useState([]);
  const [adsError, setAdsError] = useState(null);
  const [adsLoading, setAdsLoading] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);

  const view = searchParams.get('view') || 'products';
  const query = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const sort = searchParams.get('sort') || (query ? 'relevance' : '-createdAt');
  const category = searchParams.get('category') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';

  useEffect(() => {
    updateMetaTags({
      title: view === 'categories' ? 'Shop by Category - V-Tech' : query ? `Search results for "${query}" - V-Tech` : 'Search Products - V-Tech',
      description: 'Search for products from thousands of trusted vendors',
    });
  }, [query, view]);

  // Fetch categories when view=categories
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/catalog/categories');
      return response.data.data;
    },
    enabled: view === 'categories',
  });

  // ✅ Adapted for mock API: /catalog/products? filters
  const { data, isLoading } = useQuery({
    queryKey: ['search', query, page, sort, category, minPrice, maxPrice],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      params.append('page', page);
      params.append('limit', '20');
      params.append('sort', sort);
      if (category) params.append('category', category);
      if (minPrice) params.append('minPrice', minPrice);
      if (maxPrice) params.append('maxPrice', maxPrice);

      const response = await api.get(`/catalog/products?${params}`);
      // API returns { success, data, meta }
      return { items: response.data.data, total: response.data.meta.total };
    },
    enabled: view === 'products',
  });

  // Fetch sponsored ads
  useEffect(() => {
    const fetchAds = async () => {
      setAdsLoading(true);
      setAdsError(null);

      try {
        const requestPayload = {
          placement: 'search_sponsored_products', // For search page sponsored ads
          keywords: query ? [query] : ['all'], // Use 'all' for no search query
          limit: 3,
          _ts: Date.now(), // Cache busting parameter
        };

        const response = await api.post('/ads/auction', requestPayload);

        if (response.data.data?.ads && response.data.data.ads.length > 0) {
          // Amazon-style: Filter out ads with invalid product data
          const validAds = response.data.data.ads.filter(ad => {
            const hasProduct = ad.product && (ad.product._id || ad.product.id);
            const hasPrice = ad.product?.price != null && !isNaN(ad.product.price);
            const hasName = ad.product?.name;

            if (!hasProduct || !hasPrice || !hasName) {
              return false;
            }
            return true;
          });

          setSponsoredAds(validAds);

          // Track impressions only for valid ads
          validAds.forEach((ad) => {
            api.post('/ads/events', {
              campaignId: ad.campaignId,
              creativeId: ad.creativeId,
              event: 'impression',
              url: window.location.href,
            }).catch(() => {}); // Silent fail for impression tracking
          });
        } else {
          setSponsoredAds([]);
        }
      } catch (error) {
        console.error('❌ [AD DEBUG] Auction Error:', error);
        console.error('❌ [AD DEBUG] Error Response:', error.response?.data);
        setAdsError(error.message);
        setSponsoredAds([]); // Clear ads on error
      } finally {
        setAdsLoading(false);
      }
    };

    fetchAds();
  }, [query, page]);

  const handleAdClick = (ad) => {
    api.post('/ads/events', {
      campaignId: ad.campaignId,
      creativeId: ad.creativeId,
      event: 'click',
      url: window.location.href,
    });
  };

  const handleSortChange = (newSort) => {
    const params = new URLSearchParams(searchParams);
    params.set('sort', newSort);
    params.set('page', '1');
    setSearchParams(params);
  };

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage);
    setSearchParams(params);
    window.scrollTo(0, 0);
  };

  const handleFilterChange = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1'); // Reset to first page on filter change
    setSearchParams(params);
  };

  const handleClearFilters = () => {
    const params = new URLSearchParams();
    if (query) params.set('q', query); // Keep search query
    params.set('sort', '-createdAt'); // Reset to default sort
    setSearchParams(params);
  };

  const handleQuickView = (product) => {
    setQuickViewProduct(product);
    setIsQuickViewOpen(true);
  };

  const handleCloseQuickView = () => {
    setIsQuickViewOpen(false);
    setTimeout(() => setQuickViewProduct(null), 300); // Clear after animation
  };

  const products = data?.items || [];
  const totalPages = Math.ceil((data?.total || 0) / 20);

  // IDs of products already shown in main results (to exclude from related)
  const mainProductIds = useMemo(
    () => products.map(p => p._id || p.id).filter(Boolean).join(','),
    [products]
  );

  // Fetch related products from same categories — Amazon-style "Related to your search"
  const { data: relatedProducts } = useQuery({
    queryKey: ['search-related', query, mainProductIds],
    queryFn: async () => {
      const response = await api.get(
        `/catalog/search-related?q=${encodeURIComponent(query)}&limit=8&exclude=${mainProductIds}`
      );
      return response.data.data || [];
    },
    enabled: !!query && !isLoading,
    staleTime: 60 * 1000,
  });

  // If view is categories, show category grid
  if (view === 'categories') {
    return (
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Shop by Category</h1>
          <p className="text-gray-700">Browse all product categories</p>
        </div>

        {categoriesLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : categoriesData?.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {categoriesData.map((cat, index) => (
              <AnimatedDiv key={cat.slug} animation="fadeInUp" delay={index * 0.08} duration={0.4}>
              <Link
                to={`/category/${cat.slug}`}
                className="group block"
              >
                <div className="bg-white rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-200 hover:-translate-y-1">
                  <div className="aspect-square overflow-hidden bg-gray-50 flex items-center justify-center p-4">
                    {cat.image ? (
                      <img src={cat.image} alt={cat.name} className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                    ) : (
                      <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    )}
                  </div>
                  <div className="p-3 text-center">
                    <h3 className="font-semibold text-sm text-gray-900 group-hover:text-primary-600 transition-colors">{cat.name}</h3>
                  </div>
                </div>
              </Link>
              </AnimatedDiv>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No categories available</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-[50px]">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 max-w-screen-2xl pb-12">
      {/* Ad Banner - Top of Search */}
      <AdBanner placement="search_top" position="top" className="mb-6 fade-in" />

      {/* Header with Sort */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {query ? `Search results for "${query}"` : 'All Products'}
            </h1>
            <p className="text-gray-700 mt-1">
              {data?.total || 0} products found
            </p>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">Sort by:</label>
            <CustomSelect
              value={sort}
              onChange={(value) => handleSortChange(value)}
              options={[
                ...(query ? [{ value: 'relevance', label: 'Most Relevant' }] : []),
                { value: '-createdAt', label: 'Newest First' },
                { value: 'price', label: 'Price: Low to High' },
                { value: '-price', label: 'Price: High to Low' },
                { value: '-rating', label: 'Highest Rated' },
                { value: '-sold', label: 'Best Selling' },
              ]}
              placeholder="Sort by"
              className="w-44"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Results */}
        <div className="flex-1">
          {isLoading ? (
            <ProductGridSkeleton count={12} />
          ) : (
            <>
              {/* Combined Products (Sponsored + Regular) - Amazon Style */}
              {(() => {
                // Combine sponsored ads and regular products in single array
                const combinedProducts = [
                  ...sponsoredAds.slice(0, 3).map((ad) => ({
                    ...ad.product,
                    title: ad.product?.name || ad.product?.title,
                    images: ad.bannerImage
                      ? [ad.bannerImage, ...(ad.product?.images || [])]
                      : ad.bannerAsset?.imageUrl
                      ? [ad.bannerAsset.imageUrl, ...(ad.product?.images || [])]
                      : (ad.product?.images || []),
                    _isSponsored: true,
                    _adData: ad, // Keep ad data for click tracking
                  })),
                  ...products
                ];

                if (combinedProducts.length === 0) {
                  return (
                    <div className="text-center py-12">
                      <svg
                        className="w-16 h-16 mx-auto text-gray-400 mb-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                      <h3 className="text-xl font-semibold mb-2">No products found</h3>
                      <p className="text-gray-700">
                        Try adjusting your filters or search query
                      </p>
                    </div>
                  );
                }

                return (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
                      {combinedProducts.map((product, index) => (
                        <div key={product._isSponsored ? product._adData.creativeId : (product.id ?? product._id)} className="relative stagger-grid-item" style={{ animationDelay: `${index * 0.07}s` }}>
                          <ProductCard
                            product={{ _id: product._id ?? product.id, ...product }}
                            onClick={product._isSponsored ? () => handleAdClick(product._adData) : undefined}
                            onQuickView={handleQuickView}
                          />
                          {product._isSponsored && (
                            <div className="absolute top-2 left-2 z-10">
                              <SponsoredLabel />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="mt-8">
                        <Pagination
                          currentPage={page}
                          totalPages={totalPages}
                          onPageChange={handlePageChange}
                        />
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          )}
        </div>
      </div>

      {/* Related Products — Amazon-style "Related to your search" */}
      {query && relatedProducts?.length > 0 && (
        <div className="mt-10 border-t border-gray-200 pt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Related to your search</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
            {relatedProducts.map((product, index) => (
              <div key={product._id || product.id} className="stagger-grid-item" style={{ animationDelay: `${index * 0.07}s` }}>
                <ProductCard
                  product={product}
                  onQuickView={handleQuickView}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick View Modal */}
      <QuickView
        product={quickViewProduct}
        isOpen={isQuickViewOpen}
        onClose={handleCloseQuickView}
      />
      </div>
    </div>
  );
};

export default Search;
