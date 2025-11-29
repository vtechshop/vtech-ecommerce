// FILE: apps/web/src/pages/dashboard/customer/CustomerDashboard.jsx
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import api from '@/utils/api';
import Spinner from '@/components/common/Spinner';
import { formatCurrency, formatDate } from '@/utils/format';

const CustomerDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['customer-stats'],
    queryFn: async () => {
      const response = await api.get('/user/stats');
      return response.data.data;
    },
  });

  const { data: recentOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['recent-orders'],
    queryFn: async () => {
      const response = await api.get('/orders?limit=5&sort=-createdAt');
      return response.data.data;
    },
  });

  if (statsLoading || ordersLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl md:text-4xl font-bold mb-8">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-700 text-sm font-medium">Total Spent</h3>
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(stats?.totalSpent || 0)}</p>
        </div>
      </div>

      {/* Upgrade Options - Only show for customers, not for admin/vendor/affiliate */}
      {user?.role === 'customer' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Link to="/dashboard/become-vendor" className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow text-white">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 rounded-full p-3">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Become a Vendor</h3>
                <p className="text-sm text-primary-100">Start selling your products on our platform</p>
              </div>
            </div>
          </Link>

          <Link to="/dashboard/become-affiliate" className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow text-white">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 rounded-full p-3">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Become an Affiliate</h3>
                <p className="text-sm text-green-100">Earn commissions by promoting products</p>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Recent Orders */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl md:text-2xl font-bold">Recent Orders</h2>
          <Link to="/dashboard/orders" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
            View All →
          </Link>
        </div>

        {recentOrders && recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-sm">Order ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Total</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order._id} className="border-b last:border-b-0">
                    <td className="py-3 px-3 sm:px-4">
                      <span className="font-mono text-sm">{order.orderId}</span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="py-3 px-3 sm:px-4">
                      <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-primary-100 text-primary-800">
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold">
                      {formatCurrency(order.totals?.total || 0)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/dashboard/orders/${order._id}`}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-700">
            <p>No orders yet</p>
            <Link to="/search" className="text-blue-600 hover:underline mt-2 inline-block">
              Start Shopping
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDashboard;