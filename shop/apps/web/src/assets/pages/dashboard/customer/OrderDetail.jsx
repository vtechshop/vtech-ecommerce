// FILE: apps/web/src/pages/dashboard/customer/OrderDetail.jsx
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import { formatCurrency, formatDate } from '@/utils/format';
import { useToast } from '@/components/common/ToastContainer';
import CancelOrderModal from '@/components/common/CancelOrderModal';
import TrackingTimeline from '@/components/common/TrackingTimeline';
import { PLACEHOLDER_IMAGE_SM, handleImageError } from '@/utils/placeholders';

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showCancelModal, setShowCancelModal] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const response = await api.get(`/orders/${id}`);
      return response.data.data;
    },
  });

  // Fetch tracking information if order has AWB
  const { data: trackingData } = useQuery({
    queryKey: ['tracking', order?.orderId],
    queryFn: async () => {
      const response = await api.get(`/shipping/tracking?orderId=${order.orderId}`);
      return response.data;
    },
    enabled: !!order?.orderId && !!order?.shipment?.awb,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    staleTime: 3 * 60 * 1000, // Consider data stale after 3 minutes
  });

  const cancelMutation = useMutation({
    mutationFn: async (reason) => {
      // Use orderId if available, otherwise use id from URL
      const orderIdToCancel = order?.orderId || id;
      const response = await api.post(`/orders/${orderIdToCancel}/cancel`, { reason });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Order cancelled successfully');
      setShowCancelModal(false);
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to cancel order');
    },
  });

  const handleCancelOrder = () => {
    setShowCancelModal(true);
  };

  const confirmCancelOrder = (reason) => {
    cancelMutation.mutate(reason);
  };

  const handleCloseCancelModal = () => {
    setShowCancelModal(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <h3 className="text-xl font-semibold mb-2">Order not found</h3>
        <Link to="/dashboard/orders">
          <Button variant="primary">Back to Orders</Button>
        </Link>
      </div>
    );
  }

  // Allow cancellation for pending_payment, placed, and paid orders (before shipping)
  const canCancel = ['pending_payment', 'placed', 'paid'].includes(order.status);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/dashboard/orders')}
          className="flex items-center text-gray-700 hover:text-gray-900 mb-4"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Orders
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Order {order.orderId}</h1>
            <p className="text-gray-700">Placed on {formatDate(order.createdAt)}</p>
          </div>
          <span
            className={`px-4 py-2 rounded-full text-sm font-semibold ${
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-xl font-bold mb-4">Order Items</h2>
            <div className="space-y-4">
              {(order.items || []).map((item, index) => (
                <div key={index} className="flex gap-3 pb-4 border-b last:border-b-0">
                  <img
                    src={item.image || PLACEHOLDER_IMAGE_SM}
                    alt={item.name}
                    className="w-20 h-20 object-cover rounded"
                    onError={(e) => handleImageError(e, PLACEHOLDER_IMAGE_SM)}
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{item.name}</h3>
                    <p className="text-sm text-gray-700">Quantity: {item.qty}</p>
                    <p className="text-sm text-gray-700">
                      Price: {formatCurrency(item.priceSnapshot)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      {formatCurrency((item.priceSnapshot || 0) * (item.qty || 0))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-xl font-bold mb-4">Shipping Address</h2>
            {order.shipTo ? (
              <div className="text-gray-700">
                <p className="font-semibold">{order.shipTo.fullName}</p>
                <p>{order.shipTo.phone}</p>
                <p className="mt-2">
                  {order.shipTo.addressLine1}
                  {order.shipTo.addressLine2 && `, ${order.shipTo.addressLine2}`}
                </p>
                <p>
                  {order.shipTo.city}, {order.shipTo.state}{' '}
                  {order.shipTo.zipCode}
                </p>
                <p>{order.shipTo.country}</p>
              </div>
            ) : (
              <p className="text-gray-500">No shipping address available</p>
            )}
          </div>

          {/* Tracking Info - Enhanced with Delhivery Integration */}
          {(order.status !== 'pending' && order.status !== 'placed' && order.status !== 'cancelled') && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <h2 className="text-xl font-bold mb-4">Shipment Tracking</h2>
              <TrackingTimeline
                tracking={trackingData?.tracking}
                order={trackingData?.order || order}
              />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-xl font-bold mb-4">Order Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal:</span>
                <span>{formatCurrency(order.totals?.subtotal || 0)}</span>
              </div>
              {order.totals?.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span>-{formatCurrency(order.totals.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-700">
                <span>Shipping:</span>
                <span>{formatCurrency(order.totals?.shipping || 0)}</span>
              </div>
              {order.totals?.tax > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Tax:</span>
                  <span>{formatCurrency(order.totals.tax)}</span>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>{formatCurrency(order.totals?.total || 0)}</span>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-xl font-bold mb-4">Payment Information</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-700">Method:</span>
                <span className="font-semibold capitalize">
                  {order.payment?.method || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Status:</span>
                <span
                  className={`font-semibold ${
                    order.payment?.status === 'paid' ? 'text-green-600' : 'text-orange-600'
                  }`}
                >
                  {String(order.payment?.status || 'pending')
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
              </div>
              {order.payment?.transactionId && (
                <div className="flex justify-between">
                  <span className="text-gray-700">Transaction ID:</span>
                  <span className="text-sm font-mono">{order.payment.transactionId}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {canCancel && (
            <Button
              variant="danger"
              fullWidth
              onClick={handleCancelOrder}
              loading={cancelMutation.isPending}
            >
              Cancel Order
            </Button>
          )}

          {order.status === 'delivered' && (
            <Button variant="outline" fullWidth>
              Request Return
            </Button>
          )}
        </div>
      </div>

      {/* Cancel Order Modal with Reason */}
      <CancelOrderModal
        isOpen={showCancelModal}
        onClose={handleCloseCancelModal}
        onConfirm={confirmCancelOrder}
        isLoading={cancelMutation.isPending}
        orderId={order?.orderId}
      />
    </div>
  );
};

export default OrderDetail;
