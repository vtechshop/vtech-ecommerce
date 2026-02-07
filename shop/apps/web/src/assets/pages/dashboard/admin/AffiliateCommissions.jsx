// FILE: apps/web/src/pages/dashboard/admin/AffiliateCommissions.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import { formatCurrency } from '@/utils/format';
import Button from '@/components/common/Button';
import CustomSelect from '@/components/common/CustomSelect';
import {
  DollarSign, User, ShoppingCart, Calendar,
  Check, Clock, Filter, Download, RefreshCw,
  Users, CheckCircle, AlertCircle, Wallet,
  Banknote, PieChart, Award, Target
} from 'lucide-react';
import { useToast } from '@/components/common/ToastContainer';
import PendingBadge from '@/components/common/PendingBadge';
import { getPendingItemClasses, formatRelativeTime } from '@/utils/dateHelpers';

const DATE_RANGE_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last 1 year' },
  { value: 'all', label: 'All time' },
];

const getDateRange = (days) => {
  if (days === 'all') return { startDate: '', endDate: '' };
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - parseInt(days));
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
};

// Performance tier based on conversions
const getPerformanceTier = (conversions) => {
  if (conversions >= 100) return { tier: 'Platinum', color: 'bg-purple-100 text-purple-800', icon: '💎' };
  if (conversions >= 50) return { tier: 'Gold', color: 'bg-yellow-100 text-yellow-800', icon: '🥇' };
  if (conversions >= 20) return { tier: 'Silver', color: 'bg-gray-200 text-gray-800', icon: '🥈' };
  return { tier: 'Bronze', color: 'bg-orange-100 text-orange-800', icon: '🥉' };
};

