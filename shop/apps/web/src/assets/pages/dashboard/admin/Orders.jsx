// FILE: apps/web/src/pages/dashboard/admin/Orders.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Pagination from '@/components/common/Pagination';
import Spinner from '@/components/common/Spinner';
import CustomSelect from '@/components/common/CustomSelect';
import NewBadge from '@/components/common/NewBadge';
import { formatCurrency } from '@/utils/format';
import { getNewItemClasses, formatRelativeTime } from '@/utils/dateHelpers';
import { Eye, Search, Filter, Package, Truck, CheckCircle, XCircle } from 'lucide-react';

const Orders = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', page, statusFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', '20');
      if (statusFilter) params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await api.get(`/admin/orders?${params}`);
      return response.data;
    },
  });


  const getStatusColor = (status) => {
    switch (status) {
      case 'placed':
        return 'bg-primary-100 text-primary-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'shipped':
        return 'bg-secondary-100 text-secondary-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-blue-100 text-gray-900';
      default:
        return 'bg-blue-100 text-gray-900';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'placed':
        return <Package className="w-4 h-4" />;
      case 'paid':
        return <CheckCircle className="w-4 h-4" />;
      case 'processing':
        return <Package className="w-4 h-4" />;
      case 'shipped':
        return <Truck className="w-4 h-4" />;
      case 'delivered':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const orders = data?.data || [];
  const totalPages = Math.ceil((data?.meta?.total || 0) / 20);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Order Management</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="input pl-10 w-full"
            />
          </div>
          <CustomSelect
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All Orders' },
              { value: 'placed', label: 'Placed' },
              { value: 'paid', label: 'Paid' },
              { value: 'processing', label: 'Processing' },
              { value: 'shipped', label: 'Shipped' },
              { value: 'delivered', label: 'Delivered' },
              { value: 'cancelled', label: 'Cancelled' },
              { value: 'refunded', label: 'Refunded' },
            ]}
            placeholder="All Orders"
            className="w-full"
          />
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('');
              setPage(1);
            }}
            className="flex items-center gap-2"
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-blue-100 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-sm">Order</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Customer</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Items</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Total</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Date</th>
                <th className="text-right py-3 px-4 font-semibold text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order?._id || Math.random()} className={`border-b last:border-b-0 transition-colors ${getNewItemClasses(order?.createdAt)}`}>
                  <td className="py-3 px-3 sm:px-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">#{order?.orderId || 'N/A'}</p>
                        <NewBadge createdAt={order?.createdAt} />
                      </div>
                      <p className="text-xs text-gray-700">
                        ID: {order?._id?.slice(-8) || 'N/A'} • {formatRelativeTime(order?.createdAt)}
                      </p>
                    </div>
                  </td>
                  <td className="py-3 px-3 sm:px-4">
                    <div>
                      <p className="font-medium">{order?.userId?.name || order?.shipTo?.fullName || 'Guest'}</p>
                      <p className="text-xs text-gray-700">{order?.userId?.email || order?.guestEmail || 'N/A'}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <div>
                      <p className="font-medium">{order?.items?.length || 0} items</p>
                      <p className="text-xs text-gray-700">
                        {order?.items?.reduce((sum, item) => sum + (item?.qty || 0), 0) || 0} units
                      </p>
                    </div>
                  </td>
                  <td className="py-3 px-3 sm:px-4">
                    <div>
                      <p className="font-semibold">{formatCurrency(order?.totals?.total || 0)}</p>
                      <p className="text-xs text-gray-700">
                        Tax: {formatCurrency(order?.totals?.tax || 0)}
                      </p>
                    </div>
                  </td>
                  <td className="py-3 px-3 sm:px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        order?.status
                      )}`}
                    >
                      {getStatusIcon(order?.status)}
                      {order?.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'Unknown'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {order?.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => navigate(`/admin-dashboard/orders/${order?._id}`)}
                        className="text-blue-600 hover:text-blue-700 p-1 hover:bg-blue-50 rounded"
                        title="View & Assign Carrier"
                      >
                        <Eye className="w-5 h-5" />
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
    </div>
  );
};

export default Orders;