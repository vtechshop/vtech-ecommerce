// FILE: apps/web/src/pages/dashboard/admin/Vendors.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Pagination from '@/components/common/Pagination';
import Spinner from '@/components/common/Spinner';
import CustomSelect from '@/components/common/CustomSelect';
import PendingBadge from '@/components/common/PendingBadge';
import { useToast } from '@/components/common/ToastContainer';
import { getPendingItemClasses, formatRelativeTime } from '@/utils/dateHelpers';
import { formatCurrency } from '@/utils/format';
import CategoryCommissionRules from '@/components/admin/CategoryCommissionRules';
import {
  Search,
  CheckCircle,
  XCircle,
  UserX,
  AlertCircle,
  RefreshCw,
  Percent,
  Trash2,
  Users,
  Store,
  TrendingUp,
  Package,
  Star,
  ShoppingBag,
  Download,
  ExternalLink,
  Award
} from 'lucide-react';

const Vendors = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingVendor, setViewingVendor] = useState(null);

  // Fetch vendor stats
  const { data: statsData } = useQuery({
    queryKey: ['admin-vendor-stats'],
    queryFn: async () => {
      const response = await api.get('/admin/vendors/stats');
      return response.data.data;
    },
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-vendors', page, statusFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', '20');
      params.append('includeStats', 'true'); // Request additional stats
      if (statusFilter) params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await api.get(`/admin/vendors?${params}`);
      return response.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id) => {
      await api.put(`/admin/vendors/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });
      queryClient.invalidateQueries({ queryKey: ['admin-vendor-stats'] });
      toast.success('Vendor approved successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to approve vendor');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }) => {
      await api.put(`/admin/vendors/${id}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });
      queryClient.invalidateQueries({ queryKey: ['admin-vendor-stats'] });
      toast.success('Vendor rejected');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to reject vendor');
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async (id) => {
      await api.put(`/admin/vendors/${id}/suspend`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });
      queryClient.invalidateQueries({ queryKey: ['admin-vendor-stats'] });
      toast.success('Vendor suspended successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to suspend vendor');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/vendors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });
      queryClient.invalidateQueries({ queryKey: ['admin-vendor-stats'] });
      toast.success('Vendor and associated data deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete vendor');
    },
  });

  const updateCommissionMutation = useMutation({
    mutationFn: async ({ id, commission }) => {
      const response = await api.put(`/admin/vendors/${id}/commission`, {
        defaultCommissionPercentage: commission
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });
      if (data.data && viewingVendor) {
        setViewingVendor(data.data);
      }
      const message = data.message || 'Commission updated successfully';
      toast.success(message);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update commission');
    },
  });

  const approveKYCMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.put(`/admin/kyc/vendors/${id}/approve`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });
      queryClient.invalidateQueries({ queryKey: ['admin-vendor-stats'] });
      if (data.data) setViewingVendor(data.data);
      toast.success('Vendor KYC approved successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to approve KYC');
    },
  });

  const rejectKYCMutation = useMutation({
    mutationFn: async ({ id, reason }) => {
      const response = await api.put(`/admin/kyc/vendors/${id}/reject`, { reason });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });
      queryClient.invalidateQueries({ queryKey: ['admin-vendor-stats'] });
      if (data.data) setViewingVendor(data.data);
      toast.success('Vendor KYC rejected');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to reject KYC');
    },
  });

  const handleView = (vendor) => {
    setViewingVendor(vendor);
  };

  const handleApprove = (id) => {
    if (confirm('Are you sure you want to approve this vendor?')) {
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
    if (confirm('Are you sure you want to suspend this vendor?')) {
      suspendMutation.mutate(id);
    }
  };

  const handleDelete = (id, storeName) => {
    if (confirm(`Are you sure you want to DELETE "${storeName}"?\n\nThis will permanently delete:\n- The vendor profile\n- All their products\n- All their commissions\n\nThis action CANNOT be undone!`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleExportCSV = () => {
    const vendors = data?.data || [];
    const csvData = [
      ['Store Name', 'Owner', 'Email', 'Phone', 'Status', 'KYC', 'Commission %', 'Products', 'Total Sales', 'Rating', 'Joined'].join(','),
      ...vendors.map(v => [
        v.storeName || '',
        v.userId?.name || '',
        v.userId?.email || '',
        v.phone || '',
        v.status || '',
        v.kyc?.status || 'pending',
        v.defaultCommissionPercentage || 15,
        v.totalProducts || 0,
        v.totalSales || 0,
        v.rating || 0,
        new Date(v.createdAt).toLocaleDateString()
      ].map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vendors-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
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

  const getPerformanceTier = (totalSales) => {
    if (totalSales >= 1000000) return { tier: 'Platinum', color: 'bg-purple-100 text-purple-800', icon: '💎' };
    if (totalSales >= 500000) return { tier: 'Gold', color: 'bg-yellow-100 text-yellow-800', icon: '🥇' };
    if (totalSales >= 100000) return { tier: 'Silver', color: 'bg-gray-200 text-gray-800', icon: '🥈' };
    return { tier: 'Bronze', color: 'bg-orange-100 text-orange-800', icon: '🥉' };
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const vendors = data?.data || [];
  const totalPages = Math.ceil((data?.meta?.total || 0) / 20);
  const stats = statsData || { total: 0, active: 0, pending: 0, suspended: 0, topPerformer: null };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Vendor Management</h1>
          <p className="text-sm text-gray-600 mt-1">Manage all marketplace vendors and their performance</p>
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
              queryClient.invalidateQueries({ queryKey: ['admin-vendor-stats'] });
            }}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Vendors</h3>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.total || vendors.length}</p>
          <p className="text-xs text-gray-500 mt-1">Registered vendors</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Active</h3>
            <div className="p-2 bg-green-100 rounded-lg">
              <Store className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.active || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Currently selling</p>
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
            <h3 className="text-sm font-medium text-gray-600">Suspended</h3>
            <div className="p-2 bg-red-100 rounded-lg">
              <UserX className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.suspended || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Account suspended</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg shadow-sm p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-purple-100">Top Performer</h3>
            <Award className="w-5 h-5 text-yellow-300" />
          </div>
          <p className="text-lg font-bold truncate">{stats.topPerformer?.storeName || 'N/A'}</p>
          <p className="text-xs text-purple-200 mt-1">
            {stats.topPerformer?.totalSales ? formatCurrency(stats.topPerformer.totalSales) : 'No sales yet'}
          </p>
        </div>
      </div>

      {/* Pending Approvals Alert */}
      {stats.pending > 0 && statusFilter !== 'pending' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="text-sm font-semibold text-yellow-800">
                {stats.pending} vendor application{stats.pending > 1 ? 's' : ''} awaiting approval
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Review and approve new vendor applications to allow them to start selling
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

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by store name, owner, or email..."
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
              { value: '', label: 'All Vendors' },
              { value: 'active', label: 'Active' },
              { value: 'pending', label: 'Pending' },
              { value: 'suspended', label: 'Suspended' },
              { value: 'rejected', label: 'Rejected' },
            ]}
            placeholder="All Vendors"
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
            Showing <span className="font-semibold">{vendors.length}</span> of{' '}
            <span className="font-semibold">{data?.meta?.total || 0}</span> vendors
          </p>
        </div>
      </div>

      {/* Vendors Table */}
      {vendors.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Store className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No vendors found</h3>
          <p className="text-gray-600 mb-4">
            {statusFilter === 'pending'
              ? 'There are no pending vendor applications at the moment.'
              : searchTerm
              ? 'No vendors match your search criteria.'
              : 'No vendors have registered yet.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Vendor</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Contact</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm">Products</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Total Sales</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm">Rating</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm">Status</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm">KYC</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm">Commission</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((vendor) => {
                  const perfTier = getPerformanceTier(vendor.totalSales || 0);
                  return (
                    <tr key={vendor._id} className={`border-b last:border-b-0 hover:bg-gray-50 transition-colors ${getPendingItemClasses(vendor.status)}`}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            vendor.status === 'pending' ? 'bg-yellow-200' : 'bg-blue-100'
                          }`}>
                            <span className={`text-sm font-bold ${
                              vendor.status === 'pending' ? 'text-yellow-700' : 'text-blue-700'
                            }`}>
                              {vendor.storeName?.charAt(0)?.toUpperCase() || 'V'}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900">{vendor.storeName}</p>
                              {vendor.status === 'active' && vendor.totalSales > 0 && (
                                <span className={`text-xs px-1.5 py-0.5 rounded ${perfTier.color}`}>
                                  {perfTier.icon} {perfTier.tier}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">{vendor.userId?.name || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-gray-900">{vendor.userId?.email || 'N/A'}</p>
                        <p className="text-xs text-gray-500">{vendor.phone || 'No phone'}</p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Package className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{vendor.totalProducts || 0}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(vendor.totalSales || 0)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {vendor.totalOrders || 0} orders
                        </p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {vendor.rating > 0 ? (
                          <div className="flex items-center justify-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span className="font-medium">{vendor.rating.toFixed(1)}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(vendor.status)}`}
                        >
                          {getStatusIcon(vendor.status)}
                          {vendor.status?.charAt(0).toUpperCase() + vendor.status?.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                            vendor.kyc?.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : vendor.kyc?.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {vendor.kyc?.status?.charAt(0).toUpperCase() + vendor.kyc?.status?.slice(1) || 'Pending'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-medium text-gray-900">
                          {vendor.defaultCommissionPercentage || 15}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleView(vendor)}
                            className="text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 text-sm font-medium"
                            title="View Details"
                          >
                            Details
                          </button>
                          {vendor.status === 'active' && (
                            <a
                              href={`/vendor/${vendor.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-600 hover:text-gray-700 p-1 rounded hover:bg-gray-100"
                              title="View Store"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          {vendor.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(vendor._id)}
                                className="text-green-600 hover:text-green-700 p-1 rounded hover:bg-green-50"
                                title="Approve"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleReject(vendor._id)}
                                className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50"
                                title="Reject"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {vendor.status === 'active' && (
                            <button
                              onClick={() => handleSuspend(vendor._id)}
                              className="text-yellow-600 hover:text-yellow-700 p-1 rounded hover:bg-yellow-50"
                              title="Suspend"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(vendor._id, vendor.storeName)}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}

      {/* Vendor Details Modal */}
      {viewingVendor && (
        <VendorDetailsModal
          vendor={viewingVendor}
          onClose={() => setViewingVendor(null)}
          onApprove={() => handleApprove(viewingVendor._id)}
          onReject={() => handleReject(viewingVendor._id)}
          onSuspend={() => handleSuspend(viewingVendor._id)}
          onDelete={() => {
            handleDelete(viewingVendor._id, viewingVendor.storeName);
            setViewingVendor(null);
          }}
          onUpdateCommission={(commission) => updateCommissionMutation.mutate({ id: viewingVendor._id, commission })}
          onApproveKYC={() => approveKYCMutation.mutate(viewingVendor._id)}
          onRejectKYC={(reason) => rejectKYCMutation.mutate({ id: viewingVendor._id, reason })}
          kycActionLoading={approveKYCMutation.isPending || rejectKYCMutation.isPending}
        />
      )}
    </div>
  );
};

// Vendor Details Modal Component
const VendorDetailsModal = ({ vendor, onClose, onApprove, onReject, onSuspend, onDelete, onUpdateCommission, onApproveKYC, onRejectKYC, kycActionLoading }) => {
  const [commissionValue, setCommissionValue] = useState(vendor.defaultCommissionPercentage || 15);
  const [isEditingCommission, setIsEditingCommission] = useState(false);
  const [showKYCReject, setShowKYCReject] = useState(false);
  const [kycRejectionReason, setKycRejectionReason] = useState('');

  const handleCommissionSave = () => {
    if (commissionValue < 0 || commissionValue > 100) {
      alert('Commission must be between 0 and 100');
      return;
    }
    onUpdateCommission(commissionValue);
    setIsEditingCommission(false);
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

  const perfTier = vendor.totalSales >= 1000000 ? { tier: 'Platinum', color: 'bg-purple-100 text-purple-800', icon: '💎' }
    : vendor.totalSales >= 500000 ? { tier: 'Gold', color: 'bg-yellow-100 text-yellow-800', icon: '🥇' }
    : vendor.totalSales >= 100000 ? { tier: 'Silver', color: 'bg-gray-200 text-gray-800', icon: '🥈' }
    : { tier: 'Bronze', color: 'bg-orange-100 text-orange-800', icon: '🥉' };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-xl font-bold text-blue-700">
                {vendor.storeName?.charAt(0)?.toUpperCase() || 'V'}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{vendor.storeName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(vendor.status)}`}>
                  {vendor.status?.charAt(0).toUpperCase() + vendor.status?.slice(1)}
                </span>
                {vendor.status === 'active' && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${perfTier.color}`}>
                    {perfTier.icon} {perfTier.tier} Seller
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl">
            &times;
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 p-6 bg-gray-50 border-b">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{vendor.productCount || 0}</p>
            <p className="text-xs text-gray-500">Products</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{formatCurrency(vendor.totalSales || 0)}</p>
            <p className="text-xs text-gray-500">Total Sales</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{vendor.orderCount || 0}</p>
            <p className="text-xs text-gray-500">Orders</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              <p className="text-2xl font-bold text-gray-900">{vendor.avgRating?.toFixed(1) || '-'}</p>
            </div>
            <p className="text-xs text-gray-500">Avg Rating</p>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Vendor Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Vendor Information</h3>
              <div className="space-y-3 bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Store Name</span>
                  <span className="text-sm font-medium">{vendor.storeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Store URL</span>
                  <span className="text-sm font-mono text-blue-600">/{vendor.slug}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Owner</span>
                  <span className="text-sm font-medium">{vendor.userId?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Email</span>
                  <span className="text-sm">{vendor.userId?.email || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Phone</span>
                  <span className="text-sm">{vendor.phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Joined</span>
                  <span className="text-sm">{new Date(vendor.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Business & KYC */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Business & KYC</h3>
              <div className="space-y-3 bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Business Name</span>
                  <span className="text-sm font-medium">{vendor.kyc?.businessName || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Business Type</span>
                  <span className="text-sm capitalize">{vendor.kyc?.businessType || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Tax ID / PAN</span>
                  <span className="text-sm font-mono">{vendor.kyc?.taxId || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">KYC Status</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                    vendor.kyc?.status === 'approved' ? 'bg-green-100 text-green-800' :
                    vendor.kyc?.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {vendor.kyc?.status?.charAt(0).toUpperCase() + vendor.kyc?.status?.slice(1) || 'Pending'}
                  </span>
                </div>
                {vendor.kyc?.verifiedAt && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Verified On</span>
                    <span className="text-sm">{new Date(vendor.kyc.verifiedAt).toLocaleDateString()}</span>
                  </div>
                )}
                {vendor.kyc?.rejectionReason && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                    <strong>Rejection reason:</strong> {vendor.kyc.rejectionReason}
                  </div>
                )}
              </div>

              {/* KYC Actions — only when pending */}
              {vendor.kyc?.status === 'pending' && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                    <p className="text-sm font-semibold text-yellow-800">KYC Pending — Review & Approve</p>
                  </div>

                  {/* Checklist */}
                  <div className="space-y-1 mb-4 text-xs text-gray-600">
                    <div className={`flex items-center gap-1.5 ${vendor.kyc?.businessName ? 'text-green-700' : 'text-red-600'}`}>
                      {vendor.kyc?.businessName ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      Business Name: {vendor.kyc?.businessName || 'Missing'}
                    </div>
                    <div className={`flex items-center gap-1.5 ${vendor.kyc?.gstVerified ? 'text-green-700' : 'text-red-600'}`}>
                      {vendor.kyc?.gstVerified ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      GST Verified: {vendor.kyc?.gstVerified ? `Yes (${vendor.kyc?.taxId || ''})` : 'Not verified'}
                    </div>
                    <div className={`flex items-center gap-1.5 ${vendor.kyc?.documents?.some(d => d.type === 'id_proof') ? 'text-green-700' : 'text-red-600'}`}>
                      {vendor.kyc?.documents?.some(d => d.type === 'id_proof') ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      ID Proof uploaded
                    </div>
                    <div className={`flex items-center gap-1.5 ${vendor.kyc?.documents?.some(d => d.type === 'address_proof') ? 'text-green-700' : 'text-red-600'}`}>
                      {vendor.kyc?.documents?.some(d => d.type === 'address_proof') ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      Address Proof uploaded
                    </div>
                  </div>

                  {/* Documents list */}
                  {vendor.kyc?.documents?.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-700 mb-1">Uploaded Documents:</p>
                      <div className="space-y-1">
                        {vendor.kyc.documents.map((doc, idx) => (
                          <a key={idx} href={doc.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 bg-white px-2 py-1 rounded border border-blue-200">
                            <ExternalLink className="w-3 h-3" />
                            {doc.filename} ({doc.type?.replace(/_/g, ' ')})
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reject reason input */}
                  {showKYCReject && (
                    <div className="mb-3">
                      <select
                        value={kycRejectionReason}
                        onChange={(e) => setKycRejectionReason(e.target.value)}
                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 mb-2"
                      >
                        <option value="">Select rejection reason...</option>
                        <option value="Invalid or unclear documents">Invalid or unclear documents</option>
                        <option value="Incomplete information provided">Incomplete information provided</option>
                        <option value="GST details do not match business name">GST details do not match business name</option>
                        <option value="Documents appear to be fraudulent">Documents appear to be fraudulent</option>
                        <option value="Address does not match documents">Address does not match documents</option>
                        <option value="ID document has expired">ID document has expired</option>
                        <option value="Business could not be verified">Business could not be verified</option>
                      </select>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setShowKYCReject(false); setKycRejectionReason(''); }}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-50"
                          disabled={!kycRejectionReason || kycActionLoading}
                          onClick={() => { onRejectKYC(kycRejectionReason); setShowKYCReject(false); setKycRejectionReason(''); }}
                        >
                          Confirm Reject
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Approve / Reject buttons */}
                  {!showKYCReject && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 flex-1"
                        disabled={kycActionLoading || !vendor.kyc?.gstVerified || !vendor.kyc?.businessName || !vendor.kyc?.documents?.some(d => d.type === 'id_proof') || !vendor.kyc?.documents?.some(d => d.type === 'address_proof')}
                        onClick={onApproveKYC}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        {kycActionLoading ? 'Processing...' : 'Approve KYC'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50 flex-1"
                        disabled={kycActionLoading}
                        onClick={() => setShowKYCReject(true)}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject KYC
                      </Button>
                    </div>
                  )}

                  {/* Disabled reason tooltip */}
                  {(!vendor.kyc?.gstVerified || !vendor.kyc?.businessName || !vendor.kyc?.documents?.some(d => d.type === 'id_proof')) && !showKYCReject && (
                    <p className="text-xs text-red-600 mt-2">
                      ⚠️ Approve button disabled — {!vendor.kyc?.gstVerified ? 'GST not verified' : !vendor.kyc?.businessName ? 'Business name missing' : 'Required documents missing'}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bank Details */}
          {vendor.bank && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Bank Details</h3>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Account Holder</p>
                    <p className="text-sm font-medium">{vendor.bank.accountName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Bank Name</p>
                    <p className="text-sm font-medium">{vendor.bank.bankName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Account Number</p>
                    <p className="text-sm font-mono">{vendor.bank.accountNumber ? `****${vendor.bank.accountNumber.slice(-4)}` : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">IFSC Code</p>
                    <p className="text-sm font-mono">{vendor.bank.routingNumber || vendor.bank.ifscCode || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Commission Settings */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Commission Settings</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Platform Commission Rate
                  </label>
                  {isEditingCommission ? (
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1 max-w-xs">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={commissionValue}
                          onChange={(e) => setCommissionValue(parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter commission %"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                      </div>
                      <Button onClick={handleCommissionSave} className="bg-green-600 hover:bg-green-700">
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setCommissionValue(vendor.defaultCommissionPercentage || 15);
                          setIsEditingCommission(false);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-300">
                        <Percent className="w-5 h-5 text-blue-600" />
                        <span className="text-2xl font-bold text-gray-900">
                          {vendor.defaultCommissionPercentage || 15}%
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setIsEditingCommission(true)}
                        className="border-blue-300 text-blue-600 hover:bg-blue-100"
                      >
                        Change
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-gray-600 mt-2">
                    Vendor receives <strong>{100 - (vendor.defaultCommissionPercentage || 15)}%</strong> of each sale
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Category-Based Commission Rules */}
          <div className="mt-6">
            <CategoryCommissionRules
              entityType="vendor"
              entityId={vendor._id}
              currentRules={vendor.commissionRules || []}
            />
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-between gap-4 pt-4 border-t">
            <Button
              onClick={onDelete}
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Vendor
            </Button>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              {vendor.status === 'pending' && (
                <>
                  <Button onClick={onApprove} className="bg-green-600 hover:bg-green-700">
                    Approve
                  </Button>
                  <Button onClick={onReject} variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
                    Reject
                  </Button>
                </>
              )}
              {vendor.status === 'active' && (
                <Button onClick={onSuspend} variant="outline" className="border-yellow-300 text-yellow-600 hover:bg-yellow-50">
                  Suspend
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Vendors;
