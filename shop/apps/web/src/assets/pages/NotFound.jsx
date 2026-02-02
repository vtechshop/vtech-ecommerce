import { Link } from 'react-router-dom';
import { Home, Search, ArrowLeft, ShoppingBag } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        {/* 404 Number */}
        <div className="relative mb-8">
          <h1 className="text-[150px] font-bold text-blue-200 leading-none select-none">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 bg-blue-500 rounded-full flex items-center justify-center shadow-2xl">
              <ShoppingBag className="w-16 h-16 text-white" />
            </div>
          </div>
        </div>

        {/* Message */}
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Page Not Found
        </h2>
        <p className="text-gray-600 mb-8 text-lg">
          Oops! The page you're looking for doesn't exist or has been moved.
          Let's get you back on track.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            <Home className="w-5 h-5 mr-2" />
            Go Home
          </Link>
          <Link
            to="/products"
            className="inline-flex items-center justify-center bg-white text-gray-700 px-6 py-3 rounded-xl hover:bg-blue-100 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl border border-gray-200 transform hover:-translate-y-1"
          >
            <Search className="w-5 h-5 mr-2" />
            Search Products
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center bg-blue-100 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-200 transition-all duration-300 font-semibold transform hover:-translate-y-1"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Go Back
          </button>
        </div>

        {/* Help Text */}
        <p className="mt-8 text-gray-500 text-sm">
          Need help? <Link to="/page/contact" className="text-blue-600 hover:underline">Contact Support</Link>
        </p>
      </div>
    </div>
  );
};

export default NotFound;
