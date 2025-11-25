// FILE: apps/web/src/assets/components/common/TrackingTimeline.jsx
import React from 'react';
import { Package, MapPin, Truck, CheckCircle, Clock, XCircle } from 'lucide-react';

/**
 * TrackingTimeline Component
 * Displays shipment tracking information with visual timeline
 *
 * Props:
 * - tracking: Object with tracking data from Delhivery
 * - order: Order object with status and shipment info
 */
const TrackingTimeline = ({ tracking, order }) => {
  if (!tracking && !order) {
    return null;
  }

  // Get status icon and color
  const getStatusIcon = (status) => {
    const iconProps = { className: "w-6 h-6", strokeWidth: 2 };

    switch (status) {
      case 'delivered':
        return <CheckCircle {...iconProps} className="w-6 h-6 text-green-500" />;
      case 'out_for_delivery':
        return <Truck {...iconProps} className="w-6 h-6 text-blue-500" />;
      case 'shipped':
        return <Package {...iconProps} className="w-6 h-6 text-blue-500" />;
      case 'packed':
        return <Package {...iconProps} className="w-6 h-6 text-yellow-500" />;
      case 'cancelled':
      case 'returned':
        return <XCircle {...iconProps} className="w-6 h-6 text-red-500" />;
      default:
        return <Clock {...iconProps} className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-500';
      case 'out_for_delivery':
      case 'shipped':
        return 'bg-blue-500';
      case 'packed':
        return 'bg-yellow-500';
      case 'cancelled':
      case 'returned':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      pending: 'Order Pending',
      placed: 'Order Placed',
      paid: 'Payment Confirmed',
      packed: 'Order Packed',
      shipped: 'Shipped',
      out_for_delivery: 'Out for Delivery',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
      returned: 'Returned',
    };
    return statusMap[status] || status;
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Display shipment details if available
  const renderShipmentInfo = () => {
    if (!order?.shipment || !order.shipment.awb) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <Clock className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-yellow-800">Awaiting Shipment</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Your order has been {order?.status || 'received'} and will be shipped soon.
                Tracking information will be available once the package is dispatched.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5 mb-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Tracking Number */}
          <div>
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
              Tracking Number
            </p>
            <p className="text-lg font-bold text-gray-900 font-mono">
              {order.shipment.awb}
            </p>
          </div>

          {/* Carrier */}
          <div>
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
              Carrier
            </p>
            <p className="text-lg font-semibold text-gray-900">
              {order.shipment.carrier || 'Delhivery'}
            </p>
          </div>

          {/* Origin & Destination */}
          {tracking?.origin && tracking?.destination && (
            <div className="col-span-1 md:col-span-2">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                Route
              </p>
              <div className="flex items-center text-sm">
                <span className="font-semibold text-gray-900">{tracking.origin}</span>
                <Truck className="w-4 h-4 mx-2 text-blue-500" />
                <span className="font-semibold text-gray-900">{tracking.destination}</span>
              </div>
            </div>
          )}

          {/* Estimated Delivery */}
          {tracking?.estimatedDelivery && order.status !== 'delivered' && (
            <div className="col-span-1 md:col-span-2 lg:col-span-4">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                Estimated Delivery
              </p>
              <p className="text-base font-semibold text-blue-600">
                {formatDate(tracking.estimatedDelivery)}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render tracking timeline
  const renderTimeline = () => {
    // Use Delhivery scans if available, otherwise use order events
    const events = tracking?.scans || order?.shipment?.events || order?.events || [];

    if (events.length === 0) {
      return (
        <p className="text-gray-500 text-center py-8">
          No tracking information available yet.
        </p>
      );
    }

    return (
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

        {/* Timeline events */}
        <div className="space-y-6">
          {events.map((event, index) => {
            const isLatest = index === 0;
            const eventDate = event.timestamp || event.createdAt;
            const eventDescription = event.description || event.status;
            const eventLocation = event.location || '';

            return (
              <div key={index} className="relative flex items-start">
                {/* Timeline dot */}
                <div
                  className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center z-10 ${
                    isLatest ? getStatusColor(order?.status) : 'bg-gray-300'
                  } ${isLatest ? 'ring-4 ring-blue-100' : ''}`}
                >
                  {isLatest ? (
                    getStatusIcon(order?.status)
                  ) : (
                    <MapPin className="w-5 h-5 text-white" />
                  )}
                </div>

                {/* Event content */}
                <div className="ml-4 flex-1 bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className={`font-semibold ${isLatest ? 'text-blue-600' : 'text-gray-800'}`}>
                        {eventDescription}
                      </p>
                      {eventLocation && (
                        <p className="text-sm text-gray-600 mt-1 flex items-center">
                          <MapPin className="w-3.5 h-3.5 mr-1" />
                          {eventLocation}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 ml-4 whitespace-nowrap">
                      {formatDate(eventDate)}
                    </p>
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
    <div className="space-y-6">
      {/* Current Status Header */}
      <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`w-14 h-14 rounded-full ${getStatusColor(order?.status)} flex items-center justify-center`}>
              {getStatusIcon(order?.status)}
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                {getStatusText(order?.status)}
              </h3>
              {tracking?.statusDescription && (
                <p className="text-sm text-gray-600 mt-1">
                  {tracking.statusDescription}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Shipment Information */}
      {renderShipmentInfo()}

      {/* Tracking Timeline */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h4 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
          <Package className="w-5 h-5 mr-2 text-blue-500" />
          Tracking History
        </h4>
        {renderTimeline()}
      </div>

      {/* Delhivery Branding (if using Delhivery) */}
      {order?.shipment?.carrier === 'Delhivery' && (
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Powered by <span className="font-semibold text-red-600">Delhivery</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default TrackingTimeline;