const AffiliateCommissions = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('30');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { startDate, endDate } = getDateRange(dateRange);

  // Fetch commissions with filters
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-affiliate-commissions', statusFilter, dateRange, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        type: 'affiliate',
      });
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await api.get(`/admin/commissions?${params}`);
      return response.data.data;
    },
  });

  // Fetch summary stats with date range
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['affiliate-commission-stats', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({ type: 'affiliate' });
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const response = await api.get(`/admin/commissions/stats?${params}`);
      return response.data.data;
    },
  });

  // Pay commission mutation
  const payCommissionMutation = useMutation({
    mutationFn: async (commissionId) => {
      const response = await api.put(`/admin/commissions/${commissionId}/pay`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-affiliate-commissions'] });
      queryClient.invalidateQueries({ queryKey: ['affiliate-commission-stats'] });
      toast.success('Commission paid via Razorpay!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to pay commission');
    },
  });

  // Bulk pay commissions mutation
  const bulkPayMutation = useMutation({
    mutationFn: async (commissionIds) => {
      const response = await api.post('/admin/commissions/bulk-pay', {
        commissionIds,
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-affiliate-commissions'] });
      queryClient.invalidateQueries({ queryKey: ['affiliate-commission-stats'] });
      toast.success(`Batch payout processed! ${data.data?.success?.length || 0} payouts successful`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to pay commissions');
    },
  });

  // Export commissions to CSV
  const handleExportCSV = () => {
    const csvData = [
      ['Affiliate', 'Code', 'Order ID', 'Amount', 'Rate', 'Status', 'Date', 'Paid Date'].join(','),
      ...(data?.commissions || []).map(comm => [
        comm.subjectId?.userId?.name || 'N/A',
        comm.subjectId?.code || 'N/A',
        comm.orderId?.orderId || 'N/A',
        comm.amount.toFixed(2),
        comm.percentage + '%',
        comm.status,
        new Date(comm.createdAt).toLocaleDateString(),
        comm.paidAt ? new Date(comm.paidAt).toLocaleDateString() : 'N/A',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `affiliate-commissions-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully!');
  };

  // Pay all approved commissions (batch payout)
  const handlePayAllApproved = () => {
    const approvedIds = data?.commissions
      ?.filter(c => c.status === 'approved')
      ?.map(c => c._id) || [];

    if (approvedIds.length === 0) {
      toast.info('No approved commissions to pay');
      return;
    }

    if (window.confirm(`Process batch payout for ${approvedIds.length} approved commissions via Razorpay?`)) {
      bulkPayMutation.mutate(approvedIds);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'approved': return <Check className="w-4 h-4" />;
      case 'paid': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <AlertCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  // Calculate max for progress bars
  const maxAffiliateAmount = Math.max(...(stats?.topVendors?.map(v => v.totalAmount) || [1]));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-700">Loading commissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Affiliate Commissions</h1>
          <p className="text-gray-700">Manage affiliate commissions and payouts</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetch();
              refetchStats();
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-gray-700 text-sm font-medium mb-1">Total Commissions</h3>
          <p className="text-3xl font-bold text-gray-900">
            {formatCurrency(stats?.totalAmount || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {dateRange === 'all' ? 'All time' : `Last ${dateRange} days`}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <h3 className="text-gray-700 text-sm font-medium mb-1">Pending Approval</h3>
          <p className="text-3xl font-bold text-yellow-600">
            {formatCurrency(stats?.pendingAmount || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-2">{stats?.pendingCount || 0} commissions</p>
        </div>

        {/* Ready to Pay (Approved) */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl shadow-sm p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            {(stats?.approvedCount || 0) > 0 && (
              <Button
                variant="outline-light"
                size="xs"
                onClick={handlePayAllApproved}
                disabled={bulkPayMutation.isPending}
              >
                <Banknote className="w-3 h-3 mr-1" />
                Pay All
              </Button>
            )}
          </div>
          <h3 className="text-blue-100 text-sm font-medium mb-1">Ready to Pay</h3>
          <p className="text-3xl font-bold">
            {formatCurrency(stats?.approvedAmount || 0)}
          </p>
          <p className="text-xs text-blue-200 mt-2">{stats?.approvedCount || 0} approved, awaiting payout</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-gray-700 text-sm font-medium mb-1">Paid Out</h3>
          <p className="text-3xl font-bold text-green-600">
            {formatCurrency(stats?.paidAmount || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-2">{stats?.paidCount || 0} commissions</p>
        </div>
      </div>

      {/* Top Affiliates Breakdown */}
      {stats?.topVendors && stats.topVendors.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-800">Top Affiliates by Commission</h3>
            </div>
            <span className="text-xs text-gray-500">
              {dateRange === 'all' ? 'All time' : `Last ${dateRange} days`}
            </span>
          </div>
          <div className="space-y-3">
            {stats.topVendors.map((affiliate, idx) => (
              <div key={affiliate._id} className="flex items-center gap-4">
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {affiliate.storeName || 'Unknown Affiliate'}
                    </span>
                    <span className="text-sm font-bold text-gray-900">
                      {formatCurrency(affiliate.totalAmount)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-500"
                      style={{ width: `${(affiliate.totalAmount / maxAffiliateAmount) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{affiliate.count} commissions</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters Row */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Date Range Filter */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <CustomSelect
              value={dateRange}
              onChange={(value) => {
                setDateRange(value);
                setPage(1);
              }}
              options={DATE_RANGE_OPTIONS}
              placeholder="Select period"
              className="w-40"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <div className="flex gap-2 flex-wrap">
              {['all', 'pending', 'approved', 'paid', 'cancelled'].map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setStatusFilter(status);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === status
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Commissions Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                  Affiliate
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                  Order
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                  Rate
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data?.commissions?.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                    No commissions found for the selected period
                  </td>
                </tr>
              ) : (
                data?.commissions?.map((commission) => {
                  const affiliate = commission.subjectId;
                  const perfTier = getPerformanceTier(affiliate?.totalConversions || 0);

                  return (
                    <tr key={commission._id} className={`transition-colors hover:bg-gray-50 ${getPendingItemClasses(commission.status)}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            commission.status === 'pending' ? 'bg-yellow-100' : 'bg-purple-100'
                          }`}>
                            <span className={`text-xs font-bold ${
                              commission.status === 'pending' ? 'text-yellow-700' : 'text-purple-700'
                            }`}>
                              {affiliate?.userId?.name?.charAt(0)?.toUpperCase() || 'A'}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 text-sm">
                                {affiliate?.userId?.name || 'Unknown'}
                              </p>
                              {affiliate?.totalConversions > 0 && (
                                <span className={`text-xs px-1.5 py-0.5 rounded ${perfTier.color}`}>
                                  {perfTier.icon}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 font-mono">
                              {affiliate?.code || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ShoppingCart className="w-4 h-4 text-gray-400" />
                          <span className="text-xs font-mono text-gray-700">
                            {commission.orderId?.orderId || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-green-600 text-sm">
                          {formatCurrency(commission.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700">
                          {commission.percentage}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(commission.status)}`}>
                          {getStatusIcon(commission.status)}
                          {commission.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-gray-700">
                          {new Date(commission.createdAt).toLocaleDateString()}
                        </div>
                        {commission.paidAt && (
                          <p className="text-xs text-green-600">
                            Paid: {new Date(commission.paidAt).toLocaleDateString()}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {commission.status === 'approved' && (
                          <Button
                            variant="primary"
                            size="xs"
                            onClick={() => payCommissionMutation.mutate(commission._id)}
                            disabled={payCommissionMutation.isPending}
                          >
                            <DollarSign className="w-3 h-3 mr-1" />
                            Pay
                          </Button>
                        )}
                        {commission.status === 'paid' && (
                          <span className="text-green-600 text-xs font-medium flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" /> Paid
                          </span>
                        )}
                        {commission.status === 'pending' && (
                          <span className="text-yellow-600 text-xs font-medium flex items-center gap-1">
                            <Clock className="w-4 h-4" /> Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.meta?.pages > 1 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-700">
                Showing page {data.meta.page} of {data.meta.pages} ({data.meta.total} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= data.meta.pages}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AffiliateCommissions;
