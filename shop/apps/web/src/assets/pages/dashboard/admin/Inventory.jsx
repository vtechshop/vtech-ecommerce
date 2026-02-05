// FILE: apps/web/src/pages/dashboard/admin/Inventory.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Pagination from '@/components/common/Pagination';
import Spinner from '@/components/common/Spinner';
import CustomSelect from '@/components/common/CustomSelect';
import { formatCurrency } from '@/utils/format';
import { Package, AlertTriangle, XCircle, TrendingUp, Search, X, Download, Mail, Edit2, Check, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const Inventory = () => {
  const queryClient = useQueryClient();
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
    if (stock === 0) return 'text-red-600 bg-red-50';
    if (stock <= threshold) return 'text-orange-600 bg-orange-50';
    if (stock > threshold * 5) return 'text-blue-600 bg-blue-50';
    return 'text-green-600 bg-green-50';
  };

  const getStockStatusLabel = (stock, threshold) => {
    if (stock === 0) return 'Out of Stock';
    if (stock <= threshold) return 'Low Stock';
    if (stock > threshold * 5) return 'Overstocked';
    return 'Healthy';
  };

  const stats = statsData || { totalSKUs: 0, lowStock: 0, outOfStock: 0, overstocked: 0 };
  const products = inventoryData?.data || [];
  const totalProducts = inventoryData?.meta?.total || 0;
  const totalPages = Math.ceil(totalProducts / 20);
  const alerts = inventoryData?.alerts || [];

  if (isLoading && !inventoryData) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-gray-600 mt-1">
            Monitor stock levels across all vendors
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-inventory'] })}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button
            onClick={handleExport}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards - Amazon Style */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total SKUs</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {statsLoading ? '...' : stats.totalSKUs.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Across all vendors</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Low Stock</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                {statsLoading ? '...' : stats.lowStock.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Below threshold</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {statsLoading ? '...' : stats.outOfStock.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Zero inventory</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Overstocked</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {statsLoading ? '...' : stats.overstocked.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">High inventory</p>
        </div>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-yellow-800 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Inventory Alerts
          </h3>
          <div className="space-y-1">
            {alerts.map((alert, index) => (
              <p key={index} className="text-sm text-yellow-700">
                {alert.message}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats Alerts */}
      {(stats.outOfStock > 0 || stats.lowStock > 0) && (
        <div className="flex flex-wrap gap-3 mb-6">
          {stats.outOfStock > 0 && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm font-medium">
              <XCircle className="w-4 h-4" />
              {stats.outOfStock} products out of stock
            </div>
          )}
          {stats.lowStock > 0 && (
            <div className="flex items-center gap-2 bg-orange-50 text-orange-700 px-4 py-2 rounded-lg text-sm font-medium">
              <AlertTriangle className="w-4 h-4" />
              {stats.lowStock} products need restocking
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by product name or SKU..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="input pl-10 w-full"
            />
          </div>
          <CustomSelect
            value={stockFilter}
            onChange={(value) => {
              setStockFilter(value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All Stock Status' },
              { value: 'out', label: 'Out of Stock' },
              { value: 'low', label: 'Low Stock' },
              { value: 'healthy', label: 'Healthy Stock' },
              { value: 'overstocked', label: 'Overstocked' },
            ]}
            placeholder="All Stock Status"
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
            className="w-full"
          />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold">{products.length}</span> of{' '}
            <span className="font-semibold">{totalProducts}</span> products
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchTerm('');
              setStockFilter('');
              setVendorFilter('');
              setCategoryFilter('');
              setPage(1);
            }}
            className="flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800 text-white">
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
              {products.map((product) => (
                <tr key={product._id} className="border-b last:border-b-0 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {product.images?.[0] && (
                        <img
                          src={product.images[0]}
                          alt={product.title}
                          className="w-10 h-10 object-cover rounded"
                        />
                      )}
                      <div>
                        <p className="font-medium text-sm">{product.title}</p>
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
                      <span className={`font-semibold ${product.stock === 0 ? 'text-red-600' : product.stock <= (product.lowStockThreshold || 10) ? 'text-orange-600' : 'text-gray-900'}`}>
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
                    {product.lowStockThreshold || 10}
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
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${getStockStatusColor(product.stock, product.lowStockThreshold || 10)}`}>
                      {getStockStatusLabel(product.stock, product.lowStockThreshold || 10)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => startEditing(product._id, product.stock)}
                        className="text-blue-600 hover:text-blue-700 p-1"
                        title="Edit Stock"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {product.stock <= (product.lowStockThreshold || 10) && product.vendorId && (
                        <button
                          onClick={() => sendReminderMutation.mutate({ productId: product._id, vendorId: product.vendorId._id })}
                          disabled={sendReminderMutation.isPending}
                          className="text-orange-600 hover:text-orange-700 p-1"
                          title="Send Restock Reminder"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-gray-500">
                    No products found matching your filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
};

export default Inventory;
