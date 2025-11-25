// FILE: apps/web/src/components/tracking/OrderTimeline.jsx
import { formatDate } from '@/utils/format';
import { Package, CreditCard, Box, Truck, Home, CheckCircle } from 'lucide-react';

const OrderTimeline = ({ events = [] }) => {
  const getIcon = (status) => {
    const icons = {
      placed: Package,
      paid: CreditCard,
      packed: Box,
      shipped: Truck,
      out_for_delivery: Truck,
      delivered: Home,
    };
    return icons[status] || CheckCircle;
  };

  const getStatusColor = (status) => {
    const colors = {
      placed: 'bg-primary-600',
      paid: 'bg-green-600',
      packed: 'bg-secondary-600',
      shipped: 'bg-orange-600',
      out_for_delivery: 'bg-yellow-600',
      delivered: 'bg-green-600',
    };
    return colors[status] || 'bg-gray-600';
  };

  return (
    <div className="relative">
      {events.map((event, index) => {
        const Icon = getIcon(event.status);
        const isLatest = index === events.length - 1;

        return (
          <div key={index} className="flex gap-4 pb-8 last:pb-0">
            <div className="flex flex-col items-center">
              <div
                className={`w-12 h-12 rounded-full ${getStatusColor(
                  event.status
                )} flex items-center justify-center text-white shadow-lg`}
              >
                <Icon className="w-6 h-6" />
              </div>
              {index < events.length - 1 && (
                <div className="w-0.5 h-full bg-gray-300 mt-2" />
              )}
            </div>

            <div className={`flex-1 ${!isLatest ? 'pb-4' : ''}`}>
              <div className="bg-white rounded-lg border p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg capitalize">
                    {event.status.replace(/_/g, ' ')}
                  </h3>
                  {isLatest && (
                    <span className="bg-primary-100 text-primary-800 text-xs font-semibold px-2 py-1 rounded">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-gray-700 text-sm mb-2">{event.description}</p>
                <p className="text-xs text-gray-500">{formatDate(event.timestamp)}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OrderTimeline;