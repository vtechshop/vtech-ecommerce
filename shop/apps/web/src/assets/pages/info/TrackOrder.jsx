import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import api from '../../utils/api';
import TrackingTimeline from '../../components/common/TrackingTimeline';

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
      // Fetch tracking information
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

  return (
    <div className="min-h-screen bg-blue-100 py-12">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 max-w-screen-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Track Your Order</h1>
          <p className="text-gray-700">
            Enter your order number and email address to track your shipment
          </p>
        </div>

        {/* Track Form */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <form onSubmit={handleTrack} className="space-y-6">
            <div>
              <label htmlFor="orderNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Order Number
              </label>
              <input
                type="text"
                id="orderNumber"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="e.g., ORD-12345"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white py-3 px-6 rounded-md hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Search className="w-5 h-5" />
              {loading ? 'Tracking...' : 'Track Order'}
            </button>
          </form>
        </div>

        {/* Tracking Results */}
        {tracking && (
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Order #{tracking.orderId}
              </h2>
              <p className="text-gray-600 text-sm">
                Status: <span className="font-medium capitalize">{tracking.status}</span>
              </p>
              {tracking.shipment?.awb && (
                <p className="text-gray-600 text-sm mt-1">
                  AWB: <span className="font-medium">{tracking.shipment.awb}</span>
                  {tracking.shipment.carrier && (
                    <span> ({tracking.shipment.carrier})</span>
                  )}
                </p>
              )}
            </div>

            {/* Tracking Timeline */}
            <TrackingTimeline
              tracking={null}
              order={{
                status: tracking.status,
                shipment: tracking.shipment,
                events: tracking.events,
              }}
            />

            {/* Help Section */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-700">
                Need help with your order?{' '}
                <Link to="/page/contact" className="text-blue-600 hover:text-blue-700 font-medium">
                  Contact our support team
                </Link>
              </p>
            </div>
          </div>
        )}

        {/* Help Text */}
        {!tracking && (
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-6 mt-8">
            <h3 className="font-semibold text-gray-900 mb-2">Can't find your order number?</h3>
            <ul className="text-sm text-primary-800 space-y-2">
              <li>• Check your email confirmation for the order number</li>
              <li>• Log in to your account to view all your orders</li>
              <li>• Contact customer support at vtechshop.customercare@gmail.com</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackOrder;
