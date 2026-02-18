// FILE: apps/web/src/pages/dashboard/vendor/Inventory.jsx
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import Spinner from '@/components/common/Spinner';
import { formatCurrency } from '@/utils/format';
import { Search, X, Package, AlertTriangle, CheckCircle, TrendingDown, Warehouse, Plus, Minus, Save, RotateCcw, RefreshCw } from 'lucide-react';

// Stock thresholds
const STOCK_THRESHOLDS = {
  OUT_OF_STOCK: 0,
  LOW: 10,
};

// Get stock status with color
const getStockStatus = (stock, lowStockThreshold = 10) => {
  if (stock === 0) return { label: 'Out of Stock', color: 'text-red-600 bg-red-50 border-red-200', icon: AlertTriangle };
  if (stock <= lowStockThreshold) return { label: 'Low Stock', color: 'text-orange-600 bg-orange-50 border-orange-200', icon: TrendingDown };
  return { label: 'In Stock', color: 'text-green-600 bg-green-50 border-green-200', icon: CheckCircle };
};

const Inventory = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingStock, setEditingStock] = useState({}); // { productId: newValue }
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const response = await api.get('/vendors/inventory');
      return response.data.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ productId, stock }) => {
      await api.put(`/vendors/inventory/${productId}`, { stock });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      setEditingStock(prev => {
        const updated = { ...prev };
        delete updated[variables.productId];
        return updated;
      });
      showToastMsg('Stock updated successfully!', 'success');
    },
    onError: () => {
      showToastMsg('Failed to update stock', 'error');
    },
  });

  const showToastMsg = (message, type) => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Calculate stats
  const stats = useMemo(() => {
    if (!products) return { total: 0, outOfStock: 0, lowStock: 0, totalUnits: 0, totalValue: 0 };

    const total = products.length;
    const outOfStock = products.filter(p => p.stock === 0).length;
    const lowStock = products.filter(p => p.stock > 0 && p.stock <= (p.lowStockThreshold || 10)).length;
    const totalUnits = products.reduce((sum, p) => sum + p.stock, 0);
    const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);

    return { total, outOfStock, lowStock, totalUnits, totalValue };
  }, [products]);

  // Filter and search products
  const filteredProducts = useMemo(() => {
    if (!products) return [];

    let result = [...products];

    // Apply filter
    if (filter === 'low') {
      result = result.filter(p => p.stock > 0 && p.stock <= (p.lowStockThreshold || 10));
    } else if (filter === 'out') {
      result = result.filter(p => p.stock === 0);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.title?.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [products, filter, searchQuery]);

  // Handle stock change in edit mode
  const handleStockChange = (productId, value) => {
    setEditingStock(prev => ({
      ...prev,
      [productId]: Math.max(0, parseInt(value) || 0)
    }));
  };

  // Increment/decrement stock
  const adjustStock = (productId, currentStock, delta) => {
    const current = editingStock[productId] ?? currentStock;
    const newValue = Math.max(0, current + delta);
    setEditingStock(prev => ({
      ...prev,
      [productId]: newValue
    }));
  };

  // Save stock update
  const saveStock = (productId) => {
    const newStock = editingStock[productId];
    if (newStock !== undefined) {
      updateMutation.mutate({ productId, stock: newStock });
    }
  };

  // Reset to original
  const resetStock = (productId, originalStock) => {
    setEditingStock(prev => {
      const updated = { ...prev };
      delete updated[productId];
      return updated;
    });
  };

  // Check if product has unsaved changes
  const hasChanges = (productId, originalStock) => {
    return editingStock[productId] !== undefined && editingStock[productId] !== originalStock;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="px-2 sm:px-0">
      {/* Toast */}
      {showToast && (
        <div className={`fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${
          toastType === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Inventory Management</h1>
        <button onClick={refetch} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-500 truncate">Total Products</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="p-2 sm:p-3 bg-blue-100 rounded-lg flex-shrink-0">
              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 cursor-pointer hover:border-red-300 transition-colors"
          onClick={() => setFilter('out')}
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-500 truncate">Out of Stock</p>
              <p className="text-xl sm:text-2xl font-bold text-red-600">{stats.outOfStock}</p>
            </div>
            <div className="p-2 sm:p-3 bg-red-100 rounded-lg flex-shrink-0">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 cursor-pointer hover:border-orange-300 transition-colors"
          onClick={() => setFilter('low')}
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-500 truncate">Low Stock</p>
              <p className="text-xl sm:text-2xl font-bold text-orange-600">{stats.lowStock}</p>
            </div>
            <div className="p-2 sm:p-3 bg-orange-100 rounded-lg flex-shrink-0">
              <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-500 truncate">Total Units</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalUnits.toLocaleString()}</p>
            </div>
            <div className="p-2 sm:p-3 bg-purple-100 rounded-lg flex-shrink-0">
              <Warehouse className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-500 truncate">Inventory Value</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">{formatCurrency(stats.totalValue)}</p>
            </div>
            <div className="p-2 sm:p-3 bg-green-100 rounded-lg flex-shrink-0">
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {(stats.outOfStock > 0 || stats.lowStock > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-amber-800">
              <strong>{stats.outOfStock + stats.lowStock} products need attention:</strong>{' '}
              {stats.outOfStock > 0 && <span className="text-red-700">{stats.outOfStock} out of stock</span>}
              {stats.outOfStock > 0 && stats.lowStock > 0 && ', '}
              {stats.lowStock > 0 && <span className="text-orange-700">{stats.lowStock} low stock</span>}
            </p>
          </div>
          <button
            onClick={() => setFilter(stats.outOfStock > 0 ? 'out' : 'low')}
            className="text-sm font-medium text-amber-700 hover:text-amber-900 whitespace-nowrap"
          >
            View Items →
          </button>
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by product name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10 w-full text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                filter === 'all' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('low')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                filter === 'low' ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Low Stock
            </button>
            <button
              onClick={() => setFilter('out')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                filter === 'out' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Out of Stock
            </button>
          </div>
        </div>

        {searchQuery && (
          <p className="text-xs sm:text-sm text-gray-500 mt-2">
            Found {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} matching "{searchQuery}"
          </p>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="block lg:hidden space-y-3">
        {filteredProducts.map((product) => {
          const stockStatus = getStockStatus(product.stock, product.lowStockThreshold);
          const StockIcon = stockStatus.icon;
          const currentValue = editingStock[product._id] ?? product.stock;
          const changed = hasChanges(product._id, product.stock);

          return (
            <div key={product._id} className={`bg-white rounded-lg shadow-sm border p-4 ${changed ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200'}`}>
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
                  <p className="text-xs text-gray-500 font-mono">{product.sku}</p>

                  {/* Stock Badge */}
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1 border ${stockStatus.color}`}>
                    <StockIcon className="w-3 h-3" />
                    {stockStatus.label}
                  </div>
                </div>
              </div>

              {/* Stock Controls */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Current Stock:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => adjustStock(product._id, product.stock, -1)}
                      className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={currentValue}
                      onChange={(e) => handleStockChange(product._id, e.target.value)}
                      className="w-16 text-center py-1 px-2 border border-gray-300 rounded-lg text-sm font-medium"
                    />
                    <button
                      onClick={() => adjustStock(product._id, product.stock, 1)}
                      className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Save/Reset Buttons */}
                {changed && (
                  <div className="flex items-center justify-end gap-2 mt-2">
                    <button
                      onClick={() => resetStock(product._id, product.stock)}
                      className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => saveStock(product._id)}
                      disabled={updateMutation.isPending}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {updateMutation.isPending ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-blue-100 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-sm">Product</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">SKU</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Low Stock Alert</th>
                <th className="text-center py-3 px-4 font-semibold text-sm">Current Stock</th>
                <th className="text-right py-3 px-4 font-semibold text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="font-medium">No products found</p>
                    <p className="text-sm mt-1">
                      {searchQuery ? 'Try adjusting your search' : filter !== 'all' ? 'No products match this filter' : 'Add products to manage inventory'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const stockStatus = getStockStatus(product.stock, product.lowStockThreshold);
                  const StockIcon = stockStatus.icon;
                  const currentValue = editingStock[product._id] ?? product.stock;
                  const changed = hasChanges(product._id, product.stock);

                  return (
                    <tr key={product._id} className={`border-b last:border-b-0 hover:bg-gray-50 transition-colors ${changed ? 'bg-blue-50' : ''}`}>
                      {/* Product */}
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
                            <p className="font-medium text-gray-900 truncate max-w-[200px]">{product.title}</p>
                          </div>
                        </div>
                      </td>
                      {/* SKU */}
                      <td className="py-3 px-4 text-sm font-mono text-gray-600">{product.sku || '—'}</td>
                      {/* Status */}
                      <td className="py-3 px-4">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${stockStatus.color}`}>
                          <StockIcon className="w-3.5 h-3.5" />
                          {stockStatus.label}
                        </div>
                      </td>
                      {/* Low Stock Alert */}
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {product.lowStockThreshold || 10} units
                      </td>
                      {/* Stock Control */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => adjustStock(product._id, product.stock, -10)}
                            className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 text-xs"
                            title="-10"
                          >
                            -10
                          </button>
                          <button
                            onClick={() => adjustStock(product._id, product.stock, -1)}
                            className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-100"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={currentValue}
                            onChange={(e) => handleStockChange(product._id, e.target.value)}
                            className={`w-20 text-center py-1.5 px-2 border rounded-lg text-sm font-medium ${
                              changed ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
                            }`}
                          />
                          <button
                            onClick={() => adjustStock(product._id, product.stock, 1)}
                            className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-100"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => adjustStock(product._id, product.stock, 10)}
                            className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 text-xs"
                            title="+10"
                          >
                            +10
                          </button>
                        </div>
                      </td>
                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        {changed ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => resetStock(product._id, product.stock)}
                              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                              title="Reset"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => saveStock(product._id)}
                              disabled={updateMutation.isPending}
                              className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-1"
                            >
                              <Save className="w-3.5 h-3.5" />
                              Save
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">No changes</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Empty State */}
      {filteredProducts.length === 0 && (
        <div className="block lg:hidden text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-500">No products found</p>
          <p className="text-sm text-gray-400 mt-1">
            {searchQuery ? 'Try adjusting your search' : filter !== 'all' ? 'No products match this filter' : 'Add products to manage inventory'}
          </p>
        </div>
      )}
    </div>
  );
};

export default Inventory;
