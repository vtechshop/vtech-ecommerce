// FILE: apps/web/src/pages/dashboard/admin/Affiliate.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Pagination from '@/components/common/Pagination';
import Spinner from '@/components/common/Spinner';
import CustomSelect from '@/components/common/CustomSelect';
import { formatDate, formatCurrency } from '@/utils/format';
import { Eye, Search, CheckCircle, XCircle, UserX } from 'lucide-react';
import PendingBadge from '@/components/common/PendingBadge';
import { getPendingItemClasses, formatRelativeTime } from '@/utils/dateHelpers';
import CategoryCommissionRules from '@/components/admin/CategoryCommissionRules';

const Affiliate = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingAffiliate, setViewingAffiliate] = useState(null);

  const { data, isLoading } = useQuery({
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
      setViewingAffiliate(null);
      alert('Affiliate approved successfully');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }) => {
      await api.put(`/admin/affiliates/${id}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-affiliates'] });
      setViewingAffiliate(null);
      alert('Affiliate rejected');
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async (id) => {
      await api.put(`/admin/affiliates/${id}/suspend`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-affiliates'] });
      setViewingAffiliate(null);
      alert('Affiliate suspended');
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      case 'rejected':
        return 'bg-blue-100 text-gray-900';
      default:
        return 'bg-blue-100 text-gray-900';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <UserX className="w-4 h-4" />;
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

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Affiliate Management</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search affiliates..."
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
      </div>

      {/* Affiliates Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-blue-100 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-sm">Affiliate</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Code</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Clicks</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Conversions</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Earnings</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">KYC</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Applied</th>
                <th className="text-right py-3 px-4 font-semibold text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {affiliates.map((affiliate) => (
                <tr key={affiliate._id} className={`border-b last:border-b-0 transition-colors ${getPendingItemClasses(affiliate.status)}`}>
                  <td className="py-3 px-3 sm:px-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        affiliate.status === 'pending' ? 'bg-yellow-200' : 'bg-gray-200'
                      }`}>
                        <span className={`text-sm font-medium ${
                          affiliate.status === 'pending' ? 'text-yellow-700' : 'text-gray-700'
                        }`}>
                          {affiliate.userId?.name?.charAt(0)?.toUpperCase() || 'A'}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{affiliate.userId?.name || 'N/A'}</p>
                          <PendingBadge status={affiliate.status} />
                        </div>
                        <p className="text-xs text-gray-700">{affiliate.userId?.email || 'N/A'}</p>
                        <p className="text-xs text-gray-500">ID: {affiliate._id.slice(-8)} • {formatRelativeTime(affiliate.createdAt)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-sm">{affiliate.code}</td>
                  <td className="py-3 px-3 sm:px-4">{affiliate.totalClicks || 0}</td>
                  <td className="py-3 px-3 sm:px-4">{affiliate.totalConversions || 0}</td>
                  <td className="py-3 px-3 sm:px-4">
                    <div>
                      <p className="font-medium text-sm">{formatCurrency(affiliate.totalEarnings || 0)}</p>
                      <p className="text-xs text-gray-700">Pending: {formatCurrency(affiliate.pendingEarnings || 0)}</p>
                    </div>
                  </td>
                  <td className="py-3 px-3 sm:px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        affiliate.status
                      )}`}
                    >
                      {getStatusIcon(affiliate.status)}
                      {affiliate.status?.charAt(0).toUpperCase() + affiliate.status?.slice(1)}
                    </span>
                  </td>
                  <td className="py-3 px-3 sm:px-4">
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
                  <td className="py-3 px-4 text-sm">{formatDate(affiliate.createdAt)}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleView(affiliate)}
                        className="text-blue-600 hover:text-blue-700 p-1"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {affiliate.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(affiliate._id)}
                            className="text-green-600 hover:text-green-700 p-1"
                            title="Approve Affiliate"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReject(affiliate._id)}
                            className="text-red-600 hover:text-red-700 p-1"
                            title="Reject Affiliate"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {affiliate.status === 'active' && (
                        <button
                          onClick={() => handleSuspend(affiliate._id)}
                          className="text-yellow-600 hover:text-yellow-700 p-1"
                          title="Suspend Affiliate"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
        />
      )}
    </div>
  );
};

// Affiliate Details Modal Component
const AffiliateDetailsModal = ({ affiliate, onClose, onApprove, onReject, onSuspend }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      case 'rejected':
        return 'bg-blue-100 text-gray-900';
      default:
        return 'bg-blue-100 text-gray-900';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">{affiliate.userId?.name || 'Affiliate Details'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Affiliate Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Affiliate Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Name</label>
                  <p className="text-sm">{affiliate.userId?.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <p className="text-sm">{affiliate.userId?.email || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Affiliate Code</label>
                  <p className="text-sm font-mono">{affiliate.code}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <p className="text-sm">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        affiliate.status
                      )}`}
                    >
                      {affiliate.status?.charAt(0).toUpperCase() + affiliate.status?.slice(1)}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Commission Rate</label>
                  <p className="text-sm">{affiliate.commissionPercentage || 5}%</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Applied Date</label>
                  <p className="text-sm">{new Date(affiliate.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Total Clicks</label>
                  <p className="text-sm font-semibold">{affiliate.totalClicks || 0}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Total Conversions</label>
                  <p className="text-sm font-semibold">{affiliate.totalConversions || 0}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Conversion Rate</label>
                  <p className="text-sm font-semibold">
                    {affiliate.totalClicks > 0
                      ? ((affiliate.totalConversions / affiliate.totalClicks) * 100).toFixed(2)
                      : 0}%
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Total Earnings</label>
                  <p className="text-sm font-semibold text-green-600">{formatCurrency(affiliate.totalEarnings || 0)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Pending Earnings</label>
                  <p className="text-sm font-semibold text-yellow-600">{formatCurrency(affiliate.pendingEarnings || 0)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Paid Earnings</label>
                  <p className="text-sm font-semibold text-blue-600">{formatCurrency(affiliate.paidEarnings || 0)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* KYC Information */}
          {affiliate.kyc && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">KYC Information</h3>
              <div className="bg-blue-100 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Full Name</label>
                    <p className="text-sm">{affiliate.kyc.fullName || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Phone Number</label>
                    <p className="text-sm">{affiliate.kyc.phoneNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Address</label>
                    <p className="text-sm">
                      {affiliate.kyc.address || 'N/A'}, {affiliate.kyc.city || ''}, {affiliate.kyc.state || ''} {affiliate.kyc.zipCode || ''}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Country</label>
                    <p className="text-sm">{affiliate.kyc.country || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">ID Type</label>
                    <p className="text-sm">{affiliate.kyc.idType || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">KYC Status</label>
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
                  <div>
                    <label className="text-sm font-medium text-gray-700">Verified Date</label>
                    <p className="text-sm">
                      {affiliate.kyc.verifiedAt ? new Date(affiliate.kyc.verifiedAt).toLocaleDateString() : 'Not verified'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Payment Method</label>
                    <p className="text-sm">{affiliate.paymentMethod || 'N/A'}</p>
                  </div>
                  {affiliate.kyc.rejectionReason && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-700">Rejection Reason</label>
                      <p className="text-sm text-red-600">{affiliate.kyc.rejectionReason}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Rejection Reason (if rejected) */}
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
          <div className="mt-6 flex items-center justify-end gap-4">
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
  );
};

export default Affiliate;
