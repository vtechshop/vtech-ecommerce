// FILE: apps/web/src/pages/dashboard/admin/Affiliate.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Pagination from '@/components/common/Pagination';
import Spinner from '@/components/common/Spinner';
import CustomSelect from '@/components/common/CustomSelect';
import { formatDate, formatCurrency } from '@/utils/format';
import { useToast } from '@/components/common/ToastContainer';
import {
  Eye, Search, CheckCircle, XCircle, UserX, Trash2,
  Users, TrendingUp, DollarSign, MousePointer, Target,
  Award, RefreshCw, Download, AlertCircle, Percent
} from 'lucide-react';
import PendingBadge from '@/components/common/PendingBadge';
import { getPendingItemClasses, formatRelativeTime } from '@/utils/dateHelpers';
import CategoryCommissionRules from '@/components/admin/CategoryCommissionRules';

// Performance tier based on conversions
const getPerformanceTier = (conversions) => {
  if (conversions >= 100) return { tier: 'Platinum', color: 'bg-purple-100 text-purple-800', icon: '💎' };
  if (conversions >= 50) return { tier: 'Gold', color: 'bg-yellow-100 text-yellow-800', icon: '🥇' };
  if (conversions >= 20) return { tier: 'Silver', color: 'bg-gray-200 text-gray-800', icon: '🥈' };
  return { tier: 'Bronze', color: 'bg-orange-100 text-orange-800', icon: '🥉' };
};

