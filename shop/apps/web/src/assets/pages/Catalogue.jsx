// FILE: apps/web/src/assets/pages/Catalogue.jsx
// Public product catalogue page — optimised for sharing via WhatsApp / Instagram.
// Mobile-first: exactly 4 product cards per row on phones.
// Title, subtitle, search/filter visibility, and product source are all admin-controlled.
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/utils/api';
import { normalizeImageUrl, PLACEHOLDER_IMAGE_MD } from '@/utils/placeholders';
import Pagination from '@/components/common/Pagination';
import SEO from '@/components/common/SEO';

const DEFAULT_LIMIT = 48; // divisible by 4, 6, 8 so every row is full across all breakpoints

// ─── Compact catalogue card ─────────────────────────────────────────────────
const CatalogueCard = ({ product }) => {
  const imgSrc = normalizeImageUrl(product.images?.[0], {
    width: 200,
    quality: 'auto',
    format: 'auto',
  });

  return (
    <Link
      to={`/product/${product.slug}`}
      className="group block bg-white border border-gray-100 rounded overflow-hidden hover:border-primary-300 hover:shadow-sm transition-all duration-150"
    >
      {/* Image — consistent square container, object-contain keeps full machine visible */}
      <div className="aspect-square bg-gray-50 overflow-hidden">
        <img
          src={imgSrc}
          alt={product.seo?.title || product.title}
          width={200}
          height={200}
          className="w-full h-full object-contain group-hover:scale-[1.05] transition-transform duration-200"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.target.src = PLACEHOLDER_IMAGE_MD;
            e.target.onerror = null;
          }}
        />
      </div>
      {/* Title */}
      <div className="px-1 pt-1 pb-1.5">
        <p className="text-[10px] sm:text-[11px] leading-tight text-gray-800 line-clamp-2 text-center">
          {product.title}
        </p>
      </div>
    </Link>
  );
};

// ─── Skeleton card shown while loading ─────────────────────────────────────
const SkeletonCard = () => (
  <div className="bg-white border border-gray-100 rounded overflow-hidden">
    <div className="aspect-square bg-gray-100 animate-pulse" />
    <div className="px-1 pt-1 pb-1.5 space-y-1">
      <div className="h-2.5 bg-gray-100 rounded animate-pulse w-4/5 mx-auto" />
      <div className="h-2.5 bg-gray-100 rounded animate-pulse w-3/5 mx-auto" />
    </div>
  </div>
);

// ─── Share icon (inline SVG — no extra library) ─────────────────────────────
const ShareIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-3.5 h-3.5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

