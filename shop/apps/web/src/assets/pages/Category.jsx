import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import ProductCard from '@/components/product/ProductCard';
import Pagination from '@/components/common/Pagination';
import Spinner from '@/components/common/Spinner';
import SponsoredLabel from '@/components/ads/SponsoredLabel';
import AdBanner from '@/components/common/AdBanner';
import { updateMetaTags, injectJSONLD } from '@/utils/seo';

const Category = () => {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sponsoredAds, setSponsoredAds] = useState([]);

  const page = parseInt(searchParams.get('page') || '1');

  // ✅ Single query for category + products
  const { data: categoryData, isLoading: categoryLoading } = useQuery({
    queryKey: ['category', slug],
    queryFn: async () => {
      const { data } = await api.get(`/catalog/categories/${slug}`);
      return data.data; // Extract data.data to get { category, items }
    },
  });

  const category = categoryData?.category;
  const products = categoryData?.items ?? [];

  // Simple client-side pagination
  const pageSize = 20;
  const start = (page - 1) * pageSize;
  const pageItems = products.slice(start, start + pageSize);
  const totalPages = Math.ceil(products.length / pageSize);

  // Ads (still points to backend if available)
  useEffect(() => {
    if (!category) return;

    // Create abort controller for cleanup
    const abortController = new AbortController();
    let isMounted = true;

    const fetchAds = async () => {
      try {
        const response = await api.post('/ads/auction', {
          placement: 'category_page',
          categories: [category.slug],
          limit: 4,
        }, { signal: abortController.signal });

        if (isMounted && response.data.data?.ads) {
          setSponsoredAds(response.data.data.ads);
          response.data.data.ads.forEach((ad) => {
            api.post('/ads/events', {
              campaignId: ad.campaignId,
              creativeId: ad.creativeId,
              event: 'impression',
              url: window.location.href,
            });
          });
        }
      } catch (err) {
        // Ignore abort errors, only log other errors in development
        if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
          // Silent fail in production
        }
      }
    };
    fetchAds();

    // Cleanup function to prevent memory leaks
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [category, page]);

  // SEO
  useEffect(() => {
    if (category) {
      updateMetaTags({
        title: `${category.name} - Shop`,
        description: category.description || `Browse ${category.name} products`,
        canonical: `${window.location.origin}/category/${slug}`,
      });
      injectJSONLD({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: window.location.origin },
          { '@type': 'ListItem', position: 2, name: category.name, item: `${window.location.origin}/category/${slug}` },
        ],
      });
    }
  }, [category, slug]);

  const handleAdClick = (ad) => {
    api.post('/ads/events', {
      campaignId: ad.campaignId,
      creativeId: ad.creativeId,
      event: 'click',
      url: window.location.href,
    });
  };

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage);
    setSearchParams(params);
    window.scrollTo(0, 0);
  };

  if (categoryLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Category not found</h1>
        <p className="text-gray-700">The category you're looking for doesn't exist.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 max-w-screen-2xl py-6">
        {/* Ad Banner - Top of Category Page */}
        <AdBanner placement="category_top_banner" position="top" className="mb-6" />

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{category.name}</h1>
          {category.description && <p className="text-gray-700 text-lg">{category.description}</p>}
          <p className="text-gray-500 mt-2">{products.length} products</p>
        </div>

        {/* Sponsored Ads */}
        {sponsoredAds.length > 0 && (
          <div className="mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sponsoredAds.map((ad) => (
                <div key={ad.creativeId} className="relative">
                  <ProductCard product={ad.product} onClick={() => handleAdClick(ad)} />
                  <div className="absolute top-2 left-2">
                    <SponsoredLabel />
                  </div>
                </div>
              ))}
            </div>
            <div className="border-b border-gray-200 my-6"></div>
          </div>
        )}

        {/* Main Content with Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Products - Main Area */}
          <div className="lg:col-span-3">
            {pageItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-700">No products found in this category.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                  {pageItems.map((p) => (
                    <ProductCard key={p.id ?? p._id} product={{ _id: p._id ?? p.id, ...p }} />
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="mt-8">
                    <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar - Ad Banner */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <AdBanner placement="category_sidebar" position="right" className="mb-6" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Category;
