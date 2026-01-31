// FILE: apps/web/src/pages/dashboard/vendor/VendorDashboard.jsx
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '@/utils/api';
import Spinner from '@/components/common/Spinner';
import { formatCurrency } from '@/utils/format';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const VendorDashboard = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['vendor-stats'],
    queryFn: async () => {
      const response = await api.get('/vendors/dashboard/stats');
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const mockData = [
    { name: 'Mon', sales: 1200 },
    { name: 'Tue', sales: 1900 },
    { name: 'Wed', sales: 1500 },
    { name: 'Thu', sales: 2100 },
    { name: 'Fri', sales: 2400 },
    { name: 'Sat', sales: 2800 },
    { name: 'Sun', sales: 2200 },
  ];

  return (
    <div>
      <h1 className="text-3xl md:text-4xl font-bold mb-8 fade-in-down">Vendor Dashboard</h1>

      {/* Debug: Remove after verification */}
      {stats?._debug && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg text-xs font-mono">
          <p>VendorID: {stats._debug.vendorId}</p>
          <p>Store: {stats._debug.storeName}</p>
          <p>UserID: {stats._debug.userId}</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 fade-in stagger-1 hover-lift">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-700 text-sm font-medium">Total Products</h3>
            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="text-3xl font-bold">{stats?.totalProducts || 0}</p>
          <p className="text-sm text-green-600 mt-1">+{stats?.activeProducts || 0} active</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 fade-in stagger-2 hover-lift">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-700 text-sm font-medium">Total Orders</h3>
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <p className="text-3xl font-bold">{stats?.totalOrders || 0}</p>
          <p className="text-sm text-orange-600 mt-1">{stats?.pendingOrders || 0} pending</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 fade-in stagger-3 hover-lift">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-700 text-sm font-medium">Total Sales</h3>
            <svg className="w-8 h-8 text-secondary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(stats?.totalSales || 0)}</p>
          <p className="text-sm text-gray-700 mt-1">This month</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 fade-in stagger-4 hover-lift">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-700 text-sm font-medium">Earnings</h3>
            <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(stats?.totalEarnings || 0)}</p>
          <p className="text-sm text-gray-700 mt-1">Total earnings</p>
        </div>
      </div>

      {/* Sales Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8 fade-in-up hover-lift">
        <h2 className="text-xl md:text-2xl font-bold mb-4 fade-in-down">Sales Overview</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mockData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/vendor-dashboard/products" className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all fade-in stagger-1 hover-lift">
          <h3 className="font-semibold text-lg mb-2">Manage Products</h3>
          <p className="text-gray-700 text-sm">Add, edit, or remove products from your store</p>
        </Link>

        <Link to="/vendor-dashboard/orders" className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all fade-in stagger-2 hover-lift">
          <h3 className="font-semibold text-lg mb-2">Process Orders</h3>
          <p className="text-gray-700 text-sm">View and fulfill customer orders</p>
        </Link>

        <Link to="/vendor-dashboard/ads" className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all fade-in stagger-3 hover-lift">
          <h3 className="font-semibold text-lg mb-2">Sponsored Ads</h3>
          <p className="text-gray-700 text-sm">Create campaigns to promote your products</p>
        </Link>
      </div>
    </div>
  );
};

export default VendorDashboard;