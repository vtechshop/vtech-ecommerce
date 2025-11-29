// FILE: apps/web/src/pages/TrackOrder.jsx
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import OrderTimeline from '@/components/tracking/OrderTimeline';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { PLACEHOLDER_IMAGE_SM, handleImageError } from '@/utils/placeholders';

const TrackOrder = () => {
  const [orderId, setOrderId] = useState('');
  const [email, setEmail] = useState('');
  const [order, setOrder] = useState(null);

  const trackMutation = useMutation({
    mutationFn: async ({ orderId, email }) => {
      const response = await api.post('/orders/track', { orderId, email });
      return response.data.data;
    },
    onSuccess: (data) => {
      setOrder(data);
    },
    onError: (error) => {
      alert(error?.response?.data?.error?.message || 'Order not found');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    trackMutation.mutate({ orderId, email });
  };

  return (
    <div className="min-h-screen bg-blue-50 px-[10%] py-[50px]">
      <div className="container mx-auto px-3 sm:px-4 md:px-6">
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-2">Track Your Order</h1>
        <p className="text-gray-700 mb-8">
          Enter your order ID and email address to track your shipment
        </p>

        {/* Track Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <Input
                label="Order ID"
                placeholder="e.g., ORD-123456"
                required
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
              />
              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={trackMutation.isPending || trackMutation.isLoading}
              >
                Track Order
              </Button>
            </div>
          </form>
        </div>

        {/* Order Details */}
        {order && (
          <>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Order {order.orderId}</h2>
                  <p className="text-gray-700">
                    Placed on {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
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

              {/* Shipping Info */}
              {order.shipment?.carrier && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold mb-2">Shipping Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-700">Carrier:</p>
                      <p className="font-medium">{order.shipment.carrier}</p>
                    </div>
                    <div>
                      <p className="text-gray-700">Tracking Number:</p>
                      <p className="font-medium font-mono">{order.shipment.awb}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tracking Timeline */}
              <OrderTimeline order={order} />

              {/* Items */}
              <div className="border-t pt-6 mt-6">
                <h3 className="font-semibold mb-4">Items in this order</h3>
                <div className="space-y-4">
                  {(order.items || []).map((item, index) => (
                    <div key={index} className="flex gap-4">
                      <img
                        src={item.image || PLACEHOLDER_IMAGE_SM}
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded"
                        onError={(e) => handleImageError(e, PLACEHOLDER_IMAGE_SM)}
                      />
                      <div className="flex-1">
                        <p className="font-semibold">{item.name}</p>
                        {item.variantName && (
                          <p className="text-sm text-gray-700">
                            Variant: {item.variantName}
                          </p>
                        )}
                        <p className="text-sm text-gray-700">Qty: {item.qty}</p>
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
              {order.shipTo && (
                <div className="border-t pt-6 mt-6">
                  <h3 className="font-semibold mb-2">Shipping Address</h3>
                  {order.shipTo.fullName && <p>{order.shipTo.fullName}</p>}
                  <p className="text-sm text-gray-700">
                    {order.shipTo.addressLine1}
                    {order.shipTo.addressLine2 && `, ${order.shipTo.addressLine2}`}
                  </p>
                  <p className="text-sm text-gray-700">
                    {order.shipTo.city}, {order.shipTo.state} {order.shipTo.zipCode}
                  </p>
                  {order.shipTo.phone && (
                    <p className="text-sm text-gray-700">{order.shipTo.phone}</p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
};

export default TrackOrder;
