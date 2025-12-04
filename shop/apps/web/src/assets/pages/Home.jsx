import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import api from '@/utils/api';
import ProductCard from '@/components/product/ProductCard';
import FlashSaleBanner from '@/components/flash-sale/FlashSaleBanner';
import ProductRecommendations from '@/components/product/ProductRecommendations';
import Spinner from '@/components/common/Spinner';
import SponsorAd from '@/components/ads/SponsorAd';
import useSponsorAds from '@/hooks/useSponsorAds';
import { updateMetaTags } from '@/utils/seo';
import useTranslation from '@/hooks/useTranslation';

// Admin settings for ad placements
const AD_PLACEMENT_SETTINGS = {
  homepage_banner: 'ads.placement.homepage_banner.enabled',
  homepage_sidebar_left: 'ads.placement.homepage_sidebar_left.enabled',
  homepage_sidebar_right: 'ads.placement.homepage_sidebar_right.enabled',
};

const Home = React.memo(() => {
  const { t } = useTranslation();
  const { user } = useSelector((state) => state.auth);

  // Use new sponsor ads hooks
  const { ad: bannerAd, loading: bannerLoading } = useSponsorAds('homepage_banner', {
    refreshInterval: 2 * 60 * 1000, // Refresh every 2 minutes
  });

  const { ad: leftAd, loading: leftLoading } = useSponsorAds('homepage_sidebar_left', {
    refreshInterval: 2 * 60 * 1000,
  });

  const { ad: rightAd, loading: rightLoading } = useSponsorAds('homepage_sidebar_right', {
    refreshInterval: 2 * 60 * 1000,
  });

  useEffect(() => {
    updateMetaTags({
      title: 'V-Tech Shop - Multi-Vendor Marketplace',
      description: 'Discover amazing products from trusted vendors. Free shipping on orders over $50.',
      canonical: window.location.origin,
      ogTitle: 'V-Tech Shop - Multi-Vendor Marketplace',
      ogDescription: 'Discover amazing products from trusted vendors.',
      ogUrl: window.location.origin,
    });
  }, []);

  // Featured products - always fetch from API for consistency
  const { data: featuredProducts, isLoading } = useQuery({
    queryKey: ['featured-products'],
    queryFn: async () => {
      const { data } = await api.get('/catalog/products?featured=true&limit=8');
      return data.data; // Return the actual data array
    },
    staleTime: 10 * 60 * 1000, // 10 minutes for featured products
  });

  // Use real API data for all environments
  const displayFeaturedProducts = featuredProducts;
  const displayIsLoading = isLoading;

  // Categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get('/catalog/categories?limit=6');
      return data.data; // Return the actual data array
    },
    staleTime: 30 * 60 * 1000, // 30 minutes for categories (static data)
  });

  // Active flash sales
  const { data: flashSales } = useQuery({
    queryKey: ['active-flash-sales'],
    queryFn: async () => {
      const { data } = await api.get('/flash-sales/active');
      return data.data; // Return the actual data array
    },
    refetchInterval: 60000, // Refetch every minute to update countdown
    staleTime: 30 * 1000, // 30 seconds for flash sales
  });


  return (
    <div className="min-h-screen bg-blue-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-200 animate-fade-in">
        <div className="container mx-auto px-3 sm:px-4 md:px-6 py-16 max-w-screen-2xl">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-white animate-fade-in-up">{t('home.heroTitle')}</h1>
            <p className="text-lg md:text-xl mb-6 md:mb-8 text-white leading-relaxed animate-fade-in-up stagger-delay-1">
              {t('home.heroDesc')}
            </p>
            <div className="flex gap-4 animate-fade-in-up stagger-delay-2">
              <Link
                to="/search"
                className="inline-block bg-white text-primary-600 px-6 py-3 rounded-lg font-semibold text-base hover:bg-gray-100 hover:scale-105 transition-all duration-300 shadow-lg transform"
              >
                {t('home.startShopping')}
              </Link>
              <Link
                to="/page/about"
                className="inline-block bg-secondary-600 text-white px-6 py-3 rounded-lg font-semibold text-base hover:bg-secondary-700 hover:scale-105 transition-all duration-300 shadow-lg transform"
              >
                {t('home.learnMore')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content with Sidebars */}
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-8 max-w-screen-2xl">
        <div className={`grid grid-cols-1 gap-8 ${
          leftAd || rightAd
            ? 'lg:grid-cols-4'
            : 'lg:grid-cols-1'
        }`}>
          {/* Left Sidebar - Only show if ad exists */}
          {!leftLoading && leftAd && (
            <aside className="lg:col-span-1">
              <SponsorAd ad={leftAd} variant="sidebar" />
            </aside>
          )}

          {/* Main Content */}
          <main className={
            leftAd && rightAd
              ? 'lg:col-span-2'
              : leftAd || rightAd
                ? 'lg:col-span-3'
                : 'lg:col-span-1'
          }>

            {/* Flash Sales */}
            {flashSales && flashSales.length > 0 && (
              <section className="mb-8">
                {flashSales.map((sale) => (
                  <FlashSaleBanner key={sale._id} sale={sale} />
                ))}
              </section>
            )}

            {/* Sponsored Banner */}
            {!bannerLoading && bannerAd && (
              <section className="mb-8">
                <SponsorAd ad={bannerAd} variant="banner" />
              </section>
            )}

            {/* Categories */}
            {categories?.length > 0 && (
              <section className="mb-8 scroll-reveal">
                <h2 className="text-xl md:text-2xl font-bold mb-8 animate-fade-in-left">{t('home.shopByCategory')}</h2>
                <div className={`grid grid-cols-2 md:grid-cols-3 gap-4 ${
                  leftAd || rightAd ? 'lg:grid-cols-3' : 'lg:grid-cols-6'
                }`}>
                  {categories.map((category, index) => (
                    <Link key={category.slug} to={`/category/${category.slug}`} className="group animate-scale-in" style={{animationDelay: `${index * 100}ms`}}>
                      <div className="bg-white rounded-lg p-6 text-center hover:shadow-xl hover:-translate-y-2 transition-all duration-300 border border-gray-200 transform">
                        <div className="w-16 h-16 mx-auto mb-3 bg-primary-100 rounded-full flex items-center justify-center group-hover:bg-primary-200 group-hover:scale-110 transition-all duration-300">
                          <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                        <h3 className="font-semibold text-sm">{category.name}</h3>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Featured Products */}
            <section className="mb-8 scroll-reveal">
              <div className="flex items-center justify-between mb-8 animate-fade-in-right">
                <h2 className="text-xl md:text-2xl font-bold">{t('home.featuredProducts')}</h2>
                <Link to="/search?featured=true" className="text-blue-600 hover:text-blue-700 font-semibold hover:scale-105 transition-transform duration-300">
                  {t('home.viewAll')}
                </Link>
              </div>

              {displayIsLoading ? (
                <div className="flex justify-center py-12 animate-fade-in">
                  <Spinner size="lg" />
                </div>
              ) : displayFeaturedProducts?.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {displayFeaturedProducts.map((p, index) => (
                    <div key={p._id} className="animate-fade-in-up" style={{animationDelay: `${index * 100}ms`}}>
                      <ProductCard product={p} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 animate-fade-in">
                  <p>{t('home.noFeaturedProducts')}</p>
                </div>
              )}
            </section>

            {/* Join as Vendor or Affiliate */}
            <section className="mb-8">
              <h2 className="text-xl md:text-2xl font-bold text-center mb-8">{t('home.growBusiness')}</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Become a Vendor */}
                <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-8 border border-primary-200 hover:shadow-xl transition-shadow">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">{t('home.becomeVendor')}</h3>
                  </div>
                  <p className="text-gray-700 mb-6 leading-relaxed">
                    {t('home.vendorDesc')}
                  </p>
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-center text-gray-700">
                      <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {t('home.easyProductMgmt')}
                    </li>
                    <li className="flex items-center text-gray-700">
                      <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {t('home.powerfulAnalytics')}
                    </li>
                    <li className="flex items-center text-gray-700">
                      <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {t('home.advertisingTools')}
                    </li>
                    <li className="flex items-center text-gray-700">
                      <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {t('home.securePayment')}
                    </li>
                  </ul>
                  <Link
                    to={user?.role === 'customer' ? '/dashboard/become-vendor' : '/register?role=vendor'}
                    className="inline-block w-full text-center bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors shadow-md"
                  >
                    {t('home.startSelling')}
                  </Link>
                </div>

                {/* Become an Affiliate */}
                <div className="bg-gradient-to-br from-secondary-50 to-secondary-100 rounded-xl p-8 border border-secondary-200 hover:shadow-xl transition-shadow">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-secondary-600 rounded-lg flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">{t('home.becomeAffiliate')}</h3>
                  </div>
                  <p className="text-gray-700 mb-6 leading-relaxed">
                    {t('home.affiliateDesc')}
                  </p>
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-center text-gray-700">
                      <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {t('home.competitiveRates')}
                    </li>
                    <li className="flex items-center text-gray-700">
                      <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {t('home.realtimeTracking')}
                    </li>
                    <li className="flex items-center text-gray-700">
                      <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {t('home.marketingTools')}
                    </li>
                    <li className="flex items-center text-gray-700">
                      <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {t('home.monthlyPayout')}
                    </li>
                  </ul>
                  <Link
                    to={user?.role === 'customer' ? '/dashboard/become-affiliate' : '/register?role=affiliate'}
                    className="inline-block w-full text-center bg-secondary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-secondary-700 transition-colors shadow-md"
                  >
                    {t('home.joinAffiliate')}
                  </Link>
                </div>
              </div>
            </section>

            {/* Personalized Recommendations */}
            {user && (
              <section className="mb-8">
                <ProductRecommendations
                  type="personalized"
                  limit={8}
                  showViewAll={true}
                  viewAllLink="/search"
                />
              </section>
            )}

            {/* Trending Products */}
            <section className="mb-8">
              <ProductRecommendations
                type="trending"
                limit={8}
                showViewAll={true}
                viewAllLink="/search?sort=-sold"
              />
            </section>
          </main>

          {/* Right Sidebar - Only show if ad exists */}
          {!rightLoading && rightAd && (
            <aside className="lg:col-span-1">
              <SponsorAd ad={rightAd} variant="sidebar" />
            </aside>
          )}
        </div>
      </div>
    </div>
  );
});

Home.displayName = 'Home';

export default Home;
