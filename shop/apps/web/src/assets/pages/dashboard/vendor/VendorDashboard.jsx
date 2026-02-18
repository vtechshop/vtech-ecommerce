// FILE: apps/web/src/pages/dashboard/vendor/VendorDashboard.jsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '@/utils/api';
import Spinner from '@/components/common/Spinner';
import { formatCurrency } from '@/utils/format';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle, Package, AlertTriangle, Star, ChevronRight, RefreshCw } from 'lucide-react';

// Time period options
const TIME_PERIODS = [
  { value: 'today', label: 'Today' },
  { value: '7days', label: '7 Days' },
  { value: '30days', label: '30 Days' },
  { value: 'month', label: 'This Month' },
];

// Trend indicator component
const TrendIndicator = ({ current, previous, suffix = '' }) => {
  if (!previous || previous === 0) return null;
  const change = ((current - previous) / previous) * 100;
  const isPositive = change >= 0;

  return (
    <span className={`inline-flex items-center text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
      {isPositive ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
      {Math.abs(change).toFixed(1)}%{suffix}
    </span>
  );
};

const VendorDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const [period, setPeriod] = useState('30days');

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['vendor-stats', user?._id, period],
    queryFn: async () => {
      const response = await api.get(`/vendors/dashboard/stats?period=${period}`);
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  // Pending actions for alert banner
  const pendingOrders = stats?.pendingOrders || 0;
  const lowStockProducts = stats?.lowStockProducts || 0;
  const pendingReviews = stats?.pendingReviews || 0;
  const totalPendingActions = pendingOrders + lowStockProducts + pendingReviews;

  // Sales chart data from API or mock
  const salesData = stats?.salesChart || [
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
      {/* Header with Title and Time Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-3xl md:text-4xl font-bold fade-in-down">Vendor Dashboard</h1>

        <div className="flex items-center gap-3">
          <button onClick={refetch} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>

          {/* Time Period Tabs */}
          <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          {TIME_PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                period === p.value
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {p.label}
            </button>
          ))}
          </div>
        </div>
      </div>

      {/* Alert Banner - Pending Actions */}
      {totalPendingActions > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 fade-in">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-800 text-sm mb-2">
                You have {totalPendingActions} item{totalPendingActions > 1 ? 's' : ''} that need attention
              </h3>
              <div className="flex flex-wrap gap-3 text-sm">
                {pendingOrders > 0 && (
                  <Link to="/vendor-dashboard/orders?status=pending" className="inline-flex items-center gap-1.5 text-amber-700 hover:text-amber-900 bg-amber-100 px-2.5 py-1 rounded-full">
                    <Package className="w-3.5 h-3.5" />
                    {pendingOrders} orders to ship
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
                {lowStockProducts > 0 && (
                  <Link to="/vendor-dashboard/inventory?filter=low-stock" className="inline-flex items-center gap-1.5 text-amber-700 hover:text-amber-900 bg-amber-100 px-2.5 py-1 rounded-full">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {lowStockProducts} low stock items
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
                {pendingReviews > 0 && (
                  <Link to="/vendor-dashboard/reviews" className="inline-flex items-center gap-1.5 text-amber-700 hover:text-amber-900 bg-amber-100 px-2.5 py-1 rounded-full">
                    <Star className="w-3.5 h-3.5" />
                    {pendingReviews} reviews to respond
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid with Trend Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 fade-in stagger-1 hover-lift">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-700 text-sm font-medium">Total Products</h3>
            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="text-3xl font-bold">{stats?.totalProducts || 0}</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm text-green-600">+{stats?.activeProducts || 0} active</span>
            <TrendIndicator
              current={stats?.totalProducts}
              previous={stats?.previousPeriod?.totalProducts}
              suffix=""
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 fade-in stagger-2 hover-lift">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-700 text-sm font-medium">Total Orders</h3>
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <p className="text-3xl font-bold">{stats?.totalOrders || 0}</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm text-orange-600">{stats?.pendingOrders || 0} pending</span>
            <TrendIndicator
              current={stats?.totalOrders}
              previous={stats?.previousPeriod?.totalOrders}
              suffix=""
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 fade-in stagger-3 hover-lift">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-700 text-sm font-medium">Total Sales</h3>
            <svg className="w-8 h-8 text-secondary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(stats?.totalSales || 0)}</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm text-gray-500">This {period === 'month' ? 'month' : 'period'}</span>
            <TrendIndicator
              current={stats?.totalSales}
              previous={stats?.previousPeriod?.totalSales}
              suffix=""
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 fade-in stagger-4 hover-lift">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-700 text-sm font-medium">Earnings</h3>
            <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(stats?.totalEarnings || 0)}</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm text-gray-500">Total earnings</span>
            <TrendIndicator
              current={stats?.totalEarnings}
              previous={stats?.previousPeriod?.totalEarnings}
              suffix=""
            />
          </div>
        </div>
      </div>

      {/* Sales Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8 fade-in-up hover-lift">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-bold fade-in-down">Sales Overview</h2>
          {stats?.previousPeriod?.totalSales > 0 && (
            <TrendIndicator
              current={stats?.totalSales}
              previous={stats?.previousPeriod?.totalSales}
              suffix=" vs prev period"
            />
          )}
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={salesData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Line type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={2} dot={{ fill: '#2563eb' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/vendor-dashboard/products" className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all fade-in stagger-1 hover-lift group">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg mb-2">Manage Products</h3>
              <p className="text-gray-700 text-sm">Add, edit, or remove products from your store</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
          </div>
        </Link>

        <Link to="/vendor-dashboard/orders" className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all fade-in stagger-2 hover-lift group">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg mb-2">Process Orders</h3>
              <p className="text-gray-700 text-sm">View and fulfill customer orders</p>
            </div>
            <div className="flex items-center gap-2">
              {pendingOrders > 0 && (
                <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-1 rounded-full">
                  {pendingOrders}
                </span>
              )}
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
            </div>
          </div>
        </Link>

        <Link to="/vendor-dashboard/ads" className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all fade-in stagger-3 hover-lift group">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg mb-2">Sponsored Ads</h3>
              <p className="text-gray-700 text-sm">Create campaigns to promote your products</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
          </div>
        </Link>
      </div>
    </div>
  );
};

export default VendorDashboard;