// ─── Main page ───────────────────────────────────────────────────────────────
const Catalogue = () => {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(1);
  const searchTimeoutRef = useRef(null);

  // ── Admin-controlled settings ─────────────────────────────────────────
  const { data: settings } = useQuery({
    queryKey: ['catalogue-settings'],
    queryFn: async () => {
      const { data } = await api.get('/catalogue-settings');
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const pageTitle    = settings?.title    || 'Product Catalogue';
  const pageSubtitle = settings?.subtitle || 'Commercial Kitchen & Food Processing Machines';
  const showSearch   = settings?.showSearch    !== false;
  const showCatFilter = settings?.showCategoryFilter !== false;
  const productMode  = settings?.productMode  || 'all';
  const LIMIT        = settings?.productsPerPage || DEFAULT_LIMIT;

  // In 'category' mode the admin has pre-set a default category;
  // customer can still switch via the pill row unless the filter is hidden.
  const defaultCategory = productMode === 'category' ? (settings?.categorySlug || '') : '';

  // Initialise selectedCategory from the admin-set default (once settings load)
  const settingsAppliedRef = useRef(false);
  useEffect(() => {
    if (!settings || settingsAppliedRef.current) return;
    settingsAppliedRef.current = true;
    if (settings.productMode === 'category' && settings.categorySlug) {
      setSelectedCategory(settings.categorySlug);
    }
  }, [settings]);

  // Debounce search
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchInput(value);
    clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 400);
  };

  const handleCategoryChange = (slug) => {
    setSelectedCategory(slug);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setSelectedCategory(defaultCategory);
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleShare = () => {
    const url = `${window.location.origin}/catalog`;
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(url)
        .then(() => toast.success('Catalogue link copied!'))
        .catch(() => toast.error('Could not copy link'));
    }
  };

  // ── Products query — skipped in 'manual' mode (products come from settings) ─
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['catalogue-products', debouncedSearch, selectedCategory, page, LIMIT],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('q', debouncedSearch);
      if (selectedCategory) params.append('category', selectedCategory);
      params.append('page', String(page));
      params.append('limit', String(LIMIT));
      const { data } = await api.get(`/catalog/products?${params}`);
      return {
        products: data.data || [],
        total: data.meta?.total ?? data.data?.length ?? 0,
      };
    },
    staleTime: 2 * 60 * 1000,
    enabled: productMode !== 'manual',
  });

  // ── Categories query ─────────────────────────────────────────────────────
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get('/catalog/categories');
      return data.data || [];
    },
    staleTime: 10 * 60 * 1000,
    enabled: showCatFilter,
  });

  // Resolve products + pagination based on mode
  const isManual = productMode === 'manual';
  const manualProducts = settings?.manualProducts || [];
  const products     = isManual ? manualProducts : (data?.products || []);
  const total        = isManual ? manualProducts.length : (data?.total || 0);
  const totalPages   = isManual ? 1 : Math.ceil(total / LIMIT);
  const loading      = isManual ? !settings : isLoading;
  const hasFilters   = Boolean(debouncedSearch || (selectedCategory && selectedCategory !== defaultCategory));

  return (
    <>
      <SEO
        title={`${pageTitle} — VTech Kitchen`}
        description="Browse VTech Kitchen's full range of commercial kitchen and food processing machines. Share this catalogue with customers, teams, or clients."
        url="https://www.vtechkitchen.com/catalog"
        type="website"
      />

      <div className="min-h-screen bg-gray-50">
        {/* ── Header ── */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-screen-xl mx-auto px-3 sm:px-6 py-2.5 flex items-center gap-3">
            <img
              src="/cropped-vtech-logo.webp"
              alt="VTech Kitchen"
              className="h-9 sm:h-10 w-auto object-contain shrink-0"
              width={110}
              height={98}
            />
            <div className="min-w-0 flex-1">
              <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-gray-900 leading-none uppercase">
                {pageTitle}
              </h1>
              {pageSubtitle && (
                <p className="hidden sm:block text-[10px] text-gray-500 mt-0.5 truncate">
                  {pageSubtitle}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleShare}
              aria-label="Copy catalogue link"
              className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-primary-600 border border-primary-200 rounded-lg px-2.5 py-1.5 hover:bg-primary-50 transition-colors"
            >
              <ShareIcon />
              <span className="hidden sm:inline">Share</span>
            </button>
          </div>
        </header>

        <div className="max-w-screen-xl mx-auto px-2 sm:px-4 py-3">
          {/* ── Search ── (admin-toggled) */}
          {showSearch && !isManual && (
            <div className="mb-2.5">
              <input
                type="search"
                value={searchInput}
                onChange={handleSearchChange}
                placeholder="Search machines..."
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          )}

          {/* ── Category pills ── (admin-toggled, hidden in manual mode) */}
          {showCatFilter && !isManual && categories.length > 0 && (
            <div
              className="flex gap-1.5 overflow-x-auto pb-2 mb-2.5"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <button
                type="button"
                onClick={() => handleCategoryChange('')}
                className={`shrink-0 px-2.5 py-1 text-[11px] font-medium rounded-full border transition-colors ${
                  !selectedCategory
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary-400 hover:text-primary-600'
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat._id}
                  type="button"
                  onClick={() => handleCategoryChange(cat.slug)}
                  className={`shrink-0 px-2.5 py-1 text-[11px] font-medium rounded-full border transition-colors ${
                    selectedCategory === cat.slug
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-primary-400 hover:text-primary-600'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* ── Count row ── */}
          <div className="flex items-center min-h-[1.125rem] mb-2">
            {!loading && (
              <p className="text-[11px] text-gray-400 leading-none">
                {total > 0 ? `${total} machine${total !== 1 ? 's' : ''}` : 'No products found'}
                {hasFilters && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="ml-2 text-primary-500 underline underline-offset-2"
                  >
                    Clear filters
                  </button>
                )}
              </p>
            )}
          </div>

          {/* ── Product grid ── */}
          {loading ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 xl:grid-cols-8 gap-1 sm:gap-1.5 xl:gap-2">
              {Array.from({ length: 24 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="font-medium text-gray-500">No machines found</p>
              {hasFilters && (
                <button type="button" onClick={handleClearFilters} className="mt-2 text-sm text-primary-600 underline underline-offset-2">
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className={`grid grid-cols-4 sm:grid-cols-6 xl:grid-cols-8 gap-1 sm:gap-1.5 xl:gap-2 transition-opacity duration-200 ${isFetching && !isManual ? 'opacity-60' : 'opacity-100'}`}>
              {products.map((product) => (
                <CatalogueCard key={product._id} product={product} />
              ))}
            </div>
          )}

          {/* ── Pagination ── (not used in manual mode) */}
          {!isManual && totalPages > 1 && (
            <div className="mt-6 mb-2">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Catalogue;
