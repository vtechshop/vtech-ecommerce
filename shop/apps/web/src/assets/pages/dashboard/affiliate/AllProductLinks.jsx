// FILE: apps/web/src/pages/dashboard/affiliate/AllProductLinks.jsx
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import {
  Copy, Check, Download, Eye, EyeOff, AlertCircle, Search, Filter,
  Package, TrendingUp, DollarSign, MousePointerClick, Star, Grid3X3,
  List, ChevronDown, ChevronUp, ExternalLink, Share2, Tag, Percent,
  SlidersHorizontal, X, ArrowUpDown, Sparkles, ShoppingBag, LayoutGrid
} from 'lucide-react';
import { useToast } from '@/components/common/ToastContainer';
import { PLACEHOLDER_IMAGE_SM, handleImageError } from '@/utils/placeholders';

// Stats Card Component
const StatsCard = ({ icon: Icon, label, value, subValue, color }) => {
  const colorClasses = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', badge: 'bg-blue-50 text-blue-600' },
    green: { bg: 'bg-green-100', text: 'text-green-600', badge: 'bg-green-50 text-green-600' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', badge: 'bg-purple-50 text-purple-600' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-600', badge: 'bg-orange-50 text-orange-600' },
  };
  const classes = colorClasses[color] || colorClasses.blue;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${classes.bg}`}>
          <Icon className={`w-5 h-5 ${classes.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xl sm:text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
        {subValue && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${classes.badge}`}>
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
};

// Product Card Component (Mobile View)
const ProductCard = ({ product, affiliateCode, affiliateData, onCopy, copiedLink }) => {
  const affiliateLink = `${window.location.origin}/product/${product.slug}?affId=${affiliateCode}`;
  const isCopied = copiedLink === product._id;
  const commissionRate = product.affiliateCommissionPercentage || affiliateData?.commissionPercentage || 5;
  const earning = (product.price * commissionRate / 100);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all">
      <div className="flex gap-3">
        {/* Product Image */}
        <div className="flex-shrink-0">
          <img
            src={product.images?.[0] || PLACEHOLDER_IMAGE_SM}
            alt={product.title}
            className="w-20 h-20 object-cover rounded-lg border border-gray-200"
            onError={(e) => handleImageError(e, PLACEHOLDER_IMAGE_SM)}
          />
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-1">{product.title}</h3>
          <p className="text-xs text-gray-500 mb-2">
            by <span className="text-blue-600">{product.vendorId?.storeName || 'Unknown'}</span>
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-lg font-bold text-gray-900">₹{product.price?.toFixed(2)}</span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              <Percent className="w-3 h-3" />
              {commissionRate}%
            </span>
            <span className="text-xs text-gray-500">≈ ₹{earning.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Link and Copy */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-gray-50 px-2 py-1.5 rounded border border-gray-200 truncate text-gray-600">
            {affiliateLink}
          </code>
          <Button
            variant={isCopied ? 'success' : 'outline'}
            size="sm"
            onClick={() => onCopy(affiliateLink, product._id)}
            className="flex-shrink-0"
          >
            {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Filter Badge Component
const FilterBadge = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
    {label}
    <button onClick={onRemove} className="hover:bg-blue-200 rounded-full p-0.5">
      <X className="w-3 h-3" />
    </button>
  </span>
);

const AllProductLinks = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [sortBy, setSortBy] = useState('default');
  const [copiedLink, setCopiedLink] = useState(null);
  const [showLinks, setShowLinks] = useState(true);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [showFilters, setShowFilters] = useState(false);
  const toast = useToast();

  // Fetch affiliate info with stats
  const { data: affiliateData, error: affiliateError } = useQuery({
    queryKey: ['affiliate-links'],
    queryFn: async () => {
      const response = await api.get('/affiliates/links');
      return response.data.data;
    },
    retry: false,
  });

  // Fetch product stats for affiliate
  const { data: productStatsData } = useQuery({
    queryKey: ['affiliate-product-stats'],
    queryFn: async () => {
      const response = await api.get('/affiliates/products/stats');
      return response.data.data;
    },
    retry: false,
  });

  // Fetch all products
  const { data: productsData, isLoading, error } = useQuery({
    queryKey: ['all-products-for-affiliate'],
    queryFn: async () => {
      const response = await api.get('/catalog/products?limit=1000&status=active');
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const affiliateCode = affiliateData?.code;
  const products = productsData || [];
  const productStats = productStatsData || {};

  // Get unique vendors and categories for filters
  const { vendors, categories } = useMemo(() => {
    const uniqueVendors = [];
    const uniqueCategories = [];
    const vendorIds = new Set();
    const categoryIds = new Set();

    products.forEach(product => {
      if (product.vendorId?._id && !vendorIds.has(product.vendorId._id)) {
        vendorIds.add(product.vendorId._id);
        uniqueVendors.push(product.vendorId);
      }
      if (product.categoryId?._id && !categoryIds.has(product.categoryId._id)) {
        categoryIds.add(product.categoryId._id);
        uniqueCategories.push(product.categoryId);
      }
    });

    return {
      vendors: uniqueVendors.sort((a, b) => (a.storeName || '').localeCompare(b.storeName || '')),
      categories: uniqueCategories.sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    };
  }, [products]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Filter by vendor
    if (vendorFilter) {
      filtered = filtered.filter(product => product.vendorId?._id === vendorFilter);
    }

    // Filter by category
    if (categoryFilter) {
      filtered = filtered.filter(product => product.categoryId?._id === categoryFilter);
    }

    // Filter by price range
    if (priceRange.min) {
      filtered = filtered.filter(product => product.price >= parseFloat(priceRange.min));
    }
    if (priceRange.max) {
      filtered = filtered.filter(product => product.price <= parseFloat(priceRange.max));
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.title?.toLowerCase().includes(query) ||
          product.slug?.toLowerCase().includes(query) ||
          product.sku?.toLowerCase().includes(query) ||
          product.vendorId?.storeName?.toLowerCase().includes(query)
      );
    }

    // Sort products
    switch (sortBy) {
      case 'price-low':
        filtered = [...filtered].sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price-high':
        filtered = [...filtered].sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'commission-high':
        filtered = [...filtered].sort((a, b) => {
          const commA = a.affiliateCommissionPercentage || affiliateData?.commissionPercentage || 5;
          const commB = b.affiliateCommissionPercentage || affiliateData?.commissionPercentage || 5;
          return commB - commA;
        });
        break;
      case 'earning-high':
        filtered = [...filtered].sort((a, b) => {
          const commA = a.affiliateCommissionPercentage || affiliateData?.commissionPercentage || 5;
          const commB = b.affiliateCommissionPercentage || affiliateData?.commissionPercentage || 5;
          return (b.price * commB) - (a.price * commA);
        });
        break;
      case 'name':
        filtered = [...filtered].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        break;
      default:
        break;
    }

    return filtered;
  }, [products, searchQuery, vendorFilter, categoryFilter, priceRange, sortBy, affiliateData]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalProducts = filteredProducts.length;
    const avgCommission = filteredProducts.reduce((acc, p) => {
      return acc + (p.affiliateCommissionPercentage || affiliateData?.commissionPercentage || 5);
    }, 0) / (totalProducts || 1);
    const totalPotentialEarning = filteredProducts.reduce((acc, p) => {
      const comm = p.affiliateCommissionPercentage || affiliateData?.commissionPercentage || 5;
      return acc + (p.price * comm / 100);
    }, 0);

    return {
      totalProducts,
      avgCommission: avgCommission.toFixed(1),
      totalPotentialEarning: totalPotentialEarning.toFixed(0),
      vendors: vendors.length,
    };
  }, [filteredProducts, affiliateData, vendors]);

  // Check if any filters are active
  const hasActiveFilters = vendorFilter || categoryFilter || priceRange.min || priceRange.max;

  // Clear all filters
  const clearFilters = () => {
    setVendorFilter('');
    setCategoryFilter('');
    setPriceRange({ min: '', max: '' });
    setSearchQuery('');
    setSortBy('default');
  };

  // Copy single link
  const handleCopyLink = (link, productId) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(productId);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopiedLink(null), 2000);
  };

  // Copy all links
  const handleCopyAllLinks = () => {
    const allLinks = filteredProducts
      .map((product) => {
        const link = `${window.location.origin}/product/${product.slug}?affId=${affiliateCode}`;
        return `${product.title}: ${link}`;
      })
      .join('\n\n');

    navigator.clipboard.writeText(allLinks);
    toast.success(`Copied ${filteredProducts.length} affiliate links!`);
  };

  // Download CSV
  const handleDownloadCSV = () => {
    const csvContent = [
      ['Product Name', 'Vendor', 'Category', 'SKU', 'Price', 'Commission %', 'Your Earning', 'Slug', 'Affiliate Link'].join(','),
      ...filteredProducts.map((product) => {
        const link = `${window.location.origin}/product/${product.slug}?affId=${affiliateCode}`;
        const commissionRate = product.affiliateCommissionPercentage || affiliateData?.commissionPercentage || 5;
        const earning = (product.price * commissionRate / 100).toFixed(2);
        return [
          `"${product.title}"`,
          `"${product.vendorId?.storeName || 'Unknown'}"`,
          `"${product.categoryId?.name || 'Uncategorized'}"`,
          product.sku || '',
          product.price || 0,
          commissionRate,
          earning,
          product.slug,
          `"${link}"`,
        ].join(',');
      }),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `affiliate-links-${affiliateCode}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded successfully!');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  // Error states
  if (affiliateError && affiliateError?.response?.status !== 404) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Unable to load affiliate data</h2>
          <p className="text-gray-600 mb-4">Something went wrong. Please try again later.</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  if (affiliateError && affiliateError?.response?.status === 404) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Setting up your affiliate profile...</h2>
          <p className="text-gray-600 mb-4">Your profile is being created. Please refresh the page.</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Products</h2>
          <p className="text-gray-600 mb-4">{error.message || 'Failed to fetch products'}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">All Product Links</h1>
          <p className="text-gray-600 text-sm mt-1">Generate affiliate links for {products.length} products</p>
        </div>
        <Link
          to="/affiliate-dashboard/links"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
        >
          ← Back to Links
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatsCard
          icon={Package}
          label="Products Available"
          value={stats.totalProducts}
          color="blue"
        />
        <StatsCard
          icon={Percent}
          label="Avg Commission"
          value={`${stats.avgCommission}%`}
          color="green"
        />
        <StatsCard
          icon={DollarSign}
          label="Max Potential"
          value={`₹${parseInt(stats.totalPotentialEarning).toLocaleString()}`}
          subValue="per sale"
          color="purple"
        />
        <StatsCard
          icon={ShoppingBag}
          label="Vendors"
          value={stats.vendors}
          color="orange"
        />
      </div>

      {/* Affiliate Code Card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-4 sm:p-5 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Tag className="w-6 h-6" />
            </div>
            <div>
              <p className="text-blue-100 text-xs font-medium">Your Affiliate Code</p>
              <code className="text-xl sm:text-2xl font-bold tracking-wider">{affiliateCode}</code>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyAllLinks}
              className="!bg-white/10 !border-white/30 !text-white hover:!bg-white/20"
            >
              <Copy className="w-4 h-4 mr-1.5" />
              Copy All ({filteredProducts.length})
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadCSV}
              className="!bg-white !text-blue-600 hover:!bg-blue-50"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search products by name, vendor, slug, or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex-1 sm:flex-none"
              >
                <SlidersHorizontal className="w-4 h-4 mr-1.5" />
                Filters
                {hasActiveFilters && (
                  <span className="ml-1.5 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                    {[vendorFilter, categoryFilter, priceRange.min, priceRange.max].filter(Boolean).length}
                  </span>
                )}
              </Button>
              <div className="hidden sm:flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2.5 ${viewMode === 'table' ? 'bg-blue-50 text-blue-600' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                  title="Table view"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2.5 border-l border-gray-300 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                  title="Grid view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Vendor Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Vendor</label>
                <select
                  value={vendorFilter}
                  onChange={(e) => setVendorFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">All Vendors</option>
                  {vendors.map((vendor) => (
                    <option key={vendor._id} value={vendor._id}>
                      {vendor.storeName || 'Unknown Vendor'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name || 'Uncategorized'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Price Range</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                    className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                    className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="default">Default</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="commission-high">Highest Commission %</option>
                  <option value="earning-high">Highest Potential Earning</option>
                </select>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
                <span className="text-xs text-gray-500">Active Filters:</span>
                {vendorFilter && (
                  <FilterBadge
                    label={vendors.find(v => v._id === vendorFilter)?.storeName || 'Vendor'}
                    onRemove={() => setVendorFilter('')}
                  />
                )}
                {categoryFilter && (
                  <FilterBadge
                    label={categories.find(c => c._id === categoryFilter)?.name || 'Category'}
                    onRemove={() => setCategoryFilter('')}
                  />
                )}
                {(priceRange.min || priceRange.max) && (
                  <FilterBadge
                    label={`₹${priceRange.min || '0'} - ₹${priceRange.max || '∞'}`}
                    onRemove={() => setPriceRange({ min: '', max: '' })}
                  />
                )}
                <button
                  onClick={clearFilters}
                  className="text-xs text-red-600 hover:text-red-700 font-medium ml-auto"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>
        )}

        {/* Results Count and View Toggle */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold text-gray-900">{filteredProducts.length}</span> of {products.length} products
          </p>
          <button
            onClick={() => setShowLinks(!showLinks)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            {showLinks ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showLinks ? 'Hide Links' : 'Show Links'}
          </button>
        </div>

        {/* Products - Mobile Grid View */}
        <div className="lg:hidden p-4">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {searchQuery || hasActiveFilters ? 'No products found matching your filters' : 'No products available'}
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  affiliateCode={affiliateCode}
                  affiliateData={affiliateData}
                  onCopy={handleCopyLink}
                  copiedLink={copiedLink}
                />
              ))}
            </div>
          )}
        </div>

        {/* Products - Desktop Table View */}
        {viewMode === 'table' ? (
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commission
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Your Earning
                  </th>
                  {showLinks && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Affiliate Link
                    </th>
                  )}
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={showLinks ? 7 : 6} className="px-4 py-12 text-center text-gray-500">
                      {searchQuery || hasActiveFilters ? 'No products found matching your filters' : 'No products available'}
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => {
                    const affiliateLink = `${window.location.origin}/product/${product.slug}?affId=${affiliateCode}`;
                    const isCopied = copiedLink === product._id;
                    const commissionRate = product.affiliateCommissionPercentage || affiliateData?.commissionPercentage || 5;
                    const earning = (product.price * commissionRate / 100);

                    return (
                      <tr key={product._id} className="hover:bg-blue-50/50 transition-colors">
                        {/* Product */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={product.images?.[0] || PLACEHOLDER_IMAGE_SM}
                              alt={product.title}
                              className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                              onError={(e) => handleImageError(e, PLACEHOLDER_IMAGE_SM)}
                            />
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 text-sm truncate max-w-[200px]">{product.title}</p>
                              <code className="text-xs text-gray-400">{product.slug}</code>
                            </div>
                          </div>
                        </td>

                        {/* Vendor */}
                        <td className="px-4 py-3">
                          <span className="text-sm text-blue-600">{product.vendorId?.storeName || 'Unknown'}</span>
                        </td>

                        {/* Price */}
                        <td className="px-4 py-3 text-right">
                          <span className="font-semibold text-gray-900">₹{product.price?.toFixed(2)}</span>
                        </td>

                        {/* Commission */}
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                            {commissionRate}%
                          </span>
                        </td>

                        {/* Earning */}
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-medium text-purple-600">₹{earning.toFixed(2)}</span>
                        </td>

                        {/* Link */}
                        {showLinks && (
                          <td className="px-4 py-3">
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 block truncate max-w-[250px]">
                              {affiliateLink}
                            </code>
                          </td>
                        )}

                        {/* Action */}
                        <td className="px-4 py-3 text-center">
                          <Button
                            variant={isCopied ? 'success' : 'outline'}
                            size="sm"
                            onClick={() => handleCopyLink(affiliateLink, product._id)}
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-4 h-4 mr-1" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4 mr-1" />
                                Copy
                              </>
                            )}
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Desktop Grid View */
          <div className="hidden lg:grid grid-cols-2 xl:grid-cols-3 gap-4 p-4">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500">
                {searchQuery || hasActiveFilters ? 'No products found matching your filters' : 'No products available'}
              </div>
            ) : (
              filteredProducts.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  affiliateCode={affiliateCode}
                  affiliateData={affiliateData}
                  onCopy={handleCopyLink}
                  copiedLink={copiedLink}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Tips Section */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Pro Tips for Maximum Earnings</h3>
            <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-700">
              <div className="flex items-start gap-2">
                <TrendingUp className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <span>Sort by <strong>"Highest Potential Earning"</strong> to find best products to promote</span>
              </div>
              <div className="flex items-start gap-2">
                <Star className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <span>Higher priced items = higher commission per sale</span>
              </div>
              <div className="flex items-start gap-2">
                <Download className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <span>Export CSV to manage links in spreadsheets or bulk upload</span>
              </div>
              <div className="flex items-start gap-2">
                <MousePointerClick className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <span>Cookie lasts 30 days - you earn on any purchase within that time</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllProductLinks;
