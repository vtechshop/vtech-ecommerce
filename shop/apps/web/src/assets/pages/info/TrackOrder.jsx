import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Package, Truck, CheckCircle, MapPin, Clock, Box, CircleDot } from 'lucide-react';
import api from '../../utils/api';

const TrackOrder = () => {
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [tracking, setTracking] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTrack = async (e) => {
    e.preventDefault();
    setError('');
    setTracking(null);
    setLoading(true);

    if (!orderNumber || !email) {
      setError('Please enter both order number and email address');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/orders/track', {
        orderId: orderNumber,
        email: email
      });

      if (response.data.success) {
        setTracking(response.data.data);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Order not found. Please check your order number and email address.');
      } else if (err.response?.status === 403) {
        setError('Access denied. Please verify your email address matches the order.');
      } else {
        setError('Failed to track order. Please try again later.');
      }
      console.error('Track order error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleString('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateShort = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    });
  };

  // Amazon-style progress steps
  const progressSteps = [
    { key: 'ordered', label: 'Ordered', statuses: ['pending', 'placed', 'paid'] },
    { key: 'packed', label: 'Packed', statuses: ['packed'] },
    { key: 'shipped', label: 'Shipped', statuses: ['shipped'] },
    { key: 'out_for_delivery', label: 'Out for Delivery', statuses: ['out_for_delivery'] },
    { key: 'delivered', label: 'Delivered', statuses: ['delivered'] },
  ];

  const getStepIndex = (status) => {
    if (status === 'cancelled' || status === 'returned') return -1;
    for (let i = progressSteps.length - 1; i >= 0; i--) {
      if (progressSteps[i].statuses.includes(status)) return i;
    }
    return 0;
  };

  const getStatusLabel = (status) => {
    const map = {
      pending: 'Order Pending',
      placed: 'Order Placed',
      paid: 'Payment Confirmed',
      packed: 'Order Packed',
      shipped: 'Shipped',
      out_for_delivery: 'Out for Delivery',
      delivered: 'Delivered',
      cancelled: 'Order Cancelled',
      returned: 'Order Returned',
    };
    return map[status] || status;
  };

  const renderProgressBar = () => {
    const currentStep = getStepIndex(tracking.status);
    const isCancelled = tracking.status === 'cancelled' || tracking.status === 'returned';

    if (isCancelled) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-3">
            <Package className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-red-700">{getStatusLabel(tracking.status)}</h3>
          <p className="text-sm text-red-600 mt-1">This order has been {tracking.status}.</p>
        </div>
      );
    }

    return (
      <div className="py-4">
        {/* Step labels and progress bar */}
        <div className="relative">
          {/* Background bar */}
          <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 mx-8" />
          {/* Active bar */}
          <div
            className="absolute top-5 left-0 h-1 bg-green-500 mx-8 transition-all duration-500"
            style={{ width: `${Math.max(0, (currentStep / (progressSteps.length - 1)) * 100)}%`, maxWidth: 'calc(100% - 4rem)' }}
          />

          {/* Steps */}
          <div className="relative flex justify-between">
            {progressSteps.map((step, index) => {
              const isCompleted = index <= currentStep;
              const isCurrent = index === currentStep;

              return (
                <div key={step.key} className="flex flex-col items-center" style={{ width: `${100 / progressSteps.length}%` }}>
                  {/* Circle */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center z-10 border-2 transition-all ${
                      isCompleted
                        ? 'bg-green-500 border-green-500'
                        : 'bg-white border-gray-300'
                    } ${isCurrent ? 'ring-4 ring-green-100' : ''}`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5 text-white" />
                    ) : (
                      <CircleDot className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  {/* Label */}
                  <span className={`mt-2 text-xs font-medium text-center ${
                    isCompleted ? 'text-green-700' : 'text-gray-500'
                  } ${isCurrent ? 'font-bold' : ''}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderTrackingEvents = () => {
    const events = tracking.shipment?.events || tracking.events || [];

    if (events.length === 0) {
      return (
        <div className="text-center py-6 text-gray-500">
          <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">Detailed tracking info will appear once the order is shipped.</p>
        </div>
      );
    }

    return (
      <div className="relative ml-4">
        {/* Vertical line */}
        <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-200" />

        <div className="space-y-0">
          {events.map((event, index) => {
            const isLatest = index === 0;
            return (
              <div key={index} className="relative flex items-start pb-6 last:pb-0">
                {/* Dot */}
                <div className={`relative z-10 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                  isLatest ? 'bg-green-500' : 'bg-gray-300'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${isLatest ? 'bg-white' : 'bg-white'}`} />
                </div>

                {/* Content */}
                <div className="ml-4 flex-1 min-w-0">
                  <p className={`text-sm font-medium ${isLatest ? 'text-gray-900' : 'text-gray-600'}`}>
                    {event.description || event.code}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {event.location && (
                      <span className="text-xs text-gray-500 flex items-center">
                        <MapPin className="w-3 h-3 mr-0.5" />
                        {event.location}
                      </span>
                    )}
                    {event.timestamp && (
                      <span className="text-xs text-gray-400">
                        {formatDate(event.timestamp)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 max-w-3xl">

        {/* Search Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Track Your Order</h1>
          <p className="text-sm text-gray-600 mb-4">
            Enter your order number and email to see the latest status
          </p>

          <form onSubmit={handleTrack} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="orderNumber" className="block text-xs font-medium text-gray-700 mb-1">
                  Order Number
                </label>
                <input
                  type="text"
                  id="orderNumber"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="e.g., ORD-12345"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-xs font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto bg-amber-400 hover:bg-amber-500 text-gray-900 py-2.5 px-8 rounded-md font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Search className="w-4 h-4" />
              {loading ? 'Tracking...' : 'Track Order'}
            </button>
          </form>
        </div>

        {/* Tracking Results - Amazon Style */}
        {tracking && (
          <div className="space-y-4">
            {/* Main Status Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Green header bar */}
              <div className={`px-6 py-3 ${
                tracking.status === 'delivered' ? 'bg-green-600' :
                tracking.status === 'cancelled' || tracking.status === 'returned' ? 'bg-red-600' :
                'bg-blue-600'
              }`}>
                <h2 className="text-white font-bold text-lg">
                  {getStatusLabel(tracking.status)}
                </h2>
                {tracking.shipment?.estimatedDelivery && tracking.status !== 'delivered' && (
                  <p className="text-white/90 text-sm">
                    Expected by {formatDateShort(tracking.shipment.estimatedDelivery)}
                  </p>
                )}
              </div>

              {/* Progress Bar */}
              <div className="px-6 py-4 border-b border-gray-100">
                {renderProgressBar()}
              </div>

              {/* Order Info */}
              <div className="px-6 py-4">
                <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Order: </span>
                    <span className="font-semibold text-gray-900">{tracking.orderId}</span>
                  </div>
                  {tracking.shipment?.carrier && (
                    <div>
                      <span className="text-gray-500">Carrier: </span>
                      <span className="font-semibold text-gray-900 capitalize">{tracking.shipment.carrier}</span>
                    </div>
                  )}
                  {tracking.shipment?.awb && (
                    <div>
                      <span className="text-gray-500">Tracking #: </span>
                      <span className="font-semibold text-gray-900 font-mono">{tracking.shipment.awb}</span>
                    </div>
                  )}
                  {tracking.itemCount > 0 && (
                    <div>
                      <span className="text-gray-500">Items: </span>
                      <span className="font-semibold text-gray-900">{tracking.itemCount}</span>
                    </div>
                  )}
                </div>

                {/* Tracking URL link */}
                {tracking.shipment?.trackingUrl && (
                  <a
                    href={tracking.shipment.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-3 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    <Truck className="w-4 h-4" />
                    Track on {tracking.shipment.carrier || 'carrier'} website
                  </a>
                )}
              </div>
            </div>

            {/* Tracking Events */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Box className="w-5 h-5 text-gray-600" />
                Tracking Details
              </h3>
              {renderTrackingEvents()}
            </div>

            {/* Order Summary */}
            {tracking.totals && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-3">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-gray-900">&#8377;{tracking.totals.subtotal?.toFixed(2)}</span>
                  </div>
                  {tracking.totals.shipping > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Shipping</span>
                      <span className="text-gray-900">&#8377;{tracking.totals.shipping?.toFixed(2)}</span>
                    </div>
                  )}
                  {tracking.totals.tax > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tax</span>
                      <span className="text-gray-900">&#8377;{tracking.totals.tax?.toFixed(2)}</span>
                    </div>
                  )}
                  {tracking.totals.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-&#8377;{tracking.totals.discount?.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2 font-bold">
                    <span className="text-gray-900">Total</span>
                    <span className="text-gray-900">&#8377;{tracking.totals.total?.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Help */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-700">
                Need help with your order?{' '}
                <Link to="/page/contact" className="text-blue-600 hover:text-blue-700 font-medium">
                  Contact our support team
                </Link>
              </p>
            </div>
          </div>
        )}

        {/* Help Text - before search */}
        {!tracking && !error && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 mt-2">
            <h3 className="font-semibold text-gray-900 mb-2">Can't find your order number?</h3>
            <ul className="text-sm text-gray-700 space-y-1.5">
              <li>- Check your email confirmation for the order number</li>
              <li>- Log in to your account to view all your orders</li>
              <li>- Contact customer support at vtechshop.customercare@gmail.com</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackOrder;
