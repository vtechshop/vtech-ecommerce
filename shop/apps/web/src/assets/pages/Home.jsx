import React, { useEffect, Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import api from '@/utils/api';
import ProductCard from '@/components/product/ProductCard';
import useSponsorAds from '@/hooks/useSponsorAds';
import { updateMetaTags } from '@/utils/seo';
import useTranslation from '@/hooks/useTranslation';
import ScrollReveal from '@/components/common/ScrollReveal';
import { normalizeImageUrl } from '@/utils/placeholders';

// Lazy load below-fold components for better initial load
const FlashSaleBanner = lazy(() => import('@/components/flash-sale/FlashSaleBanner'));
const ProductRecommendations = lazy(() => import('@/components/product/ProductRecommendations'));
const SponsorAd = lazy(() => import('@/components/ads/SponsorAd'));
const ThreeDCarousel = lazy(() => import('@/components/home/ThreeDCarousel'));
const HeroCarousel = lazy(() => import('@/components/home/HeroCarousel'));

// Static fallback hero shown when no carousel items are configured
const StaticHero = ({ t }) => (
  <section className="bg-gradient-to-r from-primary-600 to-primary-200">
    <div className="container mx-auto px-3 sm:px-4 md:px-6 py-16 max-w-screen-2xl">
      <div className="max-w-3xl">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-white">{t('home.heroTitle')}</h1>
        <p className="text-lg md:text-xl mb-6 md:mb-8 text-white leading-relaxed">{t('home.heroDesc')}</p>
        <div className="flex gap-4">
          <Link to="/products" className="inline-block bg-white text-primary-600 px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-semibold text-sm sm:text-base hover:bg-blue-100 transition-all duration-300 shadow-lg btn-scale">
            {t('home.startShopping')}
          </Link>
          <Link to="/page/about" className="inline-block bg-secondary-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-semibold text-sm sm:text-base hover:bg-secondary-700 transition-all duration-300 shadow-lg btn-scale" aria-label="Learn more about V-Tech Kitchen">
            {t('home.learnMore')}
          </Link>
        </div>
      </div>
    </div>
  </section>
);

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
      title: 'V-Tech Kitchen - Premium Kitchen Appliances',
      description: 'Shop premium kitchen appliances, commercial equipment & cookware at V-Tech Kitchen. Cast iron tawa, cutting machines & more. Free shipping over ₹500.',
      canonical: 'https://www.vtechkitchen.com',
      ogTitle: 'V-Tech Kitchen - Premium Kitchen Appliances',
      ogDescription: 'Shop premium kitchen appliances, commercial equipment, and cookware at V-Tech Kitchen. Free shipping on orders over ₹500.',
      ogUrl: 'https://www.vtechkitchen.com',
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

  // Hero banners (admin-uploadable via Banners Management)
  const { data: heroBanners } = useQuery({
    queryKey: ['hero-banners'],
    queryFn: async () => {
      const { data } = await api.get('/banners?platform=website');
      return data.data;
    },
    staleTime: 10 * 60 * 1000,
  });

  // Carousel items from CMS (used for ThreeDCarousel below)
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
      {/* Hero Section — dynamic carousel if banners uploaded, else static fallback */}
      {heroBanners && heroBanners.length > 0 ? (
        <Suspense fallback={
          <div className="bg-gradient-to-r from-primary-600 to-primary-200" style={{ height: 'clamp(280px, 42vw, 540px)' }} />
        }>
          <HeroCarousel items={heroBanners} fallback={<StaticHero t={t} />} />
        </Suspense>
      ) : (
        <StaticHero t={t} />
      )}

      {/* Main Content with Sidebars */}
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-8 max-w-screen-2xl">
        <div className={`grid grid-cols-1 gap-8 ${
          leftAd || rightAd
            ? 'lg:grid-cols-4'
            : 'lg:grid-cols-1'
        }`}>
          {/* Left Sidebar */}
          {!leftLoading && leftAd && (
            <Suspense fallback={null}>
              <aside className="lg:col-span-1">
                <SponsorAd ad={leftAd} variant="sidebar" />
              </aside>
            </Suspense>
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
              <Suspense fallback={<div className="mb-8 h-24 bg-gray-100 rounded-lg animate-pulse"></div>}>
                <ScrollReveal animation="fadeUp" className="mb-8">
                  {flashSales.map((sale) => (
                    <FlashSaleBanner key={sale._id} sale={sale} />
                  ))}
                </ScrollReveal>
              </Suspense>
            )}

            {/* Sponsored Banner */}
            {!bannerLoading && bannerAd && (
              <Suspense fallback={null}>
                <section className="mb-8">
                  <SponsorAd ad={bannerAd} variant="banner" />
                </section>
              </Suspense>
            )}

            {/* Categories - always render with skeleton to prevent CLS */}
            <div className="mb-8">
              <h2 className="text-xl md:text-2xl font-bold mb-6">{t('home.shopByCategory')}</h2>
              <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-3 sm:gap-4 ${
                leftAd || rightAd ? 'lg:grid-cols-3' : 'lg:grid-cols-6'
              }`}>
                {categories?.length > 0 ? (
                  categories.map((category, index) => (
                    <Link key={category.slug} to={`/category/${category.slug}`} className="group stagger-grid-item" style={{ animationDelay: `${index * 0.06}s` }}>
                      <div className="bg-white rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-200 hover:-translate-y-1">
                        <div className="flex items-center justify-center py-5 px-4">
                          <div className="w-24 h-24 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden">
                            {category.image ? (
                              <img src={normalizeImageUrl(category.image, { width: 96 })} alt={category.name} width={96} height={96} loading="lazy" decoding="async" className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                            ) : (
                              <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            )}
                          </div>
                        </div>
                        <div className="py-3 px-3 text-center bg-gray-50">
                          <h3 className="font-semibold text-sm text-gray-900 group-hover:text-primary-600 transition-colors">{category.name}</h3>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  [...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl overflow-hidden border border-gray-100 animate-pulse">
                      <div className="flex items-center justify-center py-5 px-4">
                        <div className="w-24 h-24 rounded-xl bg-gray-200"></div>
                      </div>
                      <div className="py-3 px-3 text-center bg-gray-50">
                        <div className="h-4 bg-gray-200 rounded w-20 mx-auto"></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Featured Products - contain layout to prevent CLS */}
            <ScrollReveal animation="fadeUp" delay={0.1} className="mb-8" as="section" style={{ contain: 'layout' }}>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl md:text-2xl font-bold">{t('home.featuredProducts')}</h2>
                <Link to="/products?featured=true" className="text-blue-600 hover:text-blue-700 font-semibold">
                  {t('home.viewAll')}
                </Link>
              </div>

              {/* Grid with stable layout - contain to prevent CLS propagation */}
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6" style={{ contain: 'layout style' }}>
                {isLoading ? (
                  [...Array(8)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-pulse h-full">
                      <div className="aspect-square bg-gray-200"></div>
                      <div className="p-3 sm:p-4">
                        <div className="h-3 bg-gray-200 rounded w-20 mb-2"></div>
                        <div className="mb-2">
                          <div className="h-4 bg-gray-200 rounded w-full mb-1"></div>
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        </div>
                        <div className="flex items-center gap-1 mb-3">
                          <div className="flex gap-0.5">
                            {[...Array(5)].map((_, j) => (
                              <div key={j} className="w-3 h-3 sm:w-4 sm:h-4 bg-gray-200 rounded"></div>
                            ))}
                          </div>
                          <div className="h-3 bg-gray-200 rounded w-8 ml-1"></div>
                        </div>
                        <div className="flex items-baseline gap-2 mb-3">
                          <div className="h-6 sm:h-7 bg-gray-200 rounded w-20"></div>
                          <div className="h-4 bg-gray-200 rounded w-14"></div>
                        </div>
                      </div>
                      <div className="px-3 sm:px-4 pb-3 sm:pb-4 hidden sm:block">
                        <div className="h-10 bg-gray-200 rounded-lg w-full"></div>
                      </div>
                    </div>
                  ))
                ) : featuredProducts?.length > 0 ? (
                  featuredProducts.map((p, index) => (
                    <div key={p._id} className="stagger-grid-item" style={{ animationDelay: `${index * 0.07}s` }}>
                      <ProductCard product={p} />
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12 text-gray-500">
                    <p>{t('home.noFeaturedProducts')}</p>
                  </div>
                )}
              </div>
            </ScrollReveal>

            {/* Sponsored Ad - Middle */}
            {!middleLoading && middleAd && (
              <Suspense fallback={null}>
                <section className="mb-8">
                  <SponsorAd ad={middleAd} variant="banner" />
                </section>
              </Suspense>
            )}

            {/* 3D Carousel - Featured Brands/Categories */}
            {carouselItems && carouselItems.length > 0 && (
              <Suspense fallback={<div className="mb-8 h-96 bg-gray-100 rounded-lg animate-pulse"></div>}>
                <ScrollReveal animation="scaleUp" className="mb-8">
                  <h2 className="text-xl md:text-2xl font-bold text-center mb-4">{t('home.exploreCategories') || 'Explore Our Categories'}</h2>
                  <ThreeDCarousel
                    items={carouselItems.map(item => ({ ...item, id: item._id }))}
                    autoRotate={true}
                    rotateInterval={5000}
                    cardHeight={560}
                  />
                </ScrollReveal>
              </Suspense>
            )}

            {/* Join as Vendor or Affiliate */}
            {(user?.role !== 'vendor' || user?.role !== 'affiliate') && (
              <ScrollReveal animation="fadeUp" className="mb-8" as="section">
                <h2 className="text-xl md:text-2xl font-bold text-center mb-8">{t('home.growBusiness')}</h2>
                <div className={`grid gap-6 ${
                  user?.role === 'vendor' || user?.role === 'affiliate'
                    ? 'md:grid-cols-1 max-w-2xl mx-auto'
                    : 'md:grid-cols-2'
                }`}>
                  {user?.role !== 'vendor' && (
                    <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-4 sm:p-6 md:p-8 border border-primary-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                      <div className="flex items-center mb-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-600 rounded-lg flex items-center justify-center mr-3 sm:mr-4">
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">{t('home.becomeVendor')}</h3>
                      </div>
                      <p className="text-gray-700 mb-6 leading-relaxed">{t('home.vendorDesc')}</p>
                      <ul className="space-y-2 mb-6">
                        {[t('home.easyProductMgmt'), t('home.powerfulAnalytics'), t('home.advertisingTools'), t('home.securePayment')].map((text, i) => (
                          <li key={i} className="flex items-center text-gray-700">
                            <svg className="w-5 h-5 text-green-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {text}
                          </li>
                        ))}
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
                    <div className="bg-gradient-to-br from-secondary-50 to-secondary-100 rounded-xl p-4 sm:p-6 md:p-8 border border-secondary-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                      <div className="flex items-center mb-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-secondary-600 rounded-lg flex items-center justify-center mr-3 sm:mr-4">
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">{t('home.becomeAffiliate')}</h3>
                      </div>
                      <p className="text-gray-700 mb-6 leading-relaxed">{t('home.affiliateDesc')}</p>
                      <ul className="space-y-2 mb-6">
                        {[t('home.competitiveRates'), t('home.realtimeTracking'), t('home.marketingTools'), t('home.monthlyPayout')].map((text, i) => (
                          <li key={i} className="flex items-center text-gray-700">
                            <svg className="w-5 h-5 text-green-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {text}
                          </li>
                        ))}
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
              </ScrollReveal>
            )}

            {/* Personalized Recommendations */}
            {user && (
              <Suspense fallback={<div className="mb-8 h-64 bg-gray-100 rounded-lg animate-pulse"></div>}>
                <ScrollReveal animation="fadeUp" className="mb-8">
                  <ProductRecommendations
                    type="personalized"
                    limit={8}
                    showViewAll={true}
                    viewAllLink="/products"
                  />
                </ScrollReveal>
              </Suspense>
            )}

            {/* Trending Products */}
            <Suspense fallback={<div className="mb-8 h-64 bg-gray-100 rounded-lg animate-pulse"></div>}>
              <ScrollReveal animation="fadeUp" className="mb-8">
                <ProductRecommendations
                  type="trending"
                  limit={8}
                  showViewAll={true}
                  viewAllLink="/products?sort=-sold"
                />
              </ScrollReveal>
            </Suspense>

            {/* Sponsored Ad - Bottom */}
            {!bottomLoading && bottomAd && (
              <Suspense fallback={null}>
                <section className="mb-8">
                  <SponsorAd ad={bottomAd} variant="banner" />
                </section>
              </Suspense>
            )}
          </main>

          {/* Right Sidebar */}
          {!rightLoading && rightAd && (
            <Suspense fallback={null}>
              <aside className="lg:col-span-1">
                <SponsorAd ad={rightAd} variant="sidebar" />
              </aside>
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
});

Home.displayName = 'Home';

export default Home;
