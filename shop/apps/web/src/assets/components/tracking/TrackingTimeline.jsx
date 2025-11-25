// FILE: apps/web/src/components/tracking/TrackingTimeline.jsx
import { formatDate } from '@/utils/format';
import { Package, Truck, CheckCircle, Clock } from 'lucide-react';

const TrackingTimeline = ({ events = [] }) => {
  const getIcon = (code) => {
    switch (code) {
      case 'DELIVERED':
        return CheckCircle;
      case 'OUT_FOR_DELIVERY':
        return Truck;
      case 'IN_TRANSIT':
        return Truck;
      case 'PICKED_UP':
        return Package;
      default:
        return Clock;
    }
  };

  return (
    <div className="space-y-4">
      {events.map((event, index) => {
        const Icon = getIcon(event.code);
        const isLatest = index === 0;

        return (
          <div key={index} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isLatest
                    ? 'bg-primary-600 text-white'
                    : event.code === 'DELIVERED'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              {index !== events.length - 1 && (
                <div className="w-0.5 h-full bg-gray-300 my-1" />
              )}
            </div>

            <div className="flex-1 pb-8">
              <div className="flex items-start justify-between">
                <div>
                  <p
                    className={`font-semibold ${
                      isLatest ? 'text-blue-600' : ''
                    }`}
                  >
                    {event.description}
                  </p>
                  {event.location && (
                    <p className="text-sm text-gray-700 mt-1">
                      📍 {event.location}
                    </p>
                  )}
                </div>
                {isLatest && (
                  <span className="bg-primary-100 text-primary-800 text-xs font-semibold px-2 py-1 rounded">
                    Latest
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {formatDate(event.timestamp)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TrackingTimeline;