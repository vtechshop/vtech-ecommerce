// FILE: apps/web/src/pages/OrderConfirmation.jsx
import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import Spinner from '@/components/common/Spinner';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { trackPurchase } from '@/utils/analytics';

const OrderConfirmation = () => {
  const { orderId } = useParams();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const response = await api.get(`/orders/${orderId}`);
      return response.data.data;
    },
  });

  useEffect(() => {
    if (order) {
      // Track purchase event
      trackPurchase({
        orderId: order.orderId,
        total: order.totals.total,
        items: order.items,
      });

      // Track ad conversions (fire and forget with error handling)
      order.items.forEach(item => {
        if (item.adCampaignId) {
          api.post('/ads/events', {
            campaignId: item.adCampaignId,
            creativeId: item.adCreativeId,
            event: 'conversion',
            orderId: order._id,
            url: window.location.href,
          }).catch(() => {
            // Silent fail for ad tracking - don't disrupt user experience
          });
        }
      });
    }
  }, [order]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Order not found</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50 py-8">
      <div className="container mx-auto px-4 sm:px-6 md:px-8 max-w-4xl">
      <div className="py-4">
        {/* Success Message */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6 text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-green-900 mb-2">Order Confirmed!</h1>
          <p className="text-green-700 mb-4">
            Thank you for your order. We've sent a confirmation email to your inbox.
          </p>
          <p className="text-sm text-green-600">
            Order ID: <span className="font-mono font-semibold">{order.orderId}</span>
          </p>
        </div>

        {/* Order Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Order Details</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-700">Order Date</p>
              <p className="font-medium">{formatDateTime(order.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-700">Payment Status</p>
              <p className="font-medium capitalize">
                {order.payment.status === 'cod'
                  ? 'Cash on Delivery'
                  : order.payment.status}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-700">Order Status</p>
              <p className="font-medium capitalize">{order.status}</p>
            </div>
            <div>
              <p className="text-sm text-gray-700">Total Amount</p>
              <p className="font-bold text-lg">{formatCurrency(order.totals.total)}</p>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">Shipping Address</h3>
            <p>{order.shipTo.fullName}</p>
            <p className="text-sm text-gray-700">
              {order.shipTo.addressLine1}
              {order.shipTo.addressLine2 && `, ${order.shipTo.addressLine2}`}
            </p>
            <p className="text-sm text-gray-700">
              {order.shipTo.city}, {order.shipTo.state} {order.shipTo.zipCode}
            </p>
            <p className="text-sm text-gray-700">{order.shipTo.phone}</p>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Items Ordered</h2>
          <div className="space-y-4">
            {order.items.map((item, index) => (
              <div key={index} className="flex gap-3 pb-4 border-b last:border-b-0">
                <img
                  src={item.image || '/placeholder.png'}
                  alt={item.name}
                  className="w-20 h-20 object-cover rounded"
                />
                <div className="flex-1">
                  <p className="font-semibold">{item.name}</p>
                  {item.variantName && (
                    <p className="text-sm text-gray-700">Variant: {item.variantName}</p>
                  )}
                  <p className="text-sm text-gray-700">Qty: {item.qty}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatCurrency(item.priceSnapshot * item.qty)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Order Totals */}
          <div className="border-t mt-3 pt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">Subtotal:</span>
              <span>{formatCurrency(order.totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">Shipping:</span>
              <span>{formatCurrency(order.totals.shipping)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">Tax:</span>
              <span>{formatCurrency(order.totals.tax)}</span>
            </div>
            {order.totals.discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount:</span>
                <span>-{formatCurrency(order.totals.discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total:</span>
              <span>{formatCurrency(order.totals.total)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pb-8">
          <Link to="/dashboard/orders" className="flex-1">
            <button className="btn btn-primary w-full">
              View All Orders
            </button>
          </Link>
          <Link to="/" className="flex-1">
            <button className="btn btn-outline w-full">
              Continue Shopping
            </button>
          </Link>
        </div>
      </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;