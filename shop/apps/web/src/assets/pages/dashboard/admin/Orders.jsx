// FILE: apps/web/src/pages/dashboard/admin/Orders.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import Pagination from '@/components/common/Pagination';
import Spinner from '@/components/common/Spinner';
import NewBadge from '@/components/common/NewBadge';
import { formatCurrency } from '@/utils/format';
import { getNewItemClasses, formatRelativeTime } from '@/utils/dateHelpers';
import { PLACEHOLDER_IMAGE_SM, handleImageError } from '@/utils/placeholders';
import {
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  Eye,
  Search,
  ChevronDown,
  ChevronUp,
  MapPin,
  Phone,
  User,
  Calendar,
  Box,
  RefreshCw,
  RotateCcw,
  Wallet,
  ArrowRightLeft
} from 'lucide-react';

const Orders = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedOrder, setExpandedOrder] = useState(null);

  // Fetch orders with current filters
  const { data, isLoading, refetch } = useQuery({
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

  // Fetch order counts for tabs
  const { data: countsData } = useQuery({
    queryKey: ['admin-order-counts'],
    queryFn: async () => {
      const response = await api.get('/admin/orders/counts');
      return response.data?.data || {};
    },
    staleTime: 30 * 1000,
  });

  const statusTabs = [
    { value: '', label: 'All Orders', icon: Package, color: 'gray' },
    { value: 'pending', label: 'Pending', icon: Clock, color: 'gray' },
    { value: 'pending_payment', label: 'Awaiting Payment', icon: Wallet, color: 'yellow' },
    { value: 'paid', label: 'Paid', icon: CreditCard, color: 'blue' },
    { value: 'packed', label: 'Packed', icon: Box, color: 'indigo' },
    { value: 'shipped', label: 'Shipped', icon: Truck, color: 'purple' },
    { value: 'out_for_delivery', label: 'Out for Delivery', icon: ArrowRightLeft, color: 'orange' },
    { value: 'delivered', label: 'Delivered', icon: CheckCircle, color: 'green' },
    { value: 'cancelled', label: 'Cancelled', icon: XCircle, color: 'red' },
    { value: 'refunded', label: 'Refunded', icon: RotateCcw, color: 'gray' },
  ];

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Pending' },
      pending_payment: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Awaiting Payment' },
      paid: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Payment Received' },
      packed: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Packed' },
      shipped: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Shipped' },
      out_for_delivery: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Out for Delivery' },
      delivered: { bg: 'bg-green-100', text: 'text-green-800', label: 'Delivered' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' },
      refunded: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Refunded' },
    };
    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getTabCount = (status) => {
    if (!countsData) return null;
    if (status === '') return countsData.total || 0;
    return countsData[status] || 0;
  };

  const toggleExpand = (orderId) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  if (isLoading && !data) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const orders = data?.data || [];
  const totalPages = Math.ceil((data?.meta?.total || 0) / 20);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
          <p className="text-sm text-gray-600 mt-1">View and manage all customer orders</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search order ID, email..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Refresh */}
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Status Tabs - Amazon Admin Style */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex overflow-x-auto scrollbar-hide border-b border-gray-200">
          {statusTabs.map((tab) => {
            const Icon = tab.icon;
            const count = getTabCount(tab.value);
            const isActive = statusFilter === tab.value;

            return (
              <button
                key={tab.value}
                onClick={() => {
                  setStatusFilter(tab.value);
                  setPage(1);
                }}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-primary-600 text-primary-700 bg-primary-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden md:inline">{tab.label}</span>
                <span className="md:hidden">{tab.label.split(' ')[0]}</span>
                {count !== null && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    isActive ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">No orders found</p>
            <p className="text-sm text-gray-500 mt-1">
              {statusFilter ? `No ${statusFilter.replace('_', ' ')} orders at the moment` : 'Orders will appear here when customers place them'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {orders.map((order) => (
              <div key={order?._id || Math.random()} className={`hover:bg-gray-50 transition-colors ${getNewItemClasses(order?.createdAt)}`}>
                {/* Main Row */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => toggleExpand(order._id)}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Order Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-gray-900">#{order?.orderId || 'N/A'}</span>
                        <NewBadge createdAt={order?.createdAt} />
                        {getStatusBadge(order?.status)}
                        {order?.paymentMethod === 'cod' && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-medium">COD</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatRelativeTime(order?.createdAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {order?.userId?.name || order?.shipTo?.fullName || 'Guest'}
                        </span>
                        <span className="flex items-center gap-1 text-gray-500">
                          {order?.userId?.email || order?.guestEmail || 'No email'}
                        </span>
                      </div>
                    </div>

                    {/* Product Preview */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex -space-x-2">
                        {(order.items || []).slice(0, 3).map((item, idx) => (
                          <img
                            key={idx}
                            src={item.image || PLACEHOLDER_IMAGE_SM}
                            alt={item.name}
                            className="w-10 h-10 rounded-lg border-2 border-white object-cover shadow-sm"
                            onError={(e) => handleImageError(e, PLACEHOLDER_IMAGE_SM)}
                          />
                        ))}
                        {(order.items?.length || 0) > 3 && (
                          <div className="w-10 h-10 rounded-lg border-2 border-white bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                            +{order.items.length - 3}
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">{order?.items?.length || 0}</span> items
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{formatCurrency(order?.totals?.total || 0)}</p>
                        <p className="text-xs text-gray-500">
                          Tax: {formatCurrency(order?.totals?.tax || 0)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin-dashboard/orders/${order?._id}`);
                          }}
                          className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="View & Manage"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-gray-600">
                          {expandedOrder === order._id ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedOrder === order._id && (
                  <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                      {/* Items List */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Order Items</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {(order.items || []).map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-200">
                              <img
                                src={item.image || PLACEHOLDER_IMAGE_SM}
                                alt={item.name}
                                className="w-10 h-10 rounded object-cover"
                                onError={(e) => handleImageError(e, PLACEHOLDER_IMAGE_SM)}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 text-sm truncate">{item.name}</p>
                                <p className="text-xs text-gray-600">
                                  {item.qty} × {formatCurrency(item.priceSnapshot || 0)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Customer & Shipping */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Shipping Address</h4>
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                            <div className="text-sm">
                              <p className="font-medium text-gray-900">{order.shipTo?.fullName}</p>
                              <p className="text-gray-600 mt-1">
                                {order.shipTo?.addressLine1}
                                {order.shipTo?.addressLine2 && <>, {order.shipTo.addressLine2}</>}
                              </p>
                              <p className="text-gray-600">
                                {order.shipTo?.city}, {order.shipTo?.state} - {order.shipTo?.pincode}
                              </p>
                              {order.shipTo?.phone && (
                                <p className="flex items-center gap-1 text-gray-600 mt-2">
                                  <Phone className="w-3 h-3" />
                                  {order.shipTo.phone}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Order Summary & Actions */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Order Summary</h4>
                        <div className="bg-white p-3 rounded-lg border border-gray-200 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Subtotal</span>
                            <span className="font-medium">{formatCurrency(order?.totals?.subtotal || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Shipping</span>
                            <span className="font-medium">{formatCurrency(order?.totals?.shipping || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Tax</span>
                            <span className="font-medium">{formatCurrency(order?.totals?.tax || 0)}</span>
                          </div>
                          {order?.totals?.discount > 0 && (
                            <div className="flex justify-between text-green-600">
                              <span>Discount</span>
                              <span>-{formatCurrency(order?.totals?.discount || 0)}</span>
                            </div>
                          )}
                          <div className="flex justify-between pt-2 border-t border-gray-200">
                            <span className="font-semibold">Total</span>
                            <span className="font-bold text-lg">{formatCurrency(order?.totals?.total || 0)}</span>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <button
                          onClick={() => navigate(`/admin-dashboard/orders/${order?._id}`)}
                          className="w-full mt-3 btn btn-primary flex items-center justify-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Manage Order
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
};

export default Orders;
