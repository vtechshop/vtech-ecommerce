// FILE: apps/web/src/pages/dashboard/customer/Orders.jsx
import { useState, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { RotateCcw } from 'lucide-react';
import api from '@/utils/api';
import { addToCart } from '@/store/slices/cartSlice';
import { reorderItems, canReorder } from '@/utils/reorder';
import { useToast } from '@/components/common/ToastContainer';
import Pagination from '@/components/common/Pagination';
import Spinner from '@/components/common/Spinner';
import CustomSelect from '@/components/common/CustomSelect';
import { formatCurrency, formatDate } from '@/utils/format';
import { PLACEHOLDER_IMAGE_SM, handleImageError } from '@/utils/placeholders';

const Orders = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1', 10);
  const initialStatus = searchParams.get('status') || '';
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [reorderingOrderId, setReorderingOrderId] = useState(null);

  const queryKey = useMemo(() => ['orders', page, statusFilter], [page, statusFilter]);

  const { data, isLoading } = useQuery({
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

        // Show details if some items couldn't be added
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

        // Navigate to cart after a short delay
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

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const orders = data?.data || [];
  const totalPages = Math.ceil((data?.meta?.total || 0) / 10);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">My Orders</h1>
        <CustomSelect
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value);
            setSearchParams({ page: '1', ...(value && { status: value }) });
          }}
          options={[
            { value: '', label: 'All Orders' },
            { value: 'placed', label: 'Placed' },
            { value: 'paid', label: 'Paid' },
            { value: 'packed', label: 'Packed' },
            { value: 'shipped', label: 'Shipped' },
            { value: 'delivered', label: 'Delivered' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
          placeholder="All Orders"
          className="w-48"
        />
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <h3 className="text-xl font-semibold mb-2">No orders found</h3>
          <p className="text-gray-700 mb-6">
            {statusFilter ? `No ${statusFilter} orders` : "You haven't placed any orders yet"}
          </p>
          <Link to="/search">
            <button className="btn btn-primary">Start Shopping</button>
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">Order {order.orderId}</h3>
                    <p className="text-sm text-gray-700">Placed on {formatDate(order.createdAt)}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      order.status === 'delivered'
                        ? 'bg-green-100 text-green-800'
                        : order.status === 'cancelled'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-primary-100 text-primary-800'
                    }`}
                  >
                    {String(order.status || '')
                      .replace(/_/g, ' ')
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                </div>

                {/* Items Preview */}
                <div className="space-y-3 mb-4">
                  {(order.items || []).slice(0, 2).map((item, index) => (
                    <div key={index} className="flex gap-3">
                      <img
                        src={item.image || PLACEHOLDER_IMAGE_SM}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded"
                        onError={(e) => handleImageError(e, PLACEHOLDER_IMAGE_SM)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.name}</p>
                        <p className="text-sm text-gray-700">Qty: {item.qty}</p>
                      </div>
                      <p className="font-semibold">
                        {formatCurrency((item.priceSnapshot || 0) * (item.qty || 0))}
                      </p>
                    </div>
                  ))}
                  {(order.items?.length || 0) > 2 && (
                    <p className="text-sm text-gray-700">
                      +{order.items.length - 2} more item(s)
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <p className="text-sm text-gray-700">Total Amount</p>
                    <p className="text-xl font-bold">{formatCurrency(order.totals?.total || 0)}</p>
                  </div>
                  <div className="flex gap-3">
                    {/* Reorder Button */}
                    {canReorder(order) && (
                      <button
                        onClick={() => handleReorder(order)}
                        disabled={reorderingOrderId === order._id}
                        className="btn btn-outline flex items-center gap-2"
                      >
                        {reorderingOrderId === order._id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                            Reordering...
                          </>
                        ) : (
                          <>
                            <RotateCcw className="w-4 h-4" />
                            Reorder
                          </>
                        )}
                      </button>
                    )}
                    {order.shipment?.awb && (
                      <Link to={`/track-order?orderId=${order.orderId}`}>
                        <button className="btn btn-outline">Track Order</button>
                      </Link>
                    )}
                    <Link to={`/dashboard/orders/${order._id}`}>
                      <button className="btn btn-primary">View Details</button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8">
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
