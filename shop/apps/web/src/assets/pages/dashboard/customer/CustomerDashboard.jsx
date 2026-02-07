// FILE: apps/web/src/pages/dashboard/customer/CustomerDashboard.jsx
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import {
  Package,
  Heart,
  MapPin,
  TrendingUp,
  Clock,
  CheckCircle,
  ShoppingBag,
  Truck,
  CreditCard,
  Settings,
  Store,
  Users,
  ChevronRight,
  RefreshCw,
  IndianRupee
} from 'lucide-react';
import api from '@/utils/api';
import { formatCurrency, formatDate } from '@/utils/format';
import { PLACEHOLDER_IMAGE_SM, handleImageError } from '@/utils/placeholders';

// Stats Card Component
const StatsCard = ({ icon: Icon, label, value, subValue, color, link }) => {
  const Card = (
    <div className={`bg-white rounded-xl border border-gray-200 p-4 sm:p-5 hover:shadow-md transition-all duration-200 ${link ? 'cursor-pointer hover:border-gray-300' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs sm:text-sm text-gray-500 font-medium mb-1">{label}</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900">{value}</p>
          {subValue && (
            <p className="text-xs text-gray-500 mt-1">{subValue}</p>
          )}
        </div>
        <div className={`p-2.5 sm:p-3 rounded-xl ${color}`}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
      </div>
    </div>
  );

  if (link) {
    return <Link to={link}>{Card}</Link>;
  }
  return Card;
};

// Quick Action Card
const QuickActionCard = ({ icon: Icon, title, description, link, color }) => (
  <Link to={link} className="block">
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-gray-300 transition-all duration-200 group">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">{title}</h3>
          <p className="text-xs text-gray-500 truncate">{description}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
      </div>
    </div>
  </Link>
);

// Order Card for mobile
const OrderCard = ({ order }) => {
  const statusColors = {
    placed: 'bg-blue-100 text-blue-700',
    paid: 'bg-purple-100 text-purple-700',
    packed: 'bg-yellow-100 text-yellow-700',
    shipped: 'bg-orange-100 text-orange-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-mono text-sm font-semibold text-gray-900">{order.orderId}</p>
          <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[order.status] || 'bg-gray-100 text-gray-700'}`}>
          {order.status?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
        </span>
      </div>

      {/* Items preview */}
      <div className="flex items-center gap-2 mb-3">
        {(order.items || []).slice(0, 3).map((item, idx) => (
          <img
            key={idx}
            src={item.image || PLACEHOLDER_IMAGE_SM}
            alt={item.name}
            className="w-12 h-12 object-cover rounded-lg border border-gray-200"
            onError={(e) => handleImageError(e, PLACEHOLDER_IMAGE_SM)}
          />
        ))}
        {(order.items?.length || 0) > 3 && (
          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
            +{order.items.length - 3}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div>
          <p className="text-xs text-gray-500">Total</p>
          <p className="font-bold text-gray-900">{formatCurrency(order.totals?.total || 0)}</p>
        </div>
        <Link
          to={`/dashboard/orders/${order._id}`}
          className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
        >
          View Details
        </Link>
      </div>
    </div>
  );
};

const CustomerDashboard = () => {
  const { user } = useSelector((state) => state.auth);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (statsLoading || ordersLoading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 animate-pulse">
          <div className="h-8 w-48 bg-white/20 rounded mb-2"></div>
          <div className="h-4 w-64 bg-white/20 rounded"></div>
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="h-4 w-20 bg-gray-200 rounded mb-3"></div>
              <div className="h-8 w-16 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>

        {/* Orders skeleton */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
          <div className="h-6 w-32 bg-gray-200 rounded mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary-600 via-primary-700 to-blue-700 rounded-2xl p-5 sm:p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>

        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-1">
                {getGreeting()}, {user?.name?.split(' ')[0] || 'there'}!
              </h1>
              <p className="text-primary-100 text-sm sm:text-base">
                Welcome to your dashboard. Here's your account overview.
              </p>
            </div>
            <button
              onClick={() => refetchStats()}
              className="self-start sm:self-center p-2.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              title="Refresh stats"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          {/* Member info */}
          <div className="flex flex-wrap gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
              <Clock className="w-4 h-4" />
              <span>Member since {stats?.memberSince ? formatDate(stats.memberSince) : 'N/A'}</span>
            </div>
            {stats?.totalSavings > 0 && (
              <div className="flex items-center gap-2 bg-green-500/20 px-3 py-1.5 rounded-full">
                <IndianRupee className="w-4 h-4" />
                <span>Total Saved: {formatCurrency(stats.totalSavings)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatsCard
          icon={ShoppingBag}
          label="Total Orders"
          value={stats?.totalOrders || 0}
          subValue={stats?.recentOrders > 0 ? `${stats.recentOrders} this month` : null}
          color="bg-blue-500"
          link="/dashboard/orders"
        />
        <StatsCard
          icon={CreditCard}
          label="Total Spent"
          value={formatCurrency(stats?.totalSpent || 0)}
          color="bg-green-500"
        />
        <StatsCard
          icon={Heart}
          label="Wishlist Items"
          value={stats?.wishlistCount || 0}
          color="bg-pink-500"
          link="/dashboard/wishlist"
        />
        <StatsCard
          icon={MapPin}
          label="Saved Addresses"
          value={stats?.addressCount || 0}
          color="bg-purple-500"
          link="/dashboard/addresses"
        />
      </div>

      {/* Order Status Summary */}
      {(stats?.pendingOrders > 0 || stats?.deliveredOrders > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {stats?.pendingOrders > 0 && (
            <Link to="/dashboard/orders?status=shipped" className="block">
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Truck className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-700">{stats.pendingOrders}</p>
                    <p className="text-xs text-orange-600 font-medium">In Transit</p>
                  </div>
                </div>
              </div>
            </Link>
          )}
          {stats?.deliveredOrders > 0 && (
            <Link to="/dashboard/orders?status=delivered" className="block">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-700">{stats.deliveredOrders}</p>
                    <p className="text-xs text-green-600 font-medium">Delivered</p>
                  </div>
                </div>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <QuickActionCard
            icon={Package}
            title="Track Orders"
            description="View order status"
            link="/dashboard/orders"
            color="bg-blue-500"
          />
          <QuickActionCard
            icon={MapPin}
            title="Manage Addresses"
            description="Add or edit addresses"
            link="/dashboard/addresses"
            color="bg-purple-500"
          />
          <QuickActionCard
            icon={Heart}
            title="My Wishlist"
            description="Saved items"
            link="/dashboard/wishlist"
            color="bg-pink-500"
          />
          <QuickActionCard
            icon={Settings}
            title="Account Settings"
            description="Update profile"
            link="/dashboard/settings"
            color="bg-gray-600"
          />
        </div>
      </div>

      {/* Upgrade Options - Only show for customers */}
      {user?.role === 'customer' && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Grow With Us</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link to="/dashboard/become-vendor" className="block group">
              <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl p-5 text-white hover:shadow-lg transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 bg-white/20 rounded-xl">
                      <Store className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Become a Vendor</h3>
                      <p className="text-primary-100 text-sm">Start selling today</p>
                    </div>
                  </div>
                  <p className="text-sm text-primary-100">
                    List your products and reach thousands of customers on our platform.
                  </p>
                  <div className="flex items-center gap-1 mt-3 text-sm font-medium group-hover:gap-2 transition-all">
                    Apply Now <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </Link>

            <Link to="/dashboard/become-affiliate" className="block group">
              <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-xl p-5 text-white hover:shadow-lg transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 bg-white/20 rounded-xl">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Become an Affiliate</h3>
                      <p className="text-green-100 text-sm">Earn commissions</p>
                    </div>
                  </div>
                  <p className="text-sm text-green-100">
                    Promote products and earn up to 10% commission on every sale.
                  </p>
                  <div className="flex items-center gap-1 mt-3 text-sm font-medium group-hover:gap-2 transition-all">
                    Join Program <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Recent Orders */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Recent Orders</h2>
          <Link
            to="/dashboard/orders"
            className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
          >
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {recentOrders && recentOrders.length > 0 ? (
          <>
            {/* Mobile: Card View */}
            <div className="block sm:hidden p-4 space-y-3">
              {recentOrders.slice(0, 3).map((order) => (
                <OrderCard key={order._id} order={order} />
              ))}
            </div>

            {/* Desktop: Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order ID</th>
                    <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Items</th>
                    <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-right py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="text-right py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentOrders.map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-5">
                        <span className="font-mono text-sm font-semibold text-gray-900">{order.orderId}</span>
                      </td>
                      <td className="py-4 px-5 text-sm text-gray-600">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-1">
                          {(order.items || []).slice(0, 3).map((item, idx) => (
                            <img
                              key={idx}
                              src={item.image || PLACEHOLDER_IMAGE_SM}
                              alt={item.name}
                              className="w-8 h-8 object-cover rounded border border-gray-200"
                              onError={(e) => handleImageError(e, PLACEHOLDER_IMAGE_SM)}
                            />
                          ))}
                          {(order.items?.length || 0) > 3 && (
                            <span className="text-xs text-gray-500 ml-1">+{order.items.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                          order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                          order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          order.status === 'shipped' ? 'bg-orange-100 text-orange-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {order.status?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right font-semibold text-gray-900">
                        {formatCurrency(order.totals?.total || 0)}
                      </td>
                      <td className="py-4 px-5 text-right">
                        <Link
                          to={`/dashboard/orders/${order._id}`}
                          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="p-8 sm:p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders yet</h3>
            <p className="text-gray-500 mb-6">Start shopping to see your orders here</p>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
            >
              <ShoppingBag className="w-5 h-5" />
              Start Shopping
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDashboard;
