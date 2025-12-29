import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import ProductCard from '@/components/product/ProductCard';
import CustomSelect from '@/components/common/CustomSelect';
import QuickView from '@/components/product/QuickView';
import Pagination from '@/components/common/Pagination';
import Spinner from '@/components/common/Spinner';
import SponsoredLabel from '@/components/ads/SponsoredLabel';
import { updateMetaTags } from '@/utils/seo';
import useTranslation from '@/hooks/useTranslation';

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
  const sort = searchParams.get('sort') || '-createdAt';
  const category = searchParams.get('category') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';

  useEffect(() => {
    updateMetaTags({
      title: view === 'categories' ? 'Shop by Category - V-Tech Shop' : query ? `Search results for "${query}" - V-Tech Shop` : 'Search Products - V-Tech Shop',
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

  // Sponsored Ads with enhanced error handling
  useEffect(() => {
    const fetchAds = async () => {
      setAdsLoading(true);
      setAdsError(null);

      try {
        const response = await api.post('/ads/auction', {
          placement: 'search_top', // For search page sponsored ads
          keywords: query ? [query] : ['all'], // Use 'all' for no search query
          limit: 3,
          _ts: Date.now(), // Cache busting parameter
        });

        // DEBUG: Log full response structure
        console.log('[Sponsored Ads DEBUG] Full response:', response);
        console.log('[Sponsored Ads DEBUG] response.data:', response.data);
        console.log('[Sponsored Ads DEBUG] response.data.data:', response.data.data);
        console.log('[Sponsored Ads DEBUG] response.data.data.ads:', response.data.data?.ads);

        if (response.data.data?.ads && response.data.data.ads.length > 0) {
          console.log('[Sponsored Ads DEBUG] ✅ Setting ads:', response.data.data.ads);
          setSponsoredAds(response.data.data.ads);

          // Track impressions
          response.data.data.ads.forEach((ad) => {
            api.post('/ads/events', {
              campaignId: ad.campaignId,
              creativeId: ad.creativeId,
              event: 'impression',
              url: window.location.href,
            }).catch(() => {}); // Silent fail for impression tracking
          });
        } else {
          console.log('[Sponsored Ads DEBUG] ❌ No ads to display');
          console.log('[Sponsored Ads DEBUG] Reason:', {
            hasDataProperty: !!response.data.data,
            hasAdsProperty: !!response.data.data?.ads,
            adsLength: response.data.data?.ads?.length || 0,
          });
          setSponsoredAds([]);
        }
      } catch (error) {
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {categoriesData.map((cat) => (
              <Link
                key={cat.slug}
                to={`/category/${cat.slug}`}
                className="group"
              >
                <div className="bg-white rounded-lg p-8 text-center hover:shadow-xl transition-all border border-gray-200 h-full">
                  <div className="w-20 h-20 mx-auto mb-4 bg-primary-100 rounded-full flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                    <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{cat.name}</h3>
                  {cat.seo?.keywords?.length > 0 && (
                    <p className="text-sm text-gray-500">{cat.seo.keywords.slice(0, 3).join(', ')}</p>
                  )}
                </div>
              </Link>
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
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : (
            <>
              {/* Development: Ads Debug Info */}
              {import.meta.env.DEV && (
                <div className="mb-4 p-3 bg-blue-100 border border-gray-300 rounded-lg text-xs">
                  <div className="font-semibold mb-2">Sponsored Ads Debug Info:</div>
                  <div className="space-y-1">
                    <div>Placement: <span className="font-mono">search_top</span></div>
                    <div>Keywords: <span className="font-mono">{query ? `["${query}"]` : '["all"]'}</span></div>
                    <div>Ads in state: <span className="font-mono font-bold">{sponsoredAds.length}</span></div>
                    {adsLoading && <div className="text-blue-600">⏳ Loading ads...</div>}
                    {adsError && <div className="text-red-600">❌ Error: {adsError}</div>}
                    {!adsLoading && !adsError && sponsoredAds.length === 0 && (
                      <div className="text-yellow-600">⚠️ No sponsored ads loaded</div>
                    )}
                    {sponsoredAds.length > 0 && (
                      <div className="text-green-600">✅ {sponsoredAds.length} ad(s) loaded and displaying below</div>
                    )}
                  </div>
                  <div className="mt-2 text-gray-700 border-t pt-2">
                    🔍 Check browser console for detailed logs - search for: <span className="font-mono bg-white px-1">[Sponsored Ads DEBUG]</span>
                  </div>
                </div>
              )}

              {/* Sponsored Ads - Top Row */}
              {sponsoredAds.length > 0 && (
                <div className="mb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sponsoredAds.slice(0, 3).map((ad) => {
                      // Create product object with ad image if available, otherwise use product images
                      const adProduct = {
                        ...ad.product,
                        images: ad.bannerImage
                          ? [ad.bannerImage, ...(ad.product?.images || [])]
                          : ad.bannerAsset?.imageUrl
                          ? [ad.bannerAsset.imageUrl, ...(ad.product?.images || [])]
                          : (ad.product?.images || [])
                      };

                      return (
                        <div key={ad.creativeId} className="relative">
                          <ProductCard
                            product={adProduct}
                            onClick={() => handleAdClick(ad)}
                            onQuickView={handleQuickView}
                          />
                          <div className="absolute top-2 left-2">
                            <SponsoredLabel />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-b border-gray-200 my-6"></div>
                </div>
              )}

              {/* Regular Products */}
              {products.length === 0 ? (
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
              ) : (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                    {products.map((product) => (
                      <ProductCard
                        key={product.id ?? product._id}
                        product={{ _id: product._id ?? product.id, ...product }}
                        onQuickView={handleQuickView}
                      />
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
              )}
            </>
          )}
        </div>
      </div>

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
