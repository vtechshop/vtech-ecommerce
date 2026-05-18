// FILE: apps/web/src/pages/dashboard/vendor/Products.jsx
import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Pagination from '@/components/common/Pagination';
import Spinner from '@/components/common/Spinner';
import { formatCurrency } from '@/utils/format';
import { X, AlertCircle, ExternalLink, Plus, Edit, Trash2, ZoomIn, Upload, Search, Filter, ChevronUp, ChevronDown, Package, AlertTriangle, CheckCircle, MoreVertical, Copy, Archive, TrendingUp, Download, RefreshCw } from 'lucide-react';

// Stock level thresholds
const STOCK_THRESHOLDS = {
  OUT_OF_STOCK: 0,
  LOW: 10,
  MEDIUM: 50,
};

// Get stock status with color
const getStockStatus = (stock) => {
  if (stock === 0) return { label: 'Out of Stock', color: 'text-red-600 bg-red-50', icon: AlertTriangle };
  if (stock < STOCK_THRESHOLDS.LOW) return { label: 'Low Stock', color: 'text-orange-600 bg-orange-50', icon: AlertTriangle };
  if (stock < STOCK_THRESHOLDS.MEDIUM) return { label: 'Medium', color: 'text-yellow-600 bg-yellow-50', icon: Package };
  return { label: 'In Stock', color: 'text-green-600 bg-green-50', icon: CheckCircle };
};

