// FILE: apps/web/src/pages/dashboard/admin/AdminDashboard.jsx
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import Spinner from '@/components/common/Spinner';
import { formatCurrency } from '@/utils/format';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const AdminDashboard = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const response = await api.get('/admin/dashboard/stats');
      return response.data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const revenueData = [
    { month: 'Jan', revenue: 12000 },
    { month: 'Feb', revenue: 15000 },
    { month: 'Mar', revenue: 18000 },
    { month: 'Apr', revenue: 22000 },
    { month: 'May', revenue: 25000 },
    { month: 'Jun', revenue: 28000 },
  ];

  const comm = stats?.commissions || {};
  const vendorComm = comm.vendor || {};
  const affiliateComm = comm.affiliate || {};

  return (
    <div>
      <h1 className="text-3xl md:text-4xl font-bold mb-8 fade-in-down">Admin Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 fade-in stagger-1 hover-lift">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-700 text-sm font-medium">Total Users</h3>
            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold">{stats?.totalUsers || 0}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 fade-in stagger-2 hover-lift">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-700 text-sm font-medium">Active Vendors</h3>
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <p className="text-3xl font-bold">{stats?.totalVendors || 0}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 fade-in stagger-3 hover-lift">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-700 text-sm font-medium">Total Products</h3>
            <svg className="w-8 h-8 text-secondary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="text-3xl font-bold">{stats?.totalProducts || 0}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 fade-in stagger-4 hover-lift">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-700 text-sm font-medium">Total Revenue</h3>
            <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(stats?.totalRevenue || 0)}</p>
        </div>
      </div>

      {/* Commission Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Admin Commission */}
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-lg shadow-sm p-4 sm:p-6 text-white fade-in stagger-1 hover-lift">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-indigo-100 text-sm font-medium">Admin Commission</h3>
            <svg className="w-8 h-8 text-indigo-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(comm.admin || 0)}</p>
          <p className="text-indigo-200 text-xs mt-2">Platform earnings (Revenue - Commissions)</p>
        </div>

        {/* Vendor Commission */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-lg shadow-sm p-4 sm:p-6 text-white fade-in stagger-2 hover-lift">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-emerald-100 text-sm font-medium">Vendor Commissions</h3>
            <svg className="w-8 h-8 text-emerald-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(vendorComm.total || 0)}</p>
          <div className="flex items-center gap-3 mt-2 text-xs">
            <span className="text-emerald-200">Pending: {formatCurrency(vendorComm.pending || 0)}</span>
            <span className="text-emerald-200">Paid: {formatCurrency(vendorComm.paid || 0)}</span>
          </div>
        </div>

        {/* Affiliate Commission */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-lg shadow-sm p-4 sm:p-6 text-white fade-in stagger-3 hover-lift">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-orange-100 text-sm font-medium">Affiliate Commissions</h3>
            <svg className="w-8 h-8 text-orange-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(affiliateComm.total || 0)}</p>
          <div className="flex items-center gap-3 mt-2 text-xs">
            <span className="text-orange-200">Pending: {formatCurrency(affiliateComm.pending || 0)}</span>
            <span className="text-orange-200">Paid: {formatCurrency(affiliateComm.paid || 0)}</span>
          </div>
        </div>
      </div>

      {/* Commission Breakdown Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-8 fade-in">
        <h2 className="text-xl font-bold mb-4">Commission Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pending</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Approved</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span className="font-medium text-gray-900">Vendor</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-semibold">{formatCurrency(vendorComm.total || 0)}</td>
                <td className="px-4 py-3 text-right">
                  <span className="text-yellow-600">{formatCurrency(vendorComm.pending || 0)}</span>
                  {vendorComm.pendingCount > 0 && <span className="text-xs text-gray-400 ml-1">({vendorComm.pendingCount})</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-blue-600">{formatCurrency(vendorComm.approved || 0)}</span>
                  {vendorComm.approvedCount > 0 && <span className="text-xs text-gray-400 ml-1">({vendorComm.approvedCount})</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-green-600">{formatCurrency(vendorComm.paid || 0)}</span>
                  {vendorComm.paidCount > 0 && <span className="text-xs text-gray-400 ml-1">({vendorComm.paidCount})</span>}
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                    <span className="font-medium text-gray-900">Affiliate</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-semibold">{formatCurrency(affiliateComm.total || 0)}</td>
                <td className="px-4 py-3 text-right">
                  <span className="text-yellow-600">{formatCurrency(affiliateComm.pending || 0)}</span>
                  {affiliateComm.pendingCount > 0 && <span className="text-xs text-gray-400 ml-1">({affiliateComm.pendingCount})</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-blue-600">{formatCurrency(affiliateComm.approved || 0)}</span>
                  {affiliateComm.approvedCount > 0 && <span className="text-xs text-gray-400 ml-1">({affiliateComm.approvedCount})</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-green-600">{formatCurrency(affiliateComm.paid || 0)}</span>
                  {affiliateComm.paidCount > 0 && <span className="text-xs text-gray-400 ml-1">({affiliateComm.paidCount})</span>}
                </td>
              </tr>
              <tr className="bg-gray-50 font-semibold">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                    <span className="text-gray-900">Admin (Platform)</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-indigo-700">{formatCurrency(comm.admin || 0)}</td>
                <td className="px-4 py-3 text-right text-gray-400">-</td>
                <td className="px-4 py-3 text-right text-gray-400">-</td>
                <td className="px-4 py-3 text-right text-gray-400">-</td>
              </tr>
            </tbody>
            <tfoot className="border-t-2 border-gray-300">
              <tr className="font-bold">
                <td className="px-4 py-3 text-gray-900">Total Revenue</td>
                <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(stats?.totalRevenue || 0)}</td>
                <td className="px-4 py-3" colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 fade-in stagger-1 hover-lift">
          <h2 className="text-xl md:text-2xl font-bold mb-4 fade-in-down">Revenue Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 fade-in stagger-2 hover-lift">
          <h2 className="text-xl md:text-2xl font-bold mb-4 fade-in-down">Orders by Status</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={[
              { status: 'Placed', count: 45 },
              { status: 'Paid', count: 38 },
              { status: 'Shipped', count: 32 },
              { status: 'Delivered', count: 28 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pending Approvals */}
      {stats?.pendingApprovals > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 fade-in pulse">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-800 mb-1">
                {stats.pendingApprovals} Pending Approvals
              </h3>
              <p className="text-sm text-yellow-700">
                You have vendor and affiliate applications waiting for review.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminDashboard;
