// FILE: apps/web/src/components/tracking/TrackingMap.jsx
const TrackingMap = ({ origin, destination, currentLocation }) => {
  // This is a placeholder - in production, integrate with Google Maps or similar
  return (
    <div className="bg-gray-100 rounded-lg p-8 text-center">
      <p className="text-gray-700 mb-4">📦 Package Location</p>
      <div className="bg-white rounded-lg p-6 inline-block">
        <p className="text-sm text-gray-700">From: {origin}</p>
        <div className="my-4">
          <div className="w-48 h-1 bg-gray-300 relative">
            <div className="absolute left-1/2 -translate-x-1/2 -top-2 w-4 h-4 bg-primary-600 rounded-full animate-pulse" />
          </div>
        </div>
        <p className="text-sm text-gray-700">To: {destination}</p>
      </div>
      <p className="text-xs text-gray-500 mt-4">
        Map integration available in full version
      </p>
    </div>
  );
};

export default TrackingMap;