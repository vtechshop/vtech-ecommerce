// FILE: apps/web/src/pages/dashboard/admin/AffiliateCommissions.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import { formatCurrency } from '@/utils/format';
import Button from '@/components/common/Button';
import {
  DollarSign, User, ShoppingCart, Calendar,
  Check, X, Clock, Filter, Download, Eye,
  TrendingUp, Users, CheckCircle, AlertCircle
} from 'lucide-react';
import { useToast } from '@/components/common/ToastContainer';
import PendingBadge from '@/components/common/PendingBadge';
import { getPendingItemClasses, formatRelativeTime } from '@/utils/dateHelpers';

const AffiliateCommissions = () => {
  const [statusFilter, setStatusFilter] = useState('all'); // all, pending, paid, cancelled
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const toast = useToast();

  // Fetch commissions with filters
  const { data, isLoading } = useQuery({
    queryKey: ['admin-affiliate-commissions', statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        type: 'affiliate',
      });
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      const response = await api.get(`/admin/commissions?${params}`);
      return response.data.data;
    },
  });

  // Fetch summary stats
  const { data: stats } = useQuery({
    queryKey: ['affiliate-commission-stats'],
    queryFn: async () => {
      const response = await api.get('/admin/commissions/stats?type=affiliate');
      return response.data.data;
    },
  });

  // Approve/Pay commission mutation
  const payCommissionMutation = useMutation({
    mutationFn: async (commissionId) => {
      const response = await api.put(`/admin/commissions/${commissionId}/pay`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-affiliate-commissions'] });
      queryClient.invalidateQueries({ queryKey: ['affiliate-commission-stats'] });
      toast.success('Commission marked as paid!');
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
      toast.success(`${data.data.count} commissions marked as paid!`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to pay commissions');
    },
  });

  // Export commissions to CSV
  const handleExportCSV = () => {
    const csvData = [
      ['Affiliate', 'Order ID', 'Amount', 'Status', 'Date', 'Paid Date'].join(','),
      ...(data?.commissions || []).map(comm => [
        comm.affiliateName || 'N/A',
        comm.orderId?.orderId || 'N/A',
        comm.amount.toFixed(2),
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

  // Pay all pending commissions
  const handlePayAllPending = () => {
    if (window.confirm('Are you sure you want to pay all pending commissions?')) {
      const pendingIds = data?.commissions
        ?.filter(c => c.status === 'pending')
        ?.map(c => c._id) || [];

      if (pendingIds.length > 0) {
        bulkPayMutation.mutate(pendingIds);
      } else {
        toast.info('No pending commissions to pay');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-blue-100 text-gray-900 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'paid': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <AlertCircle className="w-4 h-4" />;
      default: return null;
    }
  };

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
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handlePayAllPending}
            disabled={bulkPayMutation.isPending}
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Pay All Pending
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
          <p className="text-xs text-gray-500 mt-2">All time</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <h3 className="text-gray-700 text-sm font-medium mb-1">Pending</h3>
          <p className="text-3xl font-bold text-yellow-600">
            {formatCurrency(stats?.pendingAmount || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-2">{stats?.pendingCount || 0} commissions</p>
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

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <h3 className="text-gray-700 text-sm font-medium mb-1">Active Affiliates</h3>
          <p className="text-3xl font-bold text-purple-600">
            {stats?.affiliateCount || 0}
          </p>
          <p className="text-xs text-gray-500 mt-2">Total affiliates</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-gray-400" />
          <span className="font-medium text-gray-700">Filter by Status:</span>
          <div className="flex gap-2">
            {['all', 'pending', 'approved', 'paid', 'cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-primary-600 text-white'
                    : 'bg-blue-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Commissions Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-blue-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Affiliate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data?.commissions?.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    No commissions found
                  </td>
                </tr>
              ) : (
                data?.commissions?.map((commission) => (
                  <tr key={commission._id} className={`transition-colors ${getPendingItemClasses(commission.status)}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">
                              {commission.subjectId?.userId?.name || 'Unknown'}
                            </p>
                            <PendingBadge status={commission.status} />
                          </div>
                          <p className="text-xs text-gray-500">
                            Code: {commission.subjectId?.code || 'N/A'}
                          </p>
                          <p className="text-xs text-gray-500">ID: {commission._id.slice(-8)} • {formatRelativeTime(commission.createdAt)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-mono text-gray-700">
                          {commission.orderId?.orderId || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-green-600">
                        {formatCurrency(commission.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">
                        {commission.percentage}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(commission.status)}`}>
                        {getStatusIcon(commission.status)}
                        {commission.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(commission.createdAt).toLocaleDateString()}
                      </div>
                      {commission.paidAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          Paid: {new Date(commission.paidAt).toLocaleDateString()}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {(commission.status === 'pending' || commission.status === 'approved') && (
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => payCommissionMutation.mutate(commission._id)}
                          disabled={payCommissionMutation.isPending}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Pay
                        </Button>
                      )}
                      {commission.status === 'paid' && (
                        <span className="text-green-600 text-sm font-medium">
                          ✓ Paid
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.meta?.pages > 1 && (
          <div className="bg-blue-100 px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-700">
                Showing page {data.meta.page} of {data.meta.pages}
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
