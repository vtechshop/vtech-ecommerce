// FILE: apps/web/src/pages/dashboard/admin/CRMCustomers.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Pagination from '@/components/common/Pagination';
import Spinner from '@/components/common/Spinner';
import CustomSelect from '@/components/common/CustomSelect';
import { formatCurrency, formatDate } from '@/utils/format';
import { Eye, Search, Mail, Tag, TrendingUp, ShoppingCart, DollarSign, Calendar, Phone, MapPin } from 'lucide-react';

const CRMCustomers = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('');
  const [viewingCustomer, setViewingCustomer] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['crm-customers', page, searchTerm, segmentFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', '20');
      if (searchTerm) params.append('search', searchTerm);
      if (segmentFilter) params.append('segment', segmentFilter);

      const response = await api.get(`/admin/crm/customers?${params}`);
      return response.data;
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ['crm-stats'],
    queryFn: async () => {
      const response = await api.get('/admin/crm/stats');
      return response.data;
    },
  });

  const handleView = (customer) => {
    setViewingCustomer(customer);
  };

  const getSegmentColor = (segment) => {
    switch (segment) {
      case 'vip':
        return 'bg-purple-100 text-purple-800';
      case 'loyal':
        return 'bg-green-100 text-green-800';
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'at-risk':
        return 'bg-red-100 text-red-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-900';
      default:
        return 'bg-gray-100 text-gray-900';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const customers = data?.data || [];
  const totalPages = Math.ceil((data?.meta?.total || 0) / 20);
  const stats = statsData?.data || {};

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">CRM - Customers</h1>
          <p className="text-gray-700 mt-1">Manage customer relationships and analytics</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">Total Customers</p>
              <p className="text-2xl font-bold mt-1">{stats.totalCustomers || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">Total Revenue</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalRevenue || 0)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">Avg Order Value</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(stats.avgOrderValue || 0)}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">Active This Month</p>
              <p className="text-2xl font-bold mt-1">{stats.activeThisMonth || 0}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="input pl-10 w-full"
            />
          </div>
          <CustomSelect
            value={segmentFilter}
            onChange={(value) => {
              setSegmentFilter(value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All Segments' },
              { value: 'vip', label: 'VIP Customers' },
              { value: 'loyal', label: 'Loyal Customers' },
              { value: 'new', label: 'New Customers' },
              { value: 'at-risk', label: 'At Risk' },
              { value: 'inactive', label: 'Inactive' },
            ]}
            placeholder="All Segments"
            className="w-full"
          />
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('');
              setSegmentFilter('');
              setPage(1);
            }}
            className="flex items-center gap-2"
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-sm">Customer</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Segment</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Orders</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Total Spent</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Avg Order</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Last Order</th>
                <th className="text-right py-3 px-4 font-semibold text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer._id} className="border-b last:border-b-0 hover:bg-gray-50">
                  <td className="py-3 px-3 sm:px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                          {customer.name?.charAt(0)?.toUpperCase() || 'C'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{customer.name || 'N/A'}</p>
                        <p className="text-xs text-gray-700">{customer.email || 'N/A'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 sm:px-4">
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${getSegmentColor(customer.segment)}`}>
                      {customer.segment?.toUpperCase() || 'REGULAR'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium">{customer.orderCount || 0}</td>
                  <td className="py-3 px-4 font-medium text-green-600">{formatCurrency(customer.totalSpent || 0)}</td>
                  <td className="py-3 px-3 sm:px-4">{formatCurrency(customer.avgOrderValue || 0)}</td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {customer.lastOrderDate ? formatDate(customer.lastOrderDate) : 'Never'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleView(customer)}
                        className="text-blue-600 hover:text-blue-700 p-1"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        className="text-blue-600 hover:text-blue-700 p-1"
                        title="Send Email"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                      <button
                        className="text-purple-600 hover:text-purple-700 p-1"
                        title="Add Tag"
                      >
                        <Tag className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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

      {/* Customer Details Modal */}
      {viewingCustomer && (
        <CustomerDetailsModal
          customer={viewingCustomer}
          onClose={() => setViewingCustomer(null)}
        />
      )}
    </div>
  );
};

// Customer Details Modal Component
const CustomerDetailsModal = ({ customer, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');

  const { data: ordersData } = useQuery({
    queryKey: ['customer-orders', customer._id],
    queryFn: async () => {
      const response = await api.get(`/admin/crm/customers/${customer._id}/orders`);
      return response.data;
    },
    enabled: !!customer._id,
  });

  const orders = ordersData?.data || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
              <span className="text-xl font-medium text-white">
                {customer.name?.charAt(0)?.toUpperCase() || 'C'}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold">{customer.name || 'Customer'}</h2>
              <p className="text-sm text-gray-700">{customer.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex gap-3 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-primary-600 text-blue-600'
                  : 'border-transparent text-gray-700 hover:text-gray-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'orders'
                  ? 'border-primary-600 text-blue-600'
                  : 'border-transparent text-gray-700 hover:text-gray-900'
              }`}
            >
              Orders ({customer.orderCount || 0})
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'activity'
                  ? 'border-primary-600 text-blue-600'
                  : 'border-transparent text-gray-700 hover:text-gray-900'
              }`}
            >
              Activity
            </button>
          </div>
        </div>

        <div className="p-4">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Customer Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Customer Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">Email:</span>
                    <span className="font-medium">{customer.email || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">Phone:</span>
                    <span className="font-medium">{customer.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">Location:</span>
                    <span className="font-medium">{customer.location || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">Joined:</span>
                    <span className="font-medium">{formatDate(customer.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Tag className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">Segment:</span>
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${customer.segment ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-900'}`}>
                      {customer.segment?.toUpperCase() || 'REGULAR'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Purchase Statistics */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Purchase Statistics</h3>
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700">Total Orders</p>
                    <p className="text-2xl font-bold">{customer.orderCount || 0}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700">Total Spent</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(customer.totalSpent || 0)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700">Average Order Value</p>
                    <p className="text-2xl font-bold">{formatCurrency(customer.avgOrderValue || 0)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700">Last Order</p>
                    <p className="text-lg font-bold">
                      {customer.lastOrderDate ? formatDate(customer.lastOrderDate) : 'Never'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Order History</h3>
              <div className="space-y-3">
                {orders.length > 0 ? (
                  orders.map((order) => (
                    <div key={order._id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Order #{order.orderNumber}</p>
                          <p className="text-sm text-gray-700">{formatDate(order.createdAt)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">{formatCurrency(order.total)}</p>
                          <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                            order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                            order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {order.status?.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-700 text-center py-8">No orders yet</p>
                )}
              </div>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
              <div className="space-y-3">
                <p className="text-gray-700 text-center py-8">Activity tracking coming soon...</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-end gap-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Send Email
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CRMCustomers;