const Affiliate = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingAffiliate, setViewingAffiliate] = useState(null);

  // Fetch affiliate stats
  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ['admin-affiliate-stats'],
    queryFn: async () => {
      const response = await api.get('/admin/affiliates/stats');
      return response.data.data;
    },
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-affiliates', page, statusFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', '20');
      if (statusFilter) params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await api.get(`/admin/affiliates?${params}`);
      return response.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id) => {
      await api.put(`/admin/affiliates/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-affiliates'] });
      queryClient.invalidateQueries({ queryKey: ['admin-affiliate-stats'] });
      setViewingAffiliate(null);
      toast.success('Affiliate approved successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to approve affiliate');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }) => {
      await api.put(`/admin/affiliates/${id}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-affiliates'] });
      queryClient.invalidateQueries({ queryKey: ['admin-affiliate-stats'] });
      setViewingAffiliate(null);
      toast.success('Affiliate rejected');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to reject affiliate');
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async (id) => {
      await api.put(`/admin/affiliates/${id}/suspend`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-affiliates'] });
      queryClient.invalidateQueries({ queryKey: ['admin-affiliate-stats'] });
      setViewingAffiliate(null);
      toast.success('Affiliate suspended');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to suspend affiliate');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/affiliates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-affiliates'] });
      queryClient.invalidateQueries({ queryKey: ['admin-affiliate-stats'] });
      setViewingAffiliate(null);
      toast.success('Affiliate and associated data deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete affiliate');
    },
  });

  const handleView = (affiliate) => {
    setViewingAffiliate(affiliate);
  };

  const handleApprove = (id) => {
    if (confirm('Are you sure you want to approve this affiliate?')) {
      approveMutation.mutate(id);
    }
  };

  const handleReject = (id) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (reason) {
      rejectMutation.mutate({ id, reason });
    }
  };

  const handleSuspend = (id) => {
    if (confirm('Are you sure you want to suspend this affiliate?')) {
      suspendMutation.mutate(id);
    }
  };

  const handleDelete = (id, affiliateName, affiliateCode) => {
    if (confirm(`Are you sure you want to DELETE "${affiliateName}" (${affiliateCode})?\n\nThis will permanently delete:\n- The affiliate profile\n- All their commissions\n\nThis action CANNOT be undone!`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleExportCSV = () => {
    const affiliates = data?.data || [];
    const csvData = [
      ['Name', 'Email', 'Code', 'Status', 'KYC', 'Clicks', 'Conversions', 'Conv. Rate', 'Earnings', 'Pending', 'Joined'].join(','),
      ...affiliates.map(a => [
        a.userId?.name || 'N/A',
        a.userId?.email || 'N/A',
        a.code || '',
        a.status || '',
        a.kyc?.status || 'pending',
        a.totalClicks || 0,
        a.totalConversions || 0,
        a.totalClicks > 0 ? ((a.totalConversions / a.totalClicks) * 100).toFixed(2) + '%' : '0%',
        a.totalEarnings || 0,
        a.pendingEarnings || 0,
        new Date(a.createdAt).toLocaleDateString()
      ].map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `affiliates-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      case 'rejected':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <AlertCircle className="w-4 h-4" />;
      case 'suspended':
        return <XCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return <UserX className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const affiliates = data?.data || [];
  const totalPages = Math.ceil((data?.meta?.total || 0) / 20);
  const stats = statsData || { total: 0, active: 0, pending: 0, suspended: 0 };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Affiliate Management</h1>
          <p className="text-sm text-gray-600 mt-1">Manage affiliate partners and their performance</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              refetch();
              refetchStats();
            }}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Affiliates</h3>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.total || affiliates.length}</p>
          <p className="text-xs text-gray-500 mt-1">Registered partners</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Active</h3>
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.active || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Currently earning</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Pending</h3>
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Clicks</h3>
            <div className="p-2 bg-purple-100 rounded-lg">
              <MousePointer className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-purple-600">{stats.totalClicks?.toLocaleString() || 0}</p>
          <p className="text-xs text-gray-500 mt-1">All time referrals</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Conversions</h3>
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Target className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-indigo-600">{stats.totalConversions?.toLocaleString() || 0}</p>
          <p className="text-xs text-gray-500 mt-1">{stats.conversionRate || 0}% rate</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-lg shadow-sm p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-green-100">Total Earnings</h3>
            <DollarSign className="w-5 h-5 text-green-200" />
          </div>
          <p className="text-2xl font-bold">{formatCurrency(stats.totalEarnings || 0)}</p>
          <p className="text-xs text-green-200 mt-1">
            {formatCurrency(stats.pendingEarnings || 0)} pending
          </p>
        </div>
      </div>

      {/* Top Performer & Pending Alert */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Top Performer */}
        {stats.topPerformer && (
          <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg shadow-sm p-5 text-white">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-purple-100">Top Performer</h3>
              <Award className="w-5 h-5 text-yellow-300" />
            </div>
            <p className="text-xl font-bold truncate">{stats.topPerformer.userName || 'N/A'}</p>
            <p className="text-sm text-purple-200 font-mono">{stats.topPerformer.code}</p>
            <div className="flex items-center gap-4 mt-3">
              <div>
                <p className="text-xs text-purple-200">Conversions</p>
                <p className="font-bold">{stats.topPerformer.totalConversions || 0}</p>
              </div>
              <div>
                <p className="text-xs text-purple-200">Earnings</p>
                <p className="font-bold">{formatCurrency(stats.topPerformer.totalEarnings || 0)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Pending Approvals Alert */}
        {stats.pending > 0 && statusFilter !== 'pending' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
              <div>
                <p className="font-semibold text-yellow-800">
                  {stats.pending} affiliate application{stats.pending > 1 ? 's' : ''} pending
                </p>
                <p className="text-sm text-yellow-700">
                  Review and approve new affiliate applications
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setStatusFilter('pending')}
              className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
            >
              View Pending
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name, email, or code..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="input pl-10 w-full"
            />
          </div>
          <CustomSelect
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All Affiliates' },
              { value: 'active', label: 'Active' },
              { value: 'pending', label: 'Pending' },
              { value: 'suspended', label: 'Suspended' },
              { value: 'rejected', label: 'Rejected' },
            ]}
            placeholder="All Affiliates"
            className="w-full"
          />
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('');
              setPage(1);
            }}
            className="flex items-center gap-2"
          >
            Clear Filters
          </Button>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold">{affiliates.length}</span> of{' '}
            <span className="font-semibold">{data?.meta?.total || 0}</span> affiliates
          </p>
        </div>
      </div>

      {/* Affiliates Table */}
      {affiliates.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No affiliates found</h3>
          <p className="text-gray-600 mb-4">
            {statusFilter === 'pending'
              ? 'There are no pending affiliate applications at the moment.'
              : searchTerm
              ? 'No affiliates match your search criteria.'
              : 'No affiliates have registered yet.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Affiliate</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Code</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm">Clicks</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm">Conversions</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm">Conv. Rate</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Earnings</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm">Status</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm">KYC</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {affiliates.map((affiliate) => {
                  const convRate = affiliate.totalClicks > 0
                    ? ((affiliate.totalConversions / affiliate.totalClicks) * 100).toFixed(1)
                    : 0;
                  const perfTier = getPerformanceTier(affiliate.totalConversions || 0);

                  return (
                    <tr key={affiliate._id} className={`border-b last:border-b-0 hover:bg-gray-50 transition-colors ${getPendingItemClasses(affiliate.status)}`}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            affiliate.status === 'pending' ? 'bg-yellow-200' : 'bg-blue-100'
                          }`}>
                            <span className={`text-sm font-bold ${
                              affiliate.status === 'pending' ? 'text-yellow-700' : 'text-blue-700'
                            }`}>
                              {affiliate.userId?.name?.charAt(0)?.toUpperCase() || 'A'}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900">{affiliate.userId?.name || 'N/A'}</p>
                              {affiliate.status === 'active' && affiliate.totalConversions > 0 && (
                                <span className={`text-xs px-1.5 py-0.5 rounded ${perfTier.color}`}>
                                  {perfTier.icon} {perfTier.tier}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">{affiliate.userId?.email || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                          {affiliate.code}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <MousePointer className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{affiliate.totalClicks?.toLocaleString() || 0}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Target className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{affiliate.totalConversions?.toLocaleString() || 0}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-medium ${
                          convRate >= 5 ? 'text-green-600' : convRate >= 2 ? 'text-yellow-600' : 'text-gray-600'
                        }`}>
                          {convRate}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(affiliate.totalEarnings || 0)}
                        </p>
                        <p className="text-xs text-yellow-600">
                          {formatCurrency(affiliate.pendingEarnings || 0)} pending
                        </p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(affiliate.status)}`}
                        >
                          {getStatusIcon(affiliate.status)}
                          {affiliate.status?.charAt(0).toUpperCase() + affiliate.status?.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                            affiliate.kyc?.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : affiliate.kyc?.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {affiliate.kyc?.status?.charAt(0).toUpperCase() + affiliate.kyc?.status?.slice(1) || 'Pending'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleView(affiliate)}
                            className="text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 text-sm font-medium"
                            title="View Details"
                          >
                            Details
                          </button>
                          {affiliate.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(affiliate._id)}
                                className="text-green-600 hover:text-green-700 p-1 rounded hover:bg-green-50"
                                title="Approve"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleReject(affiliate._id)}
                                className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50"
                                title="Reject"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {affiliate.status === 'active' && (
                            <button
                              onClick={() => handleSuspend(affiliate._id)}
                              className="text-yellow-600 hover:text-yellow-700 p-1 rounded hover:bg-yellow-50"
                              title="Suspend"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(affiliate._id, affiliate.userId?.name || 'Affiliate', affiliate.code)}
                            className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {/* Affiliate Details Modal */}
      {viewingAffiliate && (
        <AffiliateDetailsModal
          affiliate={viewingAffiliate}
          onClose={() => setViewingAffiliate(null)}
          onApprove={() => handleApprove(viewingAffiliate._id)}
          onReject={() => handleReject(viewingAffiliate._id)}
          onSuspend={() => handleSuspend(viewingAffiliate._id)}
          onDelete={() => {
            handleDelete(viewingAffiliate._id, viewingAffiliate.userId?.name || 'Affiliate', viewingAffiliate.code);
            setViewingAffiliate(null);
          }}
        />
      )}
    </div>
  );
};

// Affiliate Details Modal Component
const AffiliateDetailsModal = ({ affiliate, onClose, onApprove, onReject, onSuspend, onDelete }) => {
  const convRate = affiliate.totalClicks > 0
    ? ((affiliate.totalConversions / affiliate.totalClicks) * 100).toFixed(2)
    : 0;
  const perfTier = getPerformanceTier(affiliate.totalConversions || 0);

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      case 'rejected':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">{affiliate.userId?.name || 'Affiliate Details'}</h2>
            {affiliate.status === 'active' && affiliate.totalConversions > 0 && (
              <span className={`text-sm px-2 py-1 rounded ${perfTier.color}`}>
                {perfTier.icon} {perfTier.tier}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl">
            &times;
          </button>
        </div>

        <div className="p-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <MousePointer className="w-6 h-6 mx-auto text-purple-600 mb-2" />
              <p className="text-2xl font-bold text-purple-700">{affiliate.totalClicks?.toLocaleString() || 0}</p>
              <p className="text-xs text-purple-600">Total Clicks</p>
            </div>
            <div className="bg-indigo-50 rounded-lg p-4 text-center">
              <Target className="w-6 h-6 mx-auto text-indigo-600 mb-2" />
              <p className="text-2xl font-bold text-indigo-700">{affiliate.totalConversions?.toLocaleString() || 0}</p>
              <p className="text-xs text-indigo-600">Conversions</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <Percent className="w-6 h-6 mx-auto text-blue-600 mb-2" />
              <p className="text-2xl font-bold text-blue-700">{convRate}%</p>
              <p className="text-xs text-blue-600">Conv. Rate</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <DollarSign className="w-6 h-6 mx-auto text-green-600 mb-2" />
              <p className="text-2xl font-bold text-green-700">{formatCurrency(affiliate.totalEarnings || 0)}</p>
              <p className="text-xs text-green-600">Total Earnings</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Affiliate Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Affiliate Information</h3>
              <div className="space-y-3 bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Name</span>
                  <span className="text-sm font-medium">{affiliate.userId?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Email</span>
                  <span className="text-sm font-medium">{affiliate.userId?.email || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Affiliate Code</span>
                  <span className="text-sm font-mono bg-gray-200 px-2 py-0.5 rounded">{affiliate.code}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Status</span>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(affiliate.status)}`}>
                    {affiliate.status?.charAt(0).toUpperCase() + affiliate.status?.slice(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Commission Rate</span>
                  <span className="text-sm font-medium">{affiliate.commissionPercentage || 5}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Applied Date</span>
                  <span className="text-sm font-medium">{new Date(affiliate.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Earnings Breakdown */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Earnings Breakdown</h3>
              <div className="space-y-3 bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Earnings</span>
                  <span className="text-sm font-bold text-green-600">{formatCurrency(affiliate.totalEarnings || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Pending Earnings</span>
                  <span className="text-sm font-bold text-yellow-600">{formatCurrency(affiliate.pendingEarnings || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Paid Earnings</span>
                  <span className="text-sm font-bold text-blue-600">{formatCurrency(affiliate.paidEarnings || 0)}</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Average per Click</span>
                  <span className="text-sm font-medium">
                    {affiliate.totalClicks > 0
                      ? formatCurrency((affiliate.totalEarnings || 0) / affiliate.totalClicks)
                      : formatCurrency(0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Average per Conversion</span>
                  <span className="text-sm font-medium">
                    {affiliate.totalConversions > 0
                      ? formatCurrency((affiliate.totalEarnings || 0) / affiliate.totalConversions)
                      : formatCurrency(0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* KYC Information */}
          {affiliate.kyc && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">KYC Information</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Full Name</label>
                    <p className="text-sm">{affiliate.kyc.fullName || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Phone Number</label>
                    <p className="text-sm">{affiliate.kyc.phoneNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Address</label>
                    <p className="text-sm">
                      {affiliate.kyc.address || 'N/A'}, {affiliate.kyc.city || ''}, {affiliate.kyc.state || ''} {affiliate.kyc.zipCode || ''}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Country</label>
                    <p className="text-sm">{affiliate.kyc.country || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">ID Type</label>
                    <p className="text-sm">{affiliate.kyc.idType || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">KYC Status</label>
                    <p className="text-sm">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                          affiliate.kyc.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : affiliate.kyc.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {affiliate.kyc.status?.charAt(0).toUpperCase() + affiliate.kyc.status?.slice(1)}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rejection Reason */}
          {affiliate.status === 'rejected' && affiliate.rejectionReason && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Rejection Information</h3>
              <div className="bg-red-50 rounded-lg p-4">
                <label className="text-sm font-medium text-gray-700">Reason</label>
                <p className="text-sm text-red-600">{affiliate.rejectionReason}</p>
              </div>
            </div>
          )}

          {/* Category-Based Commission Rules */}
          <div className="mt-6">
            <CategoryCommissionRules
              entityType="affiliate"
              entityId={affiliate._id}
              currentRules={affiliate.commissionRules || []}
            />
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-between gap-4">
            <Button
              onClick={onDelete}
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Affiliate
            </Button>
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              {affiliate.status === 'pending' && (
                <>
                  <Button onClick={onApprove} className="bg-green-600 hover:bg-green-700">
                    Approve Affiliate
                  </Button>
                  <Button onClick={onReject} variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
                    Reject Affiliate
                  </Button>
                </>
              )}
              {affiliate.status === 'active' && (
                <Button onClick={onSuspend} variant="outline" className="border-yellow-300 text-yellow-600 hover:bg-yellow-50">
                  Suspend Affiliate
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Affiliate;