const Products = () => {
  const queryClient = useQueryClient();

  // Restore page from sessionStorage on component mount
  const [page, setPage] = useState(() => {
    const savedPage = sessionStorage.getItem('vendor-products-page');
    return savedPage ? parseInt(savedPage) : 1;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success'); // 'success', 'error', 'warning'

  // Amazon-style filters and search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, published, draft
  const [stockFilter, setStockFilter] = useState('all'); // all, in-stock, low-stock, out-of-stock
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [pricePercent, setPricePercent] = useState('');
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showActionsDropdown, setShowActionsDropdown] = useState(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['vendor-products'],
    queryFn: async () => {
      const response = await api.get(`/vendors/products?page=1&limit=100`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    keepPreviousData: true, // Keep previous page data while fetching new page
  });

  // Save page to sessionStorage when it changes
  useEffect(() => {
    sessionStorage.setItem('vendor-products-page', page.toString());
  }, [page]);

  // Restore scroll position on mount
  useEffect(() => {
    const savedScroll = sessionStorage.getItem('vendor-products-scroll');
    if (savedScroll) {
      window.scrollTo(0, parseInt(savedScroll));
    }
  }, []);

  // Save scroll position when user scrolls
  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem('vendor-products-scroll', window.scrollY.toString());
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/vendors/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      setToastMessage('Product deleted successfully');
      setToastType('success');
      setShowToast(true);
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (productIds) => {
      const response = await api.post('/vendors/products/bulk-delete', { productIds });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      setSelectedProducts([]);
      setToastMessage(`${data.data.deletedCount} product(s) deleted successfully`);
      setToastType('success');
      setShowToast(true);
    },
    onError: (error) => {
      setToastMessage(error.response?.data?.error?.message || 'Failed to delete products');
      setToastType('error');
      setShowToast(true);
    },
  });

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this product?')) {
      deleteMutation.mutate(id);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = () => {
    if (selectedProducts.length === 0) return;
    if (confirm(`Delete ${selectedProducts.length} selected product(s)?`)) {
      bulkDeleteMutation.mutate(selectedProducts);
    }
  };

  const bulkPriceUpdateMutation = useMutation({
    mutationFn: async ({ productIds, percentage }) => {
      const res = await api.post('/vendors/products/bulk-price-update', { productIds, percentage });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      setSelectedProducts([]);
      setPricePercent('');
      setToastMessage(`${data.data.updated} product(s) price updated`);
      setToastType('success');
      setShowToast(true);
    },
    onError: (error) => {
      setToastMessage(error.response?.data?.error?.message || 'Failed to update prices');
      setToastType('error');
      setShowToast(true);
    },
  });

  const handleBulkPriceUpdate = () => {
    const pct = parseFloat(pricePercent);
    if (isNaN(pct) || pct === 0) { alert('Enter a valid non-zero percentage'); return; }
    const action = pct > 0 ? `increase by ${pct}%` : `decrease by ${Math.abs(pct)}%`;
    if (confirm(`${action} price for ${selectedProducts.length} selected product(s)?`)) {
      bulkPriceUpdateMutation.mutate({ productIds: selectedProducts, percentage: pct });
    }
  };

  // Handle export products
  const handleExportProducts = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (stockFilter !== 'all') params.append('stockLevel', stockFilter);

      const response = await api.get(`/vendors/products/export?${params.toString()}`, {
        responseType: 'blob',
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `products_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setToastMessage('Products exported successfully');
      setToastType('success');
      setShowToast(true);
    } catch (error) {
      setToastMessage('Failed to export products');
      setToastType('error');
      setShowToast(true);
    }
  };

  const handleAddProductClick = async () => {
    try {
      // Try to access vendor stats endpoint - if it fails, vendor is not approved
      await api.get('/vendors/dashboard/stats');
      // If successful, vendor is approved, open modal
      setIsModalOpen(true);
    } catch (error) {
      const errorCode = error.response?.data?.error?.code;
      const kycStatus = error.response?.data?.error?.kycStatus;

      if (errorCode === 'KYC_REQUIRED') {
        setToastMessage('Please complete your vendor profile and KYC verification first.');
        setToastType('warning');
      } else if (errorCode === 'KYC_NOT_APPROVED') {
        if (kycStatus === 'pending') {
          setToastMessage('Your KYC verification is pending approval. Please wait for admin to approve your account before adding products.');
        } else if (kycStatus === 'rejected') {
          setToastMessage('Your KYC verification was rejected. Please update your KYC documents and resubmit.');
        } else {
          setToastMessage('Please complete KYC verification before adding products.');
        }
        setToastType('warning');
      } else if (error.response?.status === 404) {
        setToastMessage('Your vendor application is pending approval. Please wait for admin to approve your account before adding products.');
        setToastType('warning');
      } else {
        setToastMessage('Unable to verify vendor status. Please try again or contact support.');
        setToastType('error');
      }
      setShowToast(true);
    }
  };

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowActionsDropdown(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const allProducts = data?.data || [];

  // Calculate stats for summary cards
  const stats = useMemo(() => {
    const total = allProducts.length;
    const published = allProducts.filter(p => p.published).length;
    const draft = allProducts.filter(p => !p.published).length;
    const outOfStock = allProducts.filter(p => p.stock === 0).length;
    const lowStock = allProducts.filter(p => p.stock > 0 && p.stock < STOCK_THRESHOLDS.LOW).length;
    const totalValue = allProducts.reduce((sum, p) => sum + (p.price * p.stock), 0);
    return { total, published, draft, outOfStock, lowStock, totalValue };
  }, [allProducts]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = [...allProducts];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.title?.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query) ||
        p.brand?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter === 'published') {
      result = result.filter(p => p.published);
    } else if (statusFilter === 'draft') {
      result = result.filter(p => !p.published);
    }

    // Stock filter
    if (stockFilter === 'in-stock') {
      result = result.filter(p => p.stock >= STOCK_THRESHOLDS.LOW);
    } else if (stockFilter === 'low-stock') {
      result = result.filter(p => p.stock > 0 && p.stock < STOCK_THRESHOLDS.LOW);
    } else if (stockFilter === 'out-of-stock') {
      result = result.filter(p => p.stock === 0);
    }

    // Sort
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'title') {
        aVal = aVal?.toLowerCase() || '';
        bVal = bVal?.toLowerCase() || '';
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });

    return result;
  }, [allProducts, searchQuery, statusFilter, stockFilter, sortField, sortOrder]);

  // Pagination for filtered results
  const itemsPerPage = 10;
  const totalFilteredPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  // Handle select all
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedProducts(paginatedProducts.map(p => p._id));
    } else {
      setSelectedProducts([]);
    }
  };

  // Handle individual select
  const handleSelectProduct = (productId) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  // Handle sort
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Sortable header component
  const SortableHeader = ({ field, children, className = '' }) => (
    <th
      className={`text-left py-3 px-4 font-semibold text-sm cursor-pointer hover:bg-blue-200 transition-colors select-none ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <span className="flex flex-col">
          <ChevronUp className={`w-3 h-3 -mb-1 ${sortField === field && sortOrder === 'asc' ? 'text-blue-700' : 'text-gray-400'}`} />
          <ChevronDown className={`w-3 h-3 ${sortField === field && sortOrder === 'desc' ? 'text-blue-700' : 'text-gray-400'}`} />
        </span>
      </div>
    </th>
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const products = paginatedProducts;
  const totalPages = totalFilteredPages;

  return (
    <div>
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
          <div className={`${
            toastType === 'success' ? 'bg-green-600' :
            toastType === 'error' ? 'bg-red-600' :
            'bg-yellow-600'
          } text-white rounded-lg shadow-2xl p-4 flex items-center gap-3 min-w-[320px] max-w-md`}>
            <div className="flex-shrink-0">
              {toastType === 'success' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{toastMessage}</p>
            </div>
            <button
              onClick={() => setShowToast(false)}
              className="flex-shrink-0 hover:bg-white/20 rounded-full p-1 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">My Products</h1>
        <div className="flex items-center gap-3">
          <button onClick={refetch} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          {allProducts.length > 0 && (
            <button
              onClick={handleExportProducts}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          )}
          <Button onClick={handleAddProductClick} variant="primary" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      {allProducts.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-sm transition-shadow">
            <p className="text-xs text-gray-500 font-medium">Total Products</p>
            <p className="text-xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-sm transition-shadow">
            <p className="text-xs text-gray-500 font-medium">Published</p>
            <p className="text-xl font-bold text-green-600">{stats.published}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-sm transition-shadow">
            <p className="text-xs text-gray-500 font-medium">Draft</p>
            <p className="text-xl font-bold text-gray-600">{stats.draft}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-sm transition-shadow cursor-pointer" onClick={() => setStockFilter('low-stock')}>
            <p className="text-xs text-gray-500 font-medium">Low Stock</p>
            <p className="text-xl font-bold text-orange-600">{stats.lowStock}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-sm transition-shadow cursor-pointer" onClick={() => setStockFilter('out-of-stock')}>
            <p className="text-xs text-gray-500 font-medium">Out of Stock</p>
            <p className="text-xl font-bold text-red-600">{stats.outOfStock}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-sm transition-shadow">
            <p className="text-xs text-gray-500 font-medium">Inventory Value</p>
            <p className="text-xl font-bold text-blue-600">{formatCurrency(stats.totalValue)}</p>
          </div>
        </div>
      )}

      {/* Low Stock Alert Banner */}
      {(stats.lowStock > 0 || stats.outOfStock > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-amber-800">
              <strong>{stats.outOfStock + stats.lowStock} products need attention:</strong>{' '}
              {stats.outOfStock > 0 && <span>{stats.outOfStock} out of stock</span>}
              {stats.outOfStock > 0 && stats.lowStock > 0 && ', '}
              {stats.lowStock > 0 && <span>{stats.lowStock} low stock</span>}
            </p>
          </div>
          <button
            onClick={() => setStockFilter(stats.outOfStock > 0 ? 'out-of-stock' : 'low-stock')}
            className="text-sm font-medium text-amber-700 hover:text-amber-900 whitespace-nowrap"
          >
            View Items →
          </button>
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, SKU, or brand..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>

          {/* Stock Filter */}
          <select
            value={stockFilter}
            onChange={(e) => { setStockFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Stock Levels</option>
            <option value="in-stock">In Stock (≥10)</option>
            <option value="low-stock">Low Stock (&lt;10)</option>
            <option value="out-of-stock">Out of Stock</option>
          </select>

          {/* Clear Filters */}
          {(searchQuery || statusFilter !== 'all' || stockFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setStockFilter('all');
                setPage(1);
              }}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Bulk Actions Bar */}
        {selectedProducts.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-gray-700">
              {selectedProducts.length} selected
            </span>
            {/* Bulk price update */}
            <div className="flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
              <TrendingUp className="w-4 h-4 text-blue-600 shrink-0" />
              <input
                type="number"
                value={pricePercent}
                onChange={(e) => setPricePercent(e.target.value)}
                placeholder="e.g. 10 or -5"
                className="w-28 text-sm border-0 bg-transparent focus:outline-none"
              />
              <span className="text-sm text-gray-600">%</span>
              <button
                onClick={handleBulkPriceUpdate}
                disabled={bulkPriceUpdateMutation.isPending}
                className="ml-1 px-2 py-0.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {bulkPriceUpdateMutation.isPending ? 'Updating...' : 'Apply'}
              </button>
            </div>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
              className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium disabled:opacity-50"
            >
              {bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete Selected'}
            </button>
            <button
              onClick={() => setSelectedProducts([])}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Results Info */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-600">
          Showing {products.length > 0 ? ((page - 1) * itemsPerPage) + 1 : 0}-{Math.min(page * itemsPerPage, filteredProducts.length)} of {filteredProducts.length} products
          {filteredProducts.length !== allProducts.length && (
            <span className="text-gray-400"> (filtered from {allProducts.length})</span>
          )}
        </p>
      </div>

      {allProducts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold mb-2 text-gray-900">No products yet</h3>
          <p className="text-gray-500 mb-6">Start by adding your first product to your store</p>
          <Button onClick={handleAddProductClick} variant="primary" className="inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Your First Product
          </Button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-blue-100 border-b">
                <tr>
                  {/* Checkbox */}
                  <th className="py-3 px-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedProducts.length === products.length && products.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <SortableHeader field="title">Product</SortableHeader>
                  <th className="text-left py-3 px-4 font-semibold text-sm">SKU</th>
                  <SortableHeader field="price">Price</SortableHeader>
                  <SortableHeader field="stock">Stock</SortableHeader>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-500">
                      <Filter className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                      <p className="font-medium">No products match your filters</p>
                      <p className="text-sm mt-1">Try adjusting your search or filter criteria</p>
                    </td>
                  </tr>
                ) : (
                  products.map((product) => {
                    const stockStatus = getStockStatus(product.stock);
                    const StockIcon = stockStatus.icon;
                    return (
                      <tr
                        key={product._id}
                        className={`border-b last:border-b-0 hover:bg-gray-50 transition-colors ${
                          selectedProducts.includes(product._id) ? 'bg-blue-50' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3 px-3">
                          <input
                            type="checkbox"
                            checked={selectedProducts.includes(product._id)}
                            onChange={() => handleSelectProduct(product._id)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        {/* Product */}
                        <td className="py-3 px-3 sm:px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                              {product.images?.[0] ? (
                                <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="w-6 h-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate max-w-[200px]" title={product.title}>
                                {product.title}
                              </p>
                              <p className="text-xs text-gray-500">{product.brand || 'No brand'}</p>
                            </div>
                          </div>
                        </td>
                        {/* SKU */}
                        <td className="py-3 px-4 text-sm font-mono text-gray-600">{product.sku || '—'}</td>
                        {/* Price */}
                        <td className="py-3 px-4">
                          <span className="font-semibold text-gray-900">{formatCurrency(product.price)}</span>
                          {product.compareAt && product.compareAt > product.price && (
                            <span className="block text-xs text-gray-400 line-through">{formatCurrency(product.compareAt)}</span>
                          )}
                        </td>
                        {/* Stock */}
                        <td className="py-3 px-3 sm:px-4">
                          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}>
                            <StockIcon className="w-3 h-3" />
                            {product.stock}
                          </div>
                        </td>
                        {/* Status */}
                        <td className="py-3 px-3 sm:px-4">
                          <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full ${
                            product.published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {product.published ? 'Published' : 'Draft'}
                          </span>
                        </td>
                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              to={`/product/${product.slug}`}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View on storefront"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => {
                                setEditingProduct(product);
                                setIsModalOpen(true);
                              }}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit product"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {/* More Actions Dropdown */}
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowActionsDropdown(showActionsDropdown === product._id ? null : product._id);
                                }}
                                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                title="More actions"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                              {showActionsDropdown === product._id && (
                                <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(product._id);
                                      setToastMessage('Product ID copied!');
                                      setToastType('success');
                                      setShowToast(true);
                                      setShowActionsDropdown(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <Copy className="w-4 h-4" />
                                    Copy ID
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Duplicate product logic could be added here
                                      setToastMessage('Duplicate feature coming soon!');
                                      setToastType('info');
                                      setShowToast(true);
                                      setShowActionsDropdown(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <Copy className="w-4 h-4" />
                                    Duplicate
                                  </button>
                                  <hr className="my-1" />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(product._id);
                                      setShowActionsDropdown(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}

      {/* Add/Edit Product Modal */}
      {isModalOpen && (
        <ProductFormModal
          product={editingProduct}
          onClose={() => {
            setIsModalOpen(false);
            setEditingProduct(null);
          }}
          onSave={() => {
            queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
            setIsModalOpen(false);
            setEditingProduct(null);
          }}
          showToast={(message, type = 'success') => {
            setToastMessage(message);
            setToastType(type);
            setShowToast(true);
          }}
        />
      )}
    </div>
  );
};

// Product Form Modal Component
const ProductFormModal = ({ product, onClose, onSave, showToast }) => {
  const [formData, setFormData] = useState({
    title: product?.title || '',
    description: product?.description || '',
    videoUrl: product?.videoUrl || '',
    price: product?.price || '',
    compareAt: product?.compareAt || '',
    stock: product?.stock || '',
    sku: product?.sku || '',
    brand: product?.brand || '',
    tags: product?.tags ? product.tags.join(', ') : '',
    published: product?.published || false,
    featured: product?.featured || false,
    hsnCode: product?.hsnCode || '',
    taxable: product?.taxable !== undefined ? product.taxable : true,
    taxRate: product?.taxRate || '',
    taxIncluded: product?.taxIncluded || false,
    categoryIds: product?.categoryIds || [],
    hasWarranty: product?.hasWarranty || false,
    warrantyDuration: product?.warranty?.duration || '',
    warrantyDurationType: product?.warranty?.durationType || 'months',
    warrantyProvider: product?.warranty?.provider || '',
    warrantyDescription: product?.warranty?.description || '',
    warrantyTerms: product?.warranty?.terms || '',
    warrantyActivationRequired: product?.warranty?.activationRequired || false,
    weight: product?.weight || '',
    shippingCharge: product?.shippingCharge || '',
    delhiveryEnabled: product?.delhiveryEnabled !== undefined ? product.delhiveryEnabled : true,
    // Zone-based shipping
    shippingZones: {
      tamilnadu: product?.shippingZones?.find(z => z.zone === 'tamilnadu')?.charge ?? '',
      south: product?.shippingZones?.find(z => z.zone === 'south')?.charge ?? '',
      north: product?.shippingZones?.find(z => z.zone === 'north')?.charge ?? '',
      east:  product?.shippingZones?.find(z => z.zone === 'east')?.charge ?? '',
      west:  product?.shippingZones?.find(z => z.zone === 'west')?.charge ?? '',
    },
    // SEO Fields
    seoTitle: product?.seo?.title || '',
    seoDescription: product?.seo?.description || '',
    seoKeywords: product?.seo?.keywords ? product.seo.keywords.join(', ') : '',
  });

  const [faqs, setFaqs] = useState(product?.faqs || []);
  const [specifications, setSpecifications] = useState(product?.specifications || []);

  const [schemaData, setSchemaData] = useState({
    schemaType: product?.structuredData?.schemaType || 'Product',
    properties: product?.structuredData?.properties || {},
    customSnippets: product?.structuredData?.customSnippets || [],
  });

  const [showSchemaSection, setShowSchemaSection] = useState(false);

  // Images with alt tags: [{url: string, alt: string}]
  const [images, setImages] = useState(() => {
    const existingImages = product?.images || [];
    const existingAlts = product?.imageAlts || [];
    return existingImages.map((url, idx) => ({
      url: typeof url === 'string' ? url : url.url,
      alt: existingAlts[idx] || (typeof url === 'object' ? url.alt : '') || ''
    }));
  });
  const [uploading, setUploading] = useState(false);

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/catalog/categories');
      return response.data.data;
    },
  });

  const categories = categoriesData || [];

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (product?._id) {
        return await api.put(`/vendors/products/${product._id}`, data);
      } else {
        return await api.post('/vendors/products', data);
      }
    },
    onSuccess: (response) => {
      const savedProduct = response?.data?.data;
      if (savedProduct) {
        showToast(`Product "${savedProduct.title}" saved successfully!`, 'success');
      } else {
        showToast('Product saved successfully!', 'success');
      }
      onSave();
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to save product';
      showToast(`Error: ${errorMessage}`, 'error');
    },
  });

  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });

    setUploading(true);
    try {
      const response = await api.post('/upload/multiple', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const uploadedImages = response?.data?.data?.map(file => ({ url: file.url, alt: '' })) || [];
      setImages([...images, ...uploadedImages]);
    } catch (error) {
      alert('Image upload failed: ' + (error.response?.data?.error?.message || error.message));
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Build warranty object
    const warranty = formData.hasWarranty ? {
      duration: formData.warrantyDuration ? parseInt(formData.warrantyDuration) : undefined,
      durationType: formData.warrantyDurationType,
      provider: formData.warrantyProvider,
      description: formData.warrantyDescription,
      terms: formData.warrantyTerms,
      activationRequired: formData.warrantyActivationRequired,
    } : undefined;

    const dataToSubmit = {
      title: formData.title,
      description: formData.description,
      videoUrl: formData.videoUrl,
      price: parseFloat(formData.price),
      compareAt: formData.compareAt ? parseFloat(formData.compareAt) : undefined,
      stock: parseInt(formData.stock),
      sku: formData.sku,
      brand: formData.brand,
      images: images.map(img => img.url), // Extract URLs only
      imageAlts: images.map(img => img.alt || ''), // Alt tags for SEO
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      published: formData.published,
      featured: formData.featured,
      hsnCode: formData.hsnCode || undefined,
      taxable: formData.taxable,
      taxRate: formData.taxRate ? parseFloat(formData.taxRate) : 0,
      taxIncluded: formData.taxIncluded,
      categoryIds: formData.categoryIds,
      hasWarranty: formData.hasWarranty,
      warranty: warranty,
      // Zone-based shipping: only include zones with a value set
      shippingZones: ['tamilnadu', 'south', 'north', 'east', 'west']
        .filter(z => formData.shippingZones[z] !== '' && formData.shippingZones[z] !== null && formData.shippingZones[z] !== undefined)
        .map(z => ({ zone: z, charge: parseFloat(formData.shippingZones[z]) })),
      weight: formData.weight ? parseFloat(formData.weight) : undefined,
      shippingCharge: formData.shippingCharge ? parseFloat(formData.shippingCharge) : 0,
      delhiveryEnabled: formData.delhiveryEnabled,
      structuredData: schemaData, // Fixed: changed from 'schema' to 'structuredData'
      // SEO Data
      seo: {
        title: formData.seoTitle || formData.title, // Fallback to product title
        description: formData.seoDescription || formData.description.substring(0, 160), // Fallback to first 160 chars
        keywords: formData.seoKeywords.split(',').map(keyword => keyword.trim()).filter(Boolean),
      },
      // FAQ Data
      faqs: faqs.filter(faq => faq.question && faq.answer), // Only include FAQs with both question and answer
      // Specifications Data
      specifications: specifications.filter(spec => spec.label && spec.value), // Only include specs with both label and value
    };

    saveMutation.mutate(dataToSubmit);
  };

  const addFaq = () => {
    setFaqs([...faqs, { question: '', answer: '' }]);
  };

  const updateFaq = (index, field, value) => {
    const updated = [...faqs];
    updated[index][field] = value;
    setFaqs(updated);
  };

  const removeFaq = (index) => {
    setFaqs(faqs.filter((_, i) => i !== index));
  };

  const addSpecification = () => {
    setSpecifications([...specifications, { label: '', value: '' }]);
  };

  const updateSpecification = (index, field, value) => {
    const updated = [...specifications];
    updated[index][field] = value;
    setSpecifications(updated);
  };

  const removeSpecification = (index) => {
    setSpecifications(specifications.filter((_, i) => i !== index));
  };

  const addCustomSnippet = () => {
    setSchemaData({
      ...schemaData,
      customSnippets: [...schemaData.customSnippets, { name: '', content: '' }],
    });
  };

  const updateCustomSnippet = (index, field, value) => {
    const updated = [...schemaData.customSnippets];
    updated[index][field] = value;
    setSchemaData({ ...schemaData, customSnippets: updated });
  };

  const removeCustomSnippet = (index) => {
    setSchemaData({
      ...schemaData,
      customSnippets: schemaData.customSnippets.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">
            {product ? 'Edit Product' : 'Add Product'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input w-full"
                required
              />
            </div>

            {/* Product Images */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Images
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="input w-full"
                disabled={uploading}
              />
              {uploading && <p className="text-sm text-gray-500 mt-1">Uploading images...</p>}
              {images.length > 0 && (
                <div className="mt-3 space-y-3">
                  {images.map((img, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="relative group flex-shrink-0">
                        <img
                          src={img.url}
                          alt={img.alt || `${formData.title || 'Product'} - Image ${idx + 1}`}
                          className="w-20 h-20 object-cover rounded border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                          title="Remove image"
                        >
                          ×
                        </button>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-medium text-gray-700">
                            Image {idx + 1} Alt Tag (SEO)
                          </label>
                          {!img.alt && formData.title && (
                            <button
                              type="button"
                              onClick={() => {
                                const suggested = `${formData.title}${formData.brand ? ` by ${formData.brand}` : ''} - Image ${idx + 1}`;
                                const updated = [...images];
                                updated[idx] = { ...updated[idx], alt: suggested.slice(0, 125) };
                                setImages(updated);
                              }}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                            >
                              Auto-generate
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={img.alt}
                          maxLength={125}
                          onChange={(e) => {
                            const updated = [...images];
                            updated[idx] = { ...updated[idx], alt: e.target.value };
                            setImages(updated);
                          }}
                          placeholder={`e.g., ${formData.title || 'Product name'} front view`}
                          className={`input w-full text-sm ${img.alt.length > 125 ? 'border-red-300 focus:ring-red-500' : ''}`}
                        />
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-gray-500">
                            Include product name, brand, color
                          </p>
                          <span className={`text-xs font-medium ${
                            img.alt.length === 0 ? 'text-gray-400' :
                            img.alt.length <= 125 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {img.alt.length}/125
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Categories */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categories
              </label>
              <select
                value={formData.categoryIds[0] || ''}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    categoryIds: e.target.value ? [e.target.value] : []
                  });
                }}
                className="input w-full"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="input w-full"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags
                <span className="text-xs text-gray-500 ml-1">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="input w-full"
                placeholder="e.g., electronics, smartphone, samsung, 5g"
              />
              <p className="text-xs text-gray-500 mt-1">
                Add tags to help customers find your product in search. Separate multiple tags with commas.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="input w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Compare At Price
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.compareAt}
                onChange={(e) => setFormData({ ...formData, compareAt: e.target.value })}
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock *</label>
              <input
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className="input w-full"
                required
              />
            </div>

            {/* GST/Tax Settings */}
            <div className="md:col-span-2 bg-blue-100 p-4 rounded-lg border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">GST/Tax Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.taxable}
                      onChange={(e) => setFormData({ ...formData, taxable: e.target.checked })}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Product is taxable</span>
                  </label>
                </div>

                {formData.taxable && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        GST/Tax Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.taxRate}
                        onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                        className="input w-full"
                        placeholder="e.g., 18 for 18% GST"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Common GST rates: 5%, 12%, 18%, 28%
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        HSN/SAC Code
                      </label>
                      <input
                        type="text"
                        value={formData.hsnCode}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setFormData({ ...formData, hsnCode: val });
                        }}
                        className="input w-full"
                        placeholder="e.g., 8509"
                        maxLength={8}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Required for GST invoices (4-8 digits)
                      </p>
                    </div>

                    <div className="flex items-center">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.taxIncluded}
                          onChange={(e) => setFormData({ ...formData, taxIncluded: e.target.checked })}
                          className="mr-2 h-4 w-4 text-blue-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">Tax included in price</span>
                      </label>
                    </div>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-700 mt-2">
                {formData.taxable && formData.taxIncluded
                  ? '✓ Tax is already included in the displayed price'
                  : formData.taxable
                  ? 'Tax will be added at checkout'
                  : 'Product price is considered tax-free'}
              </p>
            </div>

            {/* Zone-Based Shipping */}
            <div className="md:col-span-2 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Zone-Based Shipping Charges (₹)</h3>
              <p className="text-xs text-gray-500 mb-3">Set fixed delivery charges per India zone. At checkout, the highest charge across all cart products is used. Leave blank to use weight-based pricing.</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { key: 'tamilnadu', label: 'Tamil Nadu', states: 'Tamil Nadu only' },
                  { key: 'south', label: 'South India', states: 'Kerala, Karnataka, AP, Telangana' },
                  { key: 'north', label: 'North India', states: 'Delhi, UP, Punjab, Haryana, Rajasthan' },
                  { key: 'east',  label: 'East India',  states: 'WB, Bihar, Odisha, Assam, NE States' },
                  { key: 'west',  label: 'West India',  states: 'Maharashtra, Gujarat, Goa, MP' },
                ].map(({ key, label, states }) => (
                  <div key={key} className="flex flex-col border border-indigo-200 rounded-lg p-3 bg-white h-full">
                    <p className="text-xs font-semibold text-gray-700 mb-1">{label}</p>
                    <p className="text-xs text-gray-400 mb-2 flex-1">{states}</p>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="₹ amount"
                      value={formData.shippingZones[key]}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setFormData({ ...formData, shippingZones: { ...formData.shippingZones, [key]: val } });
                      }}
                      className="input w-full text-sm mt-auto"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Weight & Shipping Charge */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                className="input w-full"
                placeholder="e.g. 0.5"
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Charge (₹)</label>
              <input
                type="number"
                min="0"
                value={formData.shippingCharge}
                onChange={(e) => setFormData({ ...formData, shippingCharge: e.target.value })}
                className="input w-full"
                placeholder="e.g. 50"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center justify-between cursor-pointer bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                <div>
                  <span className="text-sm font-medium text-gray-700">Delhivery Shipping</span>
                  <p className="text-xs text-gray-500 mt-0.5">Enable Delhivery courier for this product</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, delhiveryEnabled: !formData.delhiveryEnabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${formData.delhiveryEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${formData.delhiveryEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </label>
            </div>

            <div className="md:col-span-1">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.published}
                  onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Published</span>
              </label>
            </div>

            <div className="md:col-span-1">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Featured</span>
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input w-full h-24"
                rows={4}
                required
              />
            </div>

            {/* Product Specifications Section */}
            <div className="md:col-span-2 bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    Product Specifications (Optional)
                  </h3>
                  <p className="text-xs text-gray-700 mt-1">Add technical details like weight, dimensions, material, color, power, etc.</p>
                </div>
                <button
                  type="button"
                  onClick={addSpecification}
                  className="px-3 py-1 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-sm font-medium"
                >
                  + Add Spec
                </button>
              </div>

              <div className="space-y-3">
                {specifications.length === 0 ? (
                  <div className="text-center py-6 bg-white rounded-lg border border-gray-200">
                    <p className="text-gray-500 text-sm">No specifications added yet. Click "+ Add Spec" to add product details.</p>
                    <p className="text-gray-400 text-xs mt-1">Examples: Weight, Color, Material, Power, Dimensions</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {specifications.map((spec, index) => (
                      <div key={index} className="bg-white p-3 rounded-lg border border-gray-200">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-xs font-semibold text-gray-700">Spec #{index + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeSpecification(index)}
                            className="text-red-600 hover:text-red-700 text-xs font-medium"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Label
                            </label>
                            <input
                              type="text"
                              value={spec.label}
                              onChange={(e) => updateSpecification(index, 'label', e.target.value)}
                              placeholder="e.g., Weight, Color, Material"
                              className="input w-full text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Value
                            </label>
                            <input
                              type="text"
                              value={spec.value}
                              onChange={(e) => updateSpecification(index, 'value', e.target.value)}
                              placeholder="e.g., 2.5 kg, Silver, Stainless Steel"
                              className="input w-full text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {specifications.length > 0 && (
                <p className="text-xs text-gray-700 mt-3">
                  💡 Tip: Clear specifications help customers make informed purchase decisions.
                </p>
              )}
            </div>

            {/* YouTube Video URL */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                YouTube Video URL (Optional)
              </label>
              <input
                type="text"
                value={formData.videoUrl || ''}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                className="input w-full"
                placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Add a YouTube video URL to showcase your product (will be displayed at 300px height)
              </p>
            </div>

            {/* Warranty Section */}
            <div className="md:col-span-2 bg-blue-100 p-4 rounded-lg border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Warranty Information (Optional)</h3>
              <div className="space-y-4">
                <div>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hasWarranty}
                      onChange={(e) => setFormData({ ...formData, hasWarranty: e.target.checked })}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">This product has a warranty</span>
                  </label>
                </div>

                {formData.hasWarranty && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Warranty Duration
                        </label>
                        <input
                          type="number"
                          value={formData.warrantyDuration}
                          onChange={(e) => setFormData({ ...formData, warrantyDuration: e.target.value })}
                          className="input w-full"
                          placeholder="e.g., 1, 2, 12"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Duration Type
                        </label>
                        <select
                          value={formData.warrantyDurationType}
                          onChange={(e) => setFormData({ ...formData, warrantyDurationType: e.target.value })}
                          className="input w-full"
                        >
                          <option value="months">Months</option>
                          <option value="years">Years</option>
                          <option value="lifetime">Lifetime</option>
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Warranty Provider
                        </label>
                        <input
                          type="text"
                          value={formData.warrantyProvider}
                          onChange={(e) => setFormData({ ...formData, warrantyProvider: e.target.value })}
                          className="input w-full"
                          placeholder="e.g., Manufacturer, Third-party"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Warranty Description
                        </label>
                        <textarea
                          value={formData.warrantyDescription}
                          onChange={(e) => setFormData({ ...formData, warrantyDescription: e.target.value })}
                          className="input w-full"
                          rows={2}
                          placeholder="Brief description of what's covered"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Warranty Terms & Conditions
                        </label>
                        <textarea
                          value={formData.warrantyTerms}
                          onChange={(e) => setFormData({ ...formData, warrantyTerms: e.target.value })}
                          className="input w-full"
                          rows={2}
                          placeholder="Terms and conditions"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.warrantyActivationRequired}
                            onChange={(e) => setFormData({ ...formData, warrantyActivationRequired: e.target.checked })}
                            className="mr-2 h-4 w-4 text-blue-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <span className="text-sm font-medium text-gray-700">Requires Activation</span>
                        </label>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* FAQ Section */}
            <div className="md:col-span-2 bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Frequently Asked Questions (FAQ)
                  </h3>
                  <p className="text-xs text-gray-700 mt-1">Add common questions and answers about your product</p>
                </div>
                <button
                  type="button"
                  onClick={addFaq}
                  className="px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm font-medium"
                >
                  + Add FAQ
                </button>
              </div>

              <div className="space-y-3">
                {faqs.length === 0 ? (
                  <div className="text-center py-6 bg-white rounded-lg border border-gray-200">
                    <p className="text-gray-500 text-sm">No FAQs added yet. Click "+ Add FAQ" to add common questions about your product.</p>
                  </div>
                ) : (
                  faqs.map((faq, index) => (
                    <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-700">FAQ #{index + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeFaq(index)}
                          className="text-red-600 hover:text-red-700 text-xs font-medium"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Question
                          </label>
                          <input
                            type="text"
                            value={faq.question}
                            onChange={(e) => updateFaq(index, 'question', e.target.value)}
                            placeholder="e.g., What is the product size?"
                            className="input w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Answer
                          </label>
                          <textarea
                            value={faq.answer}
                            onChange={(e) => updateFaq(index, 'answer', e.target.value)}
                            placeholder="e.g., The product measures 10 x 5 x 3 inches..."
                            rows={3}
                            className="input w-full"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {faqs.length > 0 && (
                <p className="text-xs text-gray-700 mt-3">
                  💡 Tip: FAQs help customers make informed purchase decisions and reduce support queries.
                </p>
              )}
            </div>

            {/* SEO Meta Tags Section */}
            <div className="md:col-span-2 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  SEO Settings (Search Engine Optimization)
                </h3>
                <p className="text-xs text-gray-700 mt-1">Optimize your product for Google search results</p>
              </div>

              <div className="space-y-4">
                {/* SEO Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meta Title
                    <span className="text-gray-500 font-normal ml-2">(50-60 characters recommended)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.seoTitle}
                    onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
                    placeholder={`${formData.title || 'Product title'} - V-Tech Kitchen`}
                    className="input w-full"
                    maxLength={60}
                  />
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-gray-500">Used in Google search results title</span>
                    <span className={formData.seoTitle.length > 60 ? 'text-red-600' : 'text-gray-500'}>
                      {formData.seoTitle.length}/60
                    </span>
                  </div>
                </div>

                {/* SEO Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meta Description
                    <span className="text-gray-500 font-normal ml-2">(150-160 characters recommended)</span>
                  </label>
                  <textarea
                    value={formData.seoDescription}
                    onChange={(e) => setFormData({ ...formData, seoDescription: e.target.value })}
                    placeholder="Brief description of your product that appears in search results..."
                    rows={3}
                    className="input w-full"
                    maxLength={160}
                  />
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-gray-500">Displayed under the title in search results</span>
                    <span className={formData.seoDescription.length > 160 ? 'text-red-600' : 'text-gray-500'}>
                      {formData.seoDescription.length}/160
                    </span>
                  </div>
                </div>

                {/* SEO Keywords */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Focus Keywords
                    <span className="text-gray-500 font-normal ml-2">(Comma separated)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.seoKeywords}
                    onChange={(e) => setFormData({ ...formData, seoKeywords: e.target.value })}
                    placeholder="kitchen appliances, cookware, premium utensils"
                    className="input w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Keywords your customers might search for (helps with SEO ranking)
                  </p>
                </div>

                {/* SEO Preview */}
                {(formData.seoTitle || formData.seoDescription) && (
                  <div className="bg-white border border-gray-300 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-2 font-medium">Google Search Preview:</p>
                    <div className="space-y-1">
                      <div className="text-lg text-blue-700 hover:underline cursor-pointer font-medium">
                        {formData.seoTitle || formData.title} - V-Tech Kitchen
                      </div>
                      <div className="text-xs text-green-700">
                        https://vtechkitchen.com/products/{formData.title?.toLowerCase().replace(/\s+/g, '-')}
                      </div>
                      <div className="text-sm text-gray-700">
                        {formData.seoDescription || formData.description.substring(0, 160)}
                        {formData.seoDescription?.length === 160 && '...'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Schema & Snippets Section */}
            <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Advanced SEO - Schema & Snippets (Optional)</h3>
                  <p className="text-xs text-gray-700 mt-1">Add structured data for rich search results (stars, price, etc.)</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSchemaSection(!showSchemaSection)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  {showSchemaSection ? 'Hide' : 'Show'}
                </button>
              </div>

              {showSchemaSection && (
                <div className="space-y-4 mt-4">
                  {/* Schema Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Schema Type
                    </label>
                    <select
                      value={schemaData.schemaType}
                      onChange={(e) => setSchemaData({ ...schemaData, schemaType: e.target.value, properties: {} })}
                      className="input w-full"
                    >
                      <option value="Product">Product</option>
                      <option value="Book">Book</option>
                      <option value="Movie">Movie</option>
                      <option value="MusicAlbum">Music Album</option>
                      <option value="Recipe">Recipe</option>
                      <option value="SoftwareApplication">Software Application</option>
                      <option value="VideoGame">Video Game</option>
                      <option value="Event">Event</option>
                      <option value="Course">Course</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Select the appropriate schema.org type for rich snippets</p>
                  </div>

                  {/* Schema Properties based on type */}
                  <div className="bg-blue-100 p-4 rounded border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Schema Properties</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Common properties for all types */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Brand</label>
                        <input
                          type="text"
                          placeholder="e.g., Nike, Apple"
                          value={schemaData.properties?.brand || ''}
                          onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, brand: e.target.value } })}
                          className="input w-full text-sm"
                        />
                      </div>

                      {schemaData.schemaType === 'Product' && (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Model</label>
                            <input
                              type="text"
                              placeholder="e.g., iPhone 15 Pro"
                              value={schemaData.properties?.model || ''}
                              onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, model: e.target.value } })}
                              className="input w-full text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Color</label>
                            <input
                              type="text"
                              placeholder="e.g., Black, Red"
                              value={schemaData.properties?.color || ''}
                              onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, color: e.target.value } })}
                              className="input w-full text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Material</label>
                            <input
                              type="text"
                              placeholder="e.g., Cotton, Stainless Steel"
                              value={schemaData.properties?.material || ''}
                              onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, material: e.target.value } })}
                              className="input w-full text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">GTIN/UPC/EAN</label>
                            <input
                              type="text"
                              placeholder="Global Trade Item Number"
                              value={schemaData.properties?.gtin || ''}
                              onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, gtin: e.target.value } })}
                              className="input w-full text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">MPN</label>
                            <input
                              type="text"
                              placeholder="Manufacturer Part Number"
                              value={schemaData.properties?.mpn || ''}
                              onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, mpn: e.target.value } })}
                              className="input w-full text-sm"
                            />
                          </div>
                        </>
                      )}

                      {schemaData.schemaType === 'Book' && (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Author</label>
                            <input
                              type="text"
                              placeholder="e.g., J.K. Rowling"
                              value={schemaData.properties?.author || ''}
                              onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, author: e.target.value } })}
                              className="input w-full text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">ISBN</label>
                            <input
                              type="text"
                              placeholder="e.g., 978-3-16-148410-0"
                              value={schemaData.properties?.isbn || ''}
                              onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, isbn: e.target.value } })}
                              className="input w-full text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Publisher</label>
                            <input
                              type="text"
                              placeholder="e.g., Penguin Books"
                              value={schemaData.properties?.publisher || ''}
                              onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, publisher: e.target.value } })}
                              className="input w-full text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Number of Pages</label>
                            <input
                              type="number"
                              placeholder="e.g., 320"
                              value={schemaData.properties?.numberOfPages || ''}
                              onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, numberOfPages: e.target.value } })}
                              className="input w-full text-sm"
                            />
                          </div>
                        </>
                      )}

                      {schemaData.schemaType === 'Movie' && (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Director</label>
                            <input
                              type="text"
                              placeholder="e.g., Christopher Nolan"
                              value={schemaData.properties?.director || ''}
                              onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, director: e.target.value } })}
                              className="input w-full text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Actors</label>
                            <input
                              type="text"
                              placeholder="e.g., Tom Hardy, Anne Hathaway"
                              value={schemaData.properties?.actors || ''}
                              onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, actors: e.target.value } })}
                              className="input w-full text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Duration (minutes)</label>
                            <input
                              type="number"
                              placeholder="e.g., 148"
                              value={schemaData.properties?.duration || ''}
                              onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, duration: e.target.value } })}
                              className="input w-full text-sm"
                            />
                          </div>
                        </>
                      )}

                      {schemaData.schemaType === 'MusicAlbum' && (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Artist</label>
                            <input
                              type="text"
                              placeholder="e.g., Taylor Swift"
                              value={schemaData.properties?.artist || ''}
                              onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, artist: e.target.value } })}
                              className="input w-full text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Genre</label>
                            <input
                              type="text"
                              placeholder="e.g., Pop, Rock"
                              value={schemaData.properties?.genre || ''}
                              onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, genre: e.target.value } })}
                              className="input w-full text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Number of Tracks</label>
                            <input
                              type="number"
                              placeholder="e.g., 12"
                              value={schemaData.properties?.numTracks || ''}
                              onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, numTracks: e.target.value } })}
                              className="input w-full text-sm"
                            />
                          </div>
                        </>
                      )}

                      {schemaData.schemaType === 'SoftwareApplication' && (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Operating System</label>
                            <input
                              type="text"
                              placeholder="e.g., Windows, macOS, iOS"
                              value={schemaData.properties?.operatingSystem || ''}
                              onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, operatingSystem: e.target.value } })}
                              className="input w-full text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Application Category</label>
                            <input
                              type="text"
                              placeholder="e.g., Game, Business, Education"
                              value={schemaData.properties?.applicationCategory || ''}
                              onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, applicationCategory: e.target.value } })}
                              className="input w-full text-sm"
                            />
                          </div>
                        </>
                      )}

                      {schemaData.schemaType === 'VideoGame' && (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Game Platform</label>
                            <input
                              type="text"
                              placeholder="e.g., PlayStation 5, Xbox Series X"
                              value={schemaData.properties?.gamePlatform || ''}
                              onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, gamePlatform: e.target.value } })}
                              className="input w-full text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Genre</label>
                            <input
                              type="text"
                              placeholder="e.g., Action, Adventure, RPG"
                              value={schemaData.properties?.genre || ''}
                              onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, genre: e.target.value } })}
                              className="input w-full text-sm"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Custom Snippets */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Custom Snippets
                      </label>
                      <button
                        type="button"
                        onClick={addCustomSnippet}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        + Add Snippet
                      </button>
                    </div>

                    {schemaData.customSnippets.map((snippet, index) => (
                      <div key={index} className="bg-white p-3 rounded border border-gray-200 mb-2">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 space-y-2">
                            <input
                              type="text"
                              placeholder="Snippet name (e.g., Brand, Author, ISBN)"
                              value={snippet.name}
                              onChange={(e) => updateCustomSnippet(index, 'name', e.target.value)}
                              className="input w-full text-sm"
                            />
                            <input
                              type="text"
                              placeholder="Snippet content/value"
                              value={snippet.content}
                              onChange={(e) => updateCustomSnippet(index, 'content', e.target.value)}
                              className="input w-full text-sm"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeCustomSnippet(index)}
                            className="text-red-500 hover:text-red-700 mt-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {schemaData.customSnippets.length === 0 && (
                      <p className="text-xs text-gray-500 italic">
                        No custom snippets added. Click "+ Add Snippet" to add structured data properties.
                      </p>
                    )}
                  </div>

                  <div className="bg-blue-100 p-3 rounded text-xs text-gray-700">
                    <strong>💡 Tip:</strong> Schema markup helps search engines understand your product better.
                    Common properties: Brand, Model, Color, Size, Material, Author, ISBN, etc.
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : product ? 'Update' : 'Create'} Product
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Products;