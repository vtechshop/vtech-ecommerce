// FILE: apps/web/src/pages/dashboard/admin/Inventory.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Pagination from '@/components/common/Pagination';
import Spinner from '@/components/common/Spinner';
import CustomSelect from '@/components/common/CustomSelect';
import { formatCurrency } from '@/utils/format';
import { Package, AlertTriangle, XCircle, TrendingUp, Search, X, Download, Mail, Edit2, Check, RefreshCw, CheckCircle, ChevronRight, Warehouse } from 'lucide-react';
import { useToast } from '@/components/common/ToastContainer';

const Inventory = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [stockFilter, setStockFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingStock, setEditingStock] = useState(null);
  const [newStockValue, setNewStockValue] = useState('');

  // Fetch inventory stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-inventory-stats'],
    queryFn: async () => {
      const response = await api.get('/admin/inventory/stats');
      return response.data.data;
    },
  });

  // Fetch inventory list
  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['admin-inventory', page, stockFilter, vendorFilter, categoryFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', '20');
      if (stockFilter) params.append('stockStatus', stockFilter);
      if (vendorFilter) params.append('vendorId', vendorFilter);
      if (categoryFilter) params.append('categoryId', categoryFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await api.get(`/admin/inventory?${params}`);
      return response.data;
    },
  });

  // Fetch vendors for filter
  const { data: vendorsData } = useQuery({
    queryKey: ['admin-vendors-list'],
    queryFn: async () => {
      const response = await api.get('/admin/vendors?limit=100');
      return response.data.data;
    },
  });

  // Fetch categories for filter
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/catalog/categories');
      return response.data.data;
    },
  });

  // Update stock mutation
  const updateStockMutation = useMutation({
    mutationFn: async ({ productId, stock }) => {
      await api.put(`/admin/inventory/${productId}/stock`, { stock });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['admin-inventory-stats'] });
      toast.success('Stock updated successfully');
      setEditingStock(null);
      setNewStockValue('');
    },
    onError: (error) => {
      toast.error('Failed to update stock: ' + error.message);
    },
  });

  // Send restock reminder mutation
  const sendReminderMutation = useMutation({
    mutationFn: async ({ productId, vendorId }) => {
      await api.post(`/admin/inventory/${productId}/restock-reminder`, { vendorId });
    },
    onSuccess: () => {
      toast.success('Restock reminder sent to vendor');
    },
    onError: (error) => {
      toast.error('Failed to send reminder: ' + error.message);
    },
  });

  // Export inventory
  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (stockFilter) params.append('stockStatus', stockFilter);
      if (vendorFilter) params.append('vendorId', vendorFilter);
      if (categoryFilter) params.append('categoryId', categoryFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await api.get(`/admin/inventory/export?${params}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `inventory-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Inventory exported successfully');
    } catch (error) {
      toast.error('Failed to export inventory');
    }
  };

  const handleStockUpdate = (productId) => {
    if (newStockValue !== '' && !isNaN(parseInt(newStockValue))) {
      updateStockMutation.mutate({ productId, stock: parseInt(newStockValue) });
    }
  };

  const startEditing = (productId, currentStock) => {
    setEditingStock(productId);
    setNewStockValue(currentStock.toString());
  };

  const cancelEditing = () => {
    setEditingStock(null);
    setNewStockValue('');
  };

  const getStockStatusColor = (stock, threshold) => {
    if (stock === 0) return 'text-red-600 bg-red-50 border-red-200';
    if (stock <= threshold) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (stock > threshold * 5) return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getStockStatusLabel = (stock, threshold) => {
    if (stock === 0) return 'Out of Stock';
    if (stock <= threshold) return 'Low Stock';
    if (stock > threshold * 5) return 'Overstocked';
    return 'Healthy';
  };

  const getStockStatusIcon = (stock, threshold) => {
    if (stock === 0) return XCircle;
    if (stock <= threshold) return AlertTriangle;
    if (stock > threshold * 5) return TrendingUp;
    return CheckCircle;
  };

  // Handle stats card click to filter
  const handleStatsCardClick = (filter) => {
    setStockFilter(filter);
    setPage(1);
  };

  const stats = statsData || { totalSKUs: 0, lowStock: 0, outOfStock: 0, overstocked: 0, totalUnits: 0, totalValue: 0 };
  const products = inventoryData?.data || [];
  const totalProducts = inventoryData?.meta?.total || 0;
  const totalPages = Math.ceil(totalProducts / 20);
  const alerts = inventoryData?.alerts || [];
  const needsAttention = stats.outOfStock + stats.lowStock;

  if (isLoading && !inventoryData) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Inventory Management</h1>
          <p className="text-sm text-gray-600 mt-1 hidden sm:block">
            Monitor stock levels across all vendors
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-inventory'] })}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button
            size="sm"
            onClick={handleExport}
            className="flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards - Responsive Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <div
          onClick={() => handleStatsCardClick('')}
          className={`bg-white rounded-lg shadow-sm border p-3 sm:p-4 cursor-pointer transition-all hover:shadow-md ${
            stockFilter === '' ? 'border-blue-400 ring-1 ring-blue-400' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-500 truncate">Total SKUs</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {statsLoading ? '...' : stats.totalSKUs.toLocaleString()}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-blue-100 rounded-lg flex-shrink-0">
              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div
          onClick={() => handleStatsCardClick('out')}
          className={`bg-white rounded-lg shadow-sm border p-3 sm:p-4 cursor-pointer transition-all hover:shadow-md ${
            stockFilter === 'out' ? 'border-red-400 ring-1 ring-red-400' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-500 truncate">Out of Stock</p>
              <p className="text-xl sm:text-2xl font-bold text-red-600">
                {statsLoading ? '...' : stats.outOfStock.toLocaleString()}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-red-100 rounded-lg flex-shrink-0">
              <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div
          onClick={() => handleStatsCardClick('low')}
          className={`bg-white rounded-lg shadow-sm border p-3 sm:p-4 cursor-pointer transition-all hover:shadow-md ${
            stockFilter === 'low' ? 'border-orange-400 ring-1 ring-orange-400' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-500 truncate">Low Stock</p>
              <p className="text-xl sm:text-2xl font-bold text-orange-600">
                {statsLoading ? '...' : stats.lowStock.toLocaleString()}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-orange-100 rounded-lg flex-shrink-0">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div
          onClick={() => handleStatsCardClick('overstocked')}
          className={`bg-white rounded-lg shadow-sm border p-3 sm:p-4 cursor-pointer transition-all hover:shadow-md ${
            stockFilter === 'overstocked' ? 'border-purple-400 ring-1 ring-purple-400' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-500 truncate">Overstocked</p>
              <p className="text-xl sm:text-2xl font-bold text-purple-600">
                {statsLoading ? '...' : stats.overstocked.toLocaleString()}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-purple-100 rounded-lg flex-shrink-0">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div
          onClick={() => handleStatsCardClick('healthy')}
          className={`bg-white rounded-lg shadow-sm border p-3 sm:p-4 cursor-pointer transition-all hover:shadow-md col-span-2 lg:col-span-1 ${
            stockFilter === 'healthy' ? 'border-green-400 ring-1 ring-green-400' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-500 truncate">Healthy Stock</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">
                {statsLoading ? '...' : Math.max(0, stats.totalSKUs - stats.outOfStock - stats.lowStock - stats.overstocked).toLocaleString()}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-green-100 rounded-lg flex-shrink-0">
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {needsAttention > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-amber-800">
              <strong>{needsAttention} products need attention:</strong>{' '}
              {stats.outOfStock > 0 && <span className="text-red-700">{stats.outOfStock} out of stock</span>}
              {stats.outOfStock > 0 && stats.lowStock > 0 && ', '}
              {stats.lowStock > 0 && <span className="text-orange-700">{stats.lowStock} low stock</span>}
            </p>
          </div>
          <button
            onClick={() => handleStatsCardClick(stats.outOfStock > 0 ? 'out' : 'low')}
            className="text-sm font-medium text-amber-700 hover:text-amber-900 whitespace-nowrap flex items-center gap-1"
          >
            View Items <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters - Responsive */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="flex flex-col gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by product name or SKU..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="input pl-10 w-full text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns - Grid on mobile */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <CustomSelect
              value={stockFilter}
              onChange={(value) => {
                setStockFilter(value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Status' },
                { value: 'out', label: 'Out of Stock' },
                { value: 'low', label: 'Low Stock' },
                { value: 'healthy', label: 'Healthy' },
                { value: 'overstocked', label: 'Overstocked' },
              ]}
              placeholder="All Status"
              className="w-full"
            />
            <CustomSelect
              value={vendorFilter}
              onChange={(value) => {
                setVendorFilter(value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Vendors' },
                ...(vendorsData?.map((v) => ({
                  value: v._id,
                  label: v.storeName || v.userId?.name || 'Unknown',
                })) || []),
              ]}
              placeholder="All Vendors"
              className="w-full"
            />
            <CustomSelect
              value={categoryFilter}
              onChange={(value) => {
                setCategoryFilter(value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Categories' },
                ...(categoriesData?.map((c) => ({
                  value: c._id,
                  label: c.name,
                })) || []),
              ]}
              placeholder="All Categories"
              className="w-full col-span-2 sm:col-span-1"
            />
          </div>
        </div>

        {/* Results count and clear */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs sm:text-sm text-gray-600">
            Showing <span className="font-semibold">{products.length}</span> of{' '}
            <span className="font-semibold">{totalProducts}</span> products
          </p>
          {(searchTerm || stockFilter || vendorFilter || categoryFilter) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStockFilter('');
                setVendorFilter('');
                setCategoryFilter('');
                setPage(1);
              }}
              className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 font-medium"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="block lg:hidden space-y-3">
        {products.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="font-medium text-gray-500">No products found</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          products.map((product) => {
            const threshold = product.lowStockThreshold || 10;
            const stockStatus = getStockStatusLabel(product.stock, threshold);
            const statusColor = getStockStatusColor(product.stock, threshold);
            const StatusIcon = getStockStatusIcon(product.stock, threshold);
            const isEditing = editingStock === product._id;

            return (
              <div key={product._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-start gap-3">
                  {/* Product Image */}
                  <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{product.title}</h3>
                    <p className="text-xs text-gray-500 font-mono">SKU: {product.sku || 'N/A'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{product.vendorId?.storeName || 'N/A'}</p>
                  </div>

                  {/* Status Badge */}
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${statusColor}`}>
                    <StatusIcon className="w-3 h-3" />
                    <span className="hidden sm:inline">{stockStatus}</span>
                  </div>
                </div>

                {/* Stock Info */}
                <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-gray-500">Current</p>
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        value={newStockValue}
                        onChange={(e) => setNewStockValue(e.target.value)}
                        className="w-full text-center py-1 border border-gray-300 rounded text-sm font-medium mt-1"
                        autoFocus
                      />
                    ) : (
                      <p className={`font-bold ${product.stock === 0 ? 'text-red-600' : product.stock <= threshold ? 'text-orange-600' : 'text-gray-900'}`}>
                        {product.stock}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Reserved</p>
                    <p className="font-medium text-gray-700">{product.reserved || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Available</p>
                    <p className={`font-medium ${(product.stock - (product.reserved || 0)) <= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {product.stock - (product.reserved || 0)}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-3 flex items-center justify-end gap-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={cancelEditing}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleStockUpdate(product._id)}
                        disabled={updateStockMutation.isPending}
                        className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {updateStockMutation.isPending ? 'Saving...' : 'Save'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEditing(product._id, product.stock)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Edit Stock"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {product.stock <= threshold && product.vendorId && (
                        <button
                          onClick={() => sendReminderMutation.mutate({ productId: product._id, vendorId: product.vendorId._id })}
                          disabled={sendReminderMutation.isPending}
                          className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg"
                          title="Send Restock Reminder"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-blue-100 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-sm">Product</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Vendor</th>
                <th className="text-center py-3 px-4 font-semibold text-sm">Current Stock</th>
                <th className="text-center py-3 px-4 font-semibold text-sm">Reserved</th>
                <th className="text-center py-3 px-4 font-semibold text-sm">Available</th>
                <th className="text-center py-3 px-4 font-semibold text-sm">Threshold</th>
                <th className="text-center py-3 px-4 font-semibold text-sm">Days Supply</th>
                <th className="text-center py-3 px-4 font-semibold text-sm">Status</th>
                <th className="text-right py-3 px-4 font-semibold text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-gray-500">
                    <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="font-medium">No products found</p>
                    <p className="text-sm mt-1">Try adjusting your filters</p>
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const threshold = product.lowStockThreshold || 10;
                  const statusColor = getStockStatusColor(product.stock, threshold);
                  const statusLabel = getStockStatusLabel(product.stock, threshold);
                  const StatusIcon = getStockStatusIcon(product.stock, threshold);

                  return (
                    <tr key={product._id} className="border-b last:border-b-0 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            {product.images?.[0] ? (
                              <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate max-w-[200px]">{product.title}</p>
                            <p className="text-xs text-gray-500 font-mono">SKU: {product.sku || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <p className="font-medium">{product.vendorId?.storeName || 'N/A'}</p>
                        <p className="text-xs text-gray-500">{product.vendorId?.email || ''}</p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {editingStock === product._id ? (
                          <div className="flex items-center justify-center gap-2">
                            <input
                              type="number"
                              min="0"
                              value={newStockValue}
                              onChange={(e) => setNewStockValue(e.target.value)}
                              className="input w-20 text-center text-sm"
                              autoFocus
                            />
                            <button
                              onClick={() => handleStockUpdate(product._id)}
                              disabled={updateStockMutation.isPending}
                              className="text-green-600 hover:text-green-700 p-1"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="text-gray-500 hover:text-gray-700 p-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className={`font-semibold ${product.stock === 0 ? 'text-red-600' : product.stock <= threshold ? 'text-orange-600' : 'text-gray-900'}`}>
                            {product.stock}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center text-sm text-gray-600">
                        {product.reserved || 0}
                      </td>
                      <td className="py-3 px-4 text-center text-sm">
                        <span className={`font-medium ${(product.stock - (product.reserved || 0)) <= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {product.stock - (product.reserved || 0)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-sm text-gray-600">
                        {threshold}
                      </td>
                      <td className="py-3 px-4 text-center text-sm">
                        {product.daysOfSupply !== undefined ? (
                          <span className={`${product.daysOfSupply < 7 ? 'text-red-600 font-medium' : product.daysOfSupply < 30 ? 'text-orange-600' : 'text-gray-600'}`}>
                            {product.daysOfSupply} days
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${statusColor}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusLabel}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEditing(product._id, product.stock)}
                            className="text-blue-600 hover:text-blue-700 p-1.5 hover:bg-blue-50 rounded-lg"
                            title="Edit Stock"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {product.stock <= threshold && product.vendorId && (
                            <button
                              onClick={() => sendReminderMutation.mutate({ productId: product._id, vendorId: product.vendorId._id })}
                              disabled={sendReminderMutation.isPending}
                              className="text-orange-600 hover:text-orange-700 p-1.5 hover:bg-orange-50 rounded-lg"
                              title="Send Restock Reminder"
                            >
                              <Mail className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 sm:mt-6">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
};

export default Inventory;
