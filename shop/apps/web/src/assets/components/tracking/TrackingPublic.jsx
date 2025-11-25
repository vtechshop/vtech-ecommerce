
// FILE: apps/web/src/components/tracking/OrderTimeline.jsx
import { formatDateTime } from '@/utils/format';

const OrderTimeline = ({ order }) => {
  const events = order.shipment?.events || [];
  
  // Combine order events with shipment events
  const allEvents = [
    { code: 'PLACED', description: 'Order placed', timestamp: order.createdAt },
    ...(order.payment?.status === 'paid' ? [{ code: 'PAID', description: 'Payment confirmed', timestamp: order.payment.paidAt }] : []),
    ...events,
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const getEventIcon = (code) => {
    const icons = {
      PLACED: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      ),
      PAID: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      ),
      PACKED: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      ),
      SHIPPED: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      ),
      IN_TRANSIT: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      ),
      OUT_FOR_DELIVERY: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      ),
      DELIVERED: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      ),
      FAILED: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      ),
    };
    return icons[code] || icons.IN_TRANSIT;
  };

  const getEventColor = (code) => {
    const colors = {
      PLACED: 'bg-primary-100 text-blue-600',
      PAID: 'bg-green-100 text-green-600',
      PACKED: 'bg-secondary-100 text-secondary-600',
      SHIPPED: 'bg-primary-100 text-blue-600',
      IN_TRANSIT: 'bg-yellow-100 text-yellow-600',
      OUT_FOR_DELIVERY: 'bg-orange-100 text-orange-600',
      DELIVERED: 'bg-green-100 text-green-600',
      FAILED: 'bg-red-100 text-red-600',
    };
    return colors[code] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="mb-6">
      <h3 className="font-semibold mb-4">Order Timeline</h3>
      <div className="space-y-4">
        {allEvents.map((event, index) => (
          <div key={index} className="flex gap-4">
            <div className="relative">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center ${getEventColor(
                  event.code
                )}`}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {getEventIcon(event.code)}
                </svg>
              </div>
              {index < allEvents.length - 1 && (
                <div className="absolute top-12 left-6 w-0.5 h-8 bg-gray-200"></div>
              )}
            </div>
            <div className="flex-1 pb-8">
              <p className="font-semibold">{event.description}</p>
              <p className="text-sm text-gray-700">{formatDateTime(event.timestamp)}</p>
              {event.location && (
                <p className="text-sm text-gray-500 mt-1">
                  <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {event.location}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderTimeline;