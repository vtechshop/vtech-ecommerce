// FILE: apps/web/src/pages/dashboard/customer/Orders.jsx
import { useState, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import {
  Package,
  RotateCcw,
  Search,
  Filter,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  ChevronRight,
  ShoppingBag,
  RefreshCw,
  Eye
} from 'lucide-react';
import api from '@/utils/api';
import { addToCart } from '@/store/slices/cartSlice';
import { reorderItems, canReorder } from '@/utils/reorder';
import { useToast } from '@/components/common/ToastContainer';
import Pagination from '@/components/common/Pagination';
import { formatCurrency, formatDate } from '@/utils/format';
import { PLACEHOLDER_IMAGE_SM, handleImageError } from '@/utils/placeholders';

// Status filter tabs
const STATUS_TABS = [
  { value: '', label: 'All Orders', icon: Package },
  { value: 'placed', label: 'Placed', icon: Clock },
  { value: 'shipped', label: 'Shipped', icon: Truck },
  { value: 'delivered', label: 'Delivered', icon: CheckCircle },
  { value: 'cancelled', label: 'Cancelled', icon: XCircle },
];

// Order Card Component
const OrderCard = ({ order, onReorder, isReordering }) => {
  const statusConfig = {
    placed: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' },
    paid: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700' },
    packed: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700' },
    shipped: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700' },
    delivered: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-700' },
    cancelled: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-700' },
  };

  const config = statusConfig[order.status] || statusConfig.placed;

  return (
    <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200`}>
      {/* Header */}
      <div className={`${config.bg} ${config.border} border-b px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2`}>
        <div className="flex items-center gap-3">
          <div>
            <p className="font-mono text-sm font-bold text-gray-900">{order.orderId}</p>
            <p className="text-xs text-gray-500">Placed on {formatDate(order.createdAt)}</p>
          </div>
        </div>
        <span className={`self-start sm:self-center px-3 py-1 rounded-full text-xs font-semibold ${config.badge}`}>
          {order.status?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
        </span>
      </div>

      {/* Items */}
      <div className="p-4 sm:p-5">
        <div className="space-y-3">
          {(order.items || []).slice(0, 2).map((item, index) => (
            <div key={index} className="flex gap-3">
              <img
                src={item.image || PLACEHOLDER_IMAGE_SM}
                alt={item.name}
                className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-gray-200"
                onError={(e) => handleImageError(e, PLACEHOLDER_IMAGE_SM)}
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{item.name}</p>
                <p className="text-sm text-gray-500">Qty: {item.qty}</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  {formatCurrency((item.priceSnapshot || 0) * (item.qty || 1))}
                </p>
              </div>
            </div>
          ))}
          {(order.items?.length || 0) > 2 && (
            <p className="text-sm text-gray-500 pl-1">
              +{order.items.length - 2} more item(s)
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-4 sm:px-5 py-4 bg-gray-50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs text-gray-500">Total Amount</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(order.totals?.total || 0)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canReorder(order) && (
              <button
                onClick={() => onReorder(order)}
                disabled={isReordering}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                {isReordering ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Reorder</span>
              </button>
            )}
            {order.shipment?.awb && (
              <Link
                to={`/track-order?orderId=${order.orderId}`}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Truck className="w-4 h-4" />
                <span className="hidden sm:inline">Track</span>
              </Link>
            )}
            <Link
              to={`/dashboard/orders/${order._id}`}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Eye className="w-4 h-4" />
              View Details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

const Orders = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1', 10);
  const initialStatus = searchParams.get('status') || '';
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [reorderingOrderId, setReorderingOrderId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const queryKey = useMemo(() => ['orders', page, statusFilter], [page, statusFilter]);

  const { data, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '10');
      if (statusFilter) params.set('status', statusFilter);

      const response = await api.get(`/orders?${params.toString()}`);
      return response.data;
    },
    staleTime: 60_000,
    keepPreviousData: true,
  });

  const handlePageChange = (newPage) => {
    setSearchParams({ page: String(newPage), ...(statusFilter && { status: statusFilter }) });
  };

  const handleStatusChange = (status) => {
    setStatusFilter(status);
    setSearchParams({ page: '1', ...(status && { status }) });
  };

  const handleReorder = async (order) => {
    if (!canReorder(order)) {
      toast.error('This order cannot be reordered');
      return;
    }

    setReorderingOrderId(order._id);

    try {
      const result = await reorderItems(order, dispatch, addToCart);

      if (result.success) {
        toast.success(result.message);

        if (result.results.failed.length > 0 || result.results.outOfStock.length > 0) {
          setTimeout(() => {
            const details = [];
            if (result.results.outOfStock.length > 0) {
              details.push(`${result.results.outOfStock.length} item(s) out of stock`);
            }
            if (result.results.failed.length > 0) {
              details.push(`${result.results.failed.length} item(s) unavailable`);
            }
            toast.warning(details.join(', '));
          }, 1000);
        }

        setTimeout(() => {
          navigate('/cart');
        }, 1500);
      } else {
        toast.error(result.error || 'Failed to reorder items');
      }
    } catch (error) {
      console.error('Reorder error:', error);
      toast.error('An error occurred while reordering');
    } finally {
      setReorderingOrderId(null);
    }
  };

  const orders = data?.data || [];
  const totalPages = Math.ceil((data?.meta?.total || 0) / 10);

  // Filter orders by search query
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const query = searchQuery.toLowerCase();
    return orders.filter(order =>
      order.orderId?.toLowerCase().includes(query) ||
      order.items?.some(item => item.name?.toLowerCase().includes(query))
    );
  }, [orders, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Orders</h1>
          <p className="text-gray-500 text-sm mt-1">Track, manage and reorder your purchases</p>
        </div>
        <button
          onClick={() => refetch()}
          className="self-start sm:self-center flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search orders by ID or product name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
          />
        </div>

        {/* Status Tabs */}
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => handleStatusChange(tab.value)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="h-5 w-32 bg-gray-200 rounded"></div>
                <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
              </div>
              <div className="flex gap-3 mb-4">
                <div className="w-20 h-20 bg-gray-200 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 w-48 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 w-24 bg-gray-200 rounded"></div>
                </div>
              </div>
              <div className="h-10 w-full bg-gray-100 rounded-lg"></div>
            </div>
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-xl border border-gray-200 p-8 sm:p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {statusFilter ? `No ${statusFilter} orders` : searchQuery ? 'No matching orders' : 'No orders yet'}
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            {statusFilter
              ? `You don't have any ${statusFilter} orders at the moment.`
              : searchQuery
              ? 'Try adjusting your search query'
              : "Looks like you haven't placed any orders yet. Start shopping to see your orders here!"}
          </p>
          {!statusFilter && !searchQuery && (
            <Link
              to="/products"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
            >
              <ShoppingBag className="w-5 h-5" />
              Start Shopping
            </Link>
          )}
          {(statusFilter || searchQuery) && (
            <button
              onClick={() => {
                setStatusFilter('');
                setSearchQuery('');
                setSearchParams({ page: '1' });
              }}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        /* Orders List */
        <>
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order._id}
                order={order}
                onReorder={handleReorder}
                isReordering={reorderingOrderId === order._id}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center pt-4">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Orders;
