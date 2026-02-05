import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import api from '@/utils/api';
import ProductCard from '@/components/product/ProductCard';
import { ProductGridSkeleton } from '@/components/product/ProductCardSkeleton';
import FlashSaleBanner from '@/components/flash-sale/FlashSaleBanner';
import ProductRecommendations from '@/components/product/ProductRecommendations';
import SponsorAd from '@/components/ads/SponsorAd';
import useSponsorAds from '@/hooks/useSponsorAds';
import { updateMetaTags } from '@/utils/seo';
import useTranslation from '@/hooks/useTranslation';
import ThreeDCarousel from '@/components/home/ThreeDCarousel';

const Home = React.memo(() => {
  const { t } = useTranslation();
  const { user } = useSelector((state) => state.auth);

  // Sponsor ads - now using React Query (cached, no duplicate fetches)
  const { ad: bannerAd, loading: bannerLoading } = useSponsorAds('homepage_banner', {
    refreshInterval: 5 * 60 * 1000,
  });
  const { ad: leftAd, loading: leftLoading } = useSponsorAds('homepage_sidebar_left', {
    refreshInterval: 5 * 60 * 1000,
  });
  const { ad: rightAd, loading: rightLoading } = useSponsorAds('homepage_sidebar_right', {
    refreshInterval: 5 * 60 * 1000,
  });
  const { ad: middleAd, loading: middleLoading } = useSponsorAds('homepage_middle', {
    refreshInterval: 5 * 60 * 1000,
  });
  const { ad: bottomAd, loading: bottomLoading } = useSponsorAds('homepage_bottom', {
    refreshInterval: 5 * 60 * 1000,
  });

  useEffect(() => {
    updateMetaTags({
      title: 'V-Tech - Multi-Vendor Marketplace',
      description: 'Discover amazing products from trusted vendors. Free shipping on orders over ₹500.',
      canonical: window.location.origin,
      ogTitle: 'V-Tech - Multi-Vendor Marketplace',
      ogDescription: 'Discover amazing products from trusted vendors.',
      ogUrl: window.location.origin,
    });
  }, []);

  // Featured products
  const { data: featuredProducts, isLoading } = useQuery({
    queryKey: ['featured-products'],
    queryFn: async () => {
      const { data } = await api.get('/catalog/products?featured=true&limit=8');
      return data.data;
    },
    staleTime: 10 * 60 * 1000,
  });

  // Categories (shared cache with Footer)
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get('/catalog/categories?limit=6');
      return data.data;
    },
    staleTime: 30 * 60 * 1000,
  });

  // Active flash sales
  const { data: flashSales } = useQuery({
    queryKey: ['active-flash-sales'],
    queryFn: async () => {
      const { data } = await api.get('/flash-sales/active');
      return data.data;
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });

  // Carousel items from CMS
  const { data: carouselItems } = useQuery({
    queryKey: ['carousel-items'],
    queryFn: async () => {
      const { data } = await api.get('/cms/carousel');
      return data.data;
    },
    staleTime: 10 * 60 * 1000,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-200 fade-in">
        <div className="container mx-auto px-3 sm:px-4 md:px-6 py-16 max-w-screen-2xl">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-white fade-in-down">{t('home.heroTitle')}</h1>
            <p className="text-lg md:text-xl mb-6 md:mb-8 text-white leading-relaxed fade-in-down stagger-1">
              {t('home.heroDesc')}
            </p>
            <div className="flex gap-4 fade-in-down stagger-2">
              <Link
                to="/products"
                className="inline-block bg-white text-primary-600 px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-semibold text-sm sm:text-base hover:bg-blue-100 transition-all duration-300 shadow-lg btn-scale"
              >
                {t('home.startShopping')}
              </Link>
              <Link
                to="/page/about"
                className="inline-block bg-secondary-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-semibold text-sm sm:text-base hover:bg-secondary-700 transition-all duration-300 shadow-lg btn-scale"
                aria-label="Learn more about V-Tech Kitchen"
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
          {/* Left Sidebar */}
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
              <section className="mb-8">
                <h2 className="text-xl md:text-2xl font-bold mb-6">{t('home.shopByCategory')}</h2>
                <div className={`grid grid-cols-2 md:grid-cols-3 gap-4 ${
                  leftAd || rightAd ? 'lg:grid-cols-3' : 'lg:grid-cols-6'
                }`}>
                  {categories.map((category) => (
                    <Link key={category.slug} to={`/category/${category.slug}`} className="group">
                      <div className="bg-white rounded-lg overflow-hidden hover:shadow-md transition-all duration-300 border border-gray-200">
                        <div className="flex items-center justify-center py-4 px-4">
                          <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                            {category.image ? (
                              <img src={category.image} alt={category.name} className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                            ) : (
                              <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            )}
                          </div>
                        </div>
                        <div className="py-2 px-3 text-center">
                          <h3 className="font-medium text-sm text-gray-900 group-hover:text-primary-600 transition-colors">{category.name}</h3>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Featured Products - min-height prevents CLS */}
            <section className="mb-8 min-h-[500px]">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl md:text-2xl font-bold">{t('home.featuredProducts')}</h2>
                <Link to="/products?featured=true" className="text-blue-600 hover:text-blue-700 font-semibold">
                  {t('home.viewAll')}
                </Link>
              </div>

              {isLoading ? (
                <ProductGridSkeleton count={8} />
              ) : featuredProducts?.length > 0 ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                  {featuredProducts.map((p) => (
                    <div key={p._id}>
                      <ProductCard product={p} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p>{t('home.noFeaturedProducts')}</p>
                </div>
              )}
            </section>

            {/* Sponsored Ad - Middle */}
            {!middleLoading && middleAd && (
              <section className="mb-8">
                <SponsorAd ad={middleAd} variant="banner" />
              </section>
            )}

            {/* 3D Carousel - Featured Brands/Categories */}
            {carouselItems && carouselItems.length > 0 && (
              <section className="mb-8">
                <h2 className="text-xl md:text-2xl font-bold text-center mb-4">{t('home.exploreCategories') || 'Explore Our Categories'}</h2>
                <ThreeDCarousel
                  items={carouselItems.map(item => ({ ...item, id: item._id }))}
                  autoRotate={true}
                  rotateInterval={5000}
                  cardHeight={560}
                />
              </section>
            )}

            {/* Join as Vendor or Affiliate - min-height prevents CLS */}
            {(user?.role !== 'vendor' || user?.role !== 'affiliate') && (
              <section className="mb-8 min-h-[400px]">
                <h2 className="text-xl md:text-2xl font-bold text-center mb-8">{t('home.growBusiness')}</h2>
                <div className={`grid gap-6 ${
                  user?.role === 'vendor' || user?.role === 'affiliate'
                    ? 'md:grid-cols-1 max-w-2xl mx-auto'
                    : 'md:grid-cols-2'
                }`}>
                  {user?.role !== 'vendor' && (
                    <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-8 border border-primary-200 hover:shadow-xl transition-shadow">
                      <div className="flex items-center mb-4">
                        <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center mr-4">
                          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">{t('home.becomeVendor')}</h3>
                      </div>
                      <p className="text-gray-700 mb-6 leading-relaxed">{t('home.vendorDesc')}</p>
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
                        to={user ? '/dashboard/become-vendor' : '/register?role=vendor'}
                        className="inline-block w-full text-center bg-primary-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-semibold text-sm sm:text-base hover:bg-primary-700 transition-colors duration-200 shadow-md hover:shadow-lg"
                      >
                        {t('home.startSelling')}
                      </Link>
                    </div>
                  )}

                  {user?.role !== 'affiliate' && (
                    <div className="bg-gradient-to-br from-secondary-50 to-secondary-100 rounded-xl p-8 border border-secondary-200 hover:shadow-xl transition-shadow">
                      <div className="flex items-center mb-4">
                        <div className="w-12 h-12 bg-secondary-600 rounded-lg flex items-center justify-center mr-4">
                          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">{t('home.becomeAffiliate')}</h3>
                      </div>
                      <p className="text-gray-700 mb-6 leading-relaxed">{t('home.affiliateDesc')}</p>
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
                        to={user && user.role !== 'affiliate' ? '/dashboard/become-affiliate' : '/register?role=affiliate'}
                        className="inline-block w-full text-center bg-secondary-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-semibold text-sm sm:text-base hover:bg-secondary-700 transition-colors duration-200 shadow-md hover:shadow-lg"
                      >
                        {t('home.joinAffiliate')}
                      </Link>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Personalized Recommendations */}
            {user && (
              <section className="mb-8">
                <ProductRecommendations
                  type="personalized"
                  limit={8}
                  showViewAll={true}
                  viewAllLink="/products"
                />
              </section>
            )}

            {/* Trending Products */}
            <section className="mb-8">
              <ProductRecommendations
                type="trending"
                limit={8}
                showViewAll={true}
                viewAllLink="/products?sort=-sold"
              />
            </section>

            {/* Sponsored Ad - Bottom */}
            {!bottomLoading && bottomAd && (
              <section className="mb-8">
                <SponsorAd ad={bottomAd} variant="banner" />
              </section>
            )}
          </main>

          {/* Right Sidebar */}
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
