// FILE: apps/web/src/pages/dashboard/vendor/VendorOrders.jsx
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import api from '@/utils/api';
import Pagination from '@/components/common/Pagination';
import Spinner from '@/components/common/Spinner';
import { formatCurrency, formatDate } from '@/utils/format';
import { PLACEHOLDER_IMAGE_SM, handleImageError } from '@/utils/placeholders';
import { playNewOrder } from '@/utils/sounds';
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  Eye,
  ChevronDown,
  ChevronUp,
  MapPin,
  Phone,
  User,
  Calendar,
  IndianRupee,
  Box,
  Search,
  RefreshCw,
  FileDown
} from 'lucide-react';

const VendorOrders = () => {
  const navigate = useNavigate();
  const prevOrderCountRef = useRef(null);

  // Restore page and filter from sessionStorage on component mount
  const [page, setPage] = useState(() => {
    const savedPage = sessionStorage.getItem('vendor-orders-page');
    return savedPage ? parseInt(savedPage) : 1;
  });

  const [statusFilter, setStatusFilter] = useState(() => {
    return sessionStorage.getItem('vendor-orders-filter') || '';
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [expandedOrder, setExpandedOrder] = useState(null);

  const downloadInvoice = async (order) => {
    try {
      const res = await api.get(`/vendors/orders/${order._id}/invoice`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${order.orderId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download invoice');
    }
  };

  // Fetch orders with current filters
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['vendor-orders', page, statusFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', '15');
      if (statusFilter) params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await api.get(`/vendors/orders?${params}`);
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
    keepPreviousData: true,
  });

  // Fetch order counts for tabs (with auto-refresh every 30s)
  const { data: countsData } = useQuery({
    queryKey: ['vendor-order-counts'],
    queryFn: async () => {
      const response = await api.get('/vendors/orders/counts');
      return response.data?.data || {};
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
  });

  // Play sound when new order arrives (paid orders count increases)
  useEffect(() => {
    if (countsData?.paid !== undefined) {
      // Only play sound if this is not the first load and count increased
      if (prevOrderCountRef.current !== null && countsData.paid > prevOrderCountRef.current) {
        playNewOrder();
      }
      prevOrderCountRef.current = countsData.paid;
    }
  }, [countsData?.paid]);

  // Save page to sessionStorage when it changes
  useEffect(() => {
    sessionStorage.setItem('vendor-orders-page', page.toString());
  }, [page]);

  // Save filter to sessionStorage when it changes
  useEffect(() => {
    sessionStorage.setItem('vendor-orders-filter', statusFilter);
  }, [statusFilter]);

  const statusTabs = [
    { value: '', label: 'All Orders', icon: Package, color: 'gray' },
    { value: 'paid', label: 'Pending', icon: Clock, color: 'yellow' },
    { value: 'packed', label: 'Packed', icon: Box, color: 'blue' },
    { value: 'shipped', label: 'Shipped', icon: Truck, color: 'purple' },
    { value: 'out_for_delivery', label: 'Out for Delivery', icon: Truck, color: 'orange' },
    { value: 'delivered', label: 'Delivered', icon: CheckCircle, color: 'green' },
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
  const totalPages = Math.ceil((data?.meta?.total || 0) / 15);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Orders</h1>
          <p className="text-sm text-gray-600 mt-1">View and fulfill your customer orders</p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={refetch} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>

          {/* Search */}
          <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search order ID..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          </div>
        </div>
      </div>

      {/* Status Tabs - Amazon Seller Central Style */}
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
                <span>{tab.label}</span>
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

        {/* Orders Table */}
        {orders.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">No orders found</p>
            <p className="text-sm text-gray-500 mt-1">
              {statusFilter ? `No ${statusFilter} orders at the moment` : 'Orders will appear here when customers place them'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {orders.map((order) => (
              <div key={order._id} className="hover:bg-gray-50 transition-colors">
                {/* Main Row */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => toggleExpand(order._id)}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Order Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-gray-900">#{order.orderId}</span>
                        {getStatusBadge(order.status)}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(order.createdAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {order.userId?.name || order.shipTo?.fullName || 'Guest'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Box className="w-3.5 h-3.5" />
                          {order.items?.length || 0} items
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
                    </div>

                    {/* Amount */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{formatCurrency(order.totals?.total || 0)}</p>
                        <p className="text-xs text-gray-500">{order.paymentMethod === 'cod' ? 'COD' : 'Prepaid'}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/vendor-dashboard/orders/${order._id}`);
                          }}
                          className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadInvoice(order);
                          }}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Download Invoice"
                        >
                          <FileDown className="w-5 h-5" />
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                      {/* Items List */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Order Items</h4>
                        <div className="space-y-3">
                          {(order.items || []).map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200">
                              <img
                                src={item.image || PLACEHOLDER_IMAGE_SM}
                                alt={item.name}
                                className="w-14 h-14 rounded-lg object-cover"
                                onError={(e) => handleImageError(e, PLACEHOLDER_IMAGE_SM)}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{item.name}</p>
                                <p className="text-sm text-gray-600">
                                  Qty: {item.qty} × {formatCurrency(item.priceSnapshot || 0)}
                                </p>
                              </div>
                              <p className="font-semibold text-gray-900">
                                {formatCurrency((item.priceSnapshot || 0) * (item.qty || 0))}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Shipping Address */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Shipping Address</h4>
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                          <div className="flex items-start gap-3">
                            <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium text-gray-900">{order.shipTo?.fullName}</p>
                              <p className="text-sm text-gray-600 mt-1">
                                {order.shipTo?.addressLine1}
                                {order.shipTo?.addressLine2 && <>, {order.shipTo.addressLine2}</>}
                              </p>
                              <p className="text-sm text-gray-600">
                                {order.shipTo?.city}, {order.shipTo?.state} - {order.shipTo?.pincode}
                              </p>
                              {order.shipTo?.phone && (
                                <p className="flex items-center gap-1 text-sm text-gray-600 mt-2">
                                  <Phone className="w-3.5 h-3.5" />
                                  {order.shipTo.phone}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="mt-4">
                          <Link
                            to={`/vendor-dashboard/orders/${order._id}`}
                            className="w-full btn btn-primary flex items-center justify-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            View Full Details & Update Status
                          </Link>
                        </div>
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

export default VendorOrders;
