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
import CategoryCommissionRules from '@/components/admin/CategoryCommissionRules';
import { Search, CheckCircle, XCircle, UserX, AlertCircle, RefreshCw, Percent } from 'lucide-react';

const Vendors = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingVendor, setViewingVendor] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-vendors', page, statusFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', '20');
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
      toast.success('Vendor suspended successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to suspend vendor');
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

      // Update the viewing vendor with new data
      if (data.data && viewingVendor) {
        setViewingVendor(data.data);
      }

      // Show success toast
      const message = data.message || 'Commission updated successfully';
      toast.success(message);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update commission');
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      case 'rejected':
        return 'bg-gray-100 text-gray-900';
      default:
        return 'bg-gray-100 text-gray-900';
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

  const vendors = data?.data || [];
  const totalPages = Math.ceil((data?.meta?.total || 0) / 20);

  const pendingCount = vendors.filter(v => v.status === 'pending').length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Vendor Management</h1>
          {pendingCount > 0 && (
            <p className="text-sm text-gray-700 mt-1">
              {pendingCount} pending approval{pendingCount > 1 ? 's' : ''}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-vendors'] })}
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Pending Approvals Alert */}
      {pendingCount > 0 && statusFilter !== 'pending' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="text-sm font-semibold text-yellow-800">
                {pendingCount} vendor application{pendingCount > 1 ? 's' : ''} awaiting approval
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search vendors..."
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
      </div>

      {/* Vendors Table */}
      {vendors.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No vendors found</h3>
          <p className="text-gray-700 mb-4">
            {statusFilter === 'pending'
              ? 'There are no pending vendor applications at the moment.'
              : searchTerm
              ? 'No vendors match your search criteria. Try adjusting your filters.'
              : 'No vendors have registered yet. New vendor applications will appear here.'}
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('');
              queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });
            }}
            className="flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Clear Filters & Refresh
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Vendor</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Store</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Contact</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Commission</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">KYC</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Joined</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((vendor) => (
                <tr key={vendor._id} className={`border-b last:border-b-0 transition-colors ${getPendingItemClasses(vendor.status)}`}>
                  <td className="py-3 px-3 sm:px-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        vendor.status === 'pending' ? 'bg-yellow-200' : 'bg-gray-200'
                      }`}>
                        <span className={`text-sm font-medium ${
                          vendor.status === 'pending' ? 'text-yellow-700' : 'text-gray-700'
                        }`}>
                          {vendor.userId?.name?.charAt(0)?.toUpperCase() || 'V'}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{vendor.userId?.name || 'N/A'}</p>
                          <PendingBadge status={vendor.status} />
                        </div>
                        <p className="text-xs text-gray-700">
                          ID: {vendor._id.slice(-8)} • {formatRelativeTime(vendor.createdAt)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 sm:px-4">
                    <div>
                      <p className="font-medium">{vendor.storeName}</p>
                      <p className="text-xs text-gray-700">{vendor.slug}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <div>
                      <p className="font-medium">{vendor.userId?.email || 'N/A'}</p>
                      <p className="text-xs text-gray-700">{vendor.phone || 'N/A'}</p>
                    </div>
                  </td>
                  <td className="py-3 px-3 sm:px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        vendor.status
                      )}`}
                    >
                      {getStatusIcon(vendor.status)}
                      {vendor.status?.charAt(0).toUpperCase() + vendor.status?.slice(1)}
                    </span>
                  </td>
                  <td className="py-3 px-3 sm:px-4">
                    <div className="flex items-center gap-1">
                      <Percent className="w-3 h-3 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {vendor.defaultCommissionPercentage || 15}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 sm:px-4">
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
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {new Date(vendor.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleView(vendor)}
                        className="text-blue-600 hover:text-blue-700 px-3 py-1 rounded hover:bg-primary-50 text-sm font-medium"
                        title="View Details"
                      >
                        View Details
                      </button>
                      {vendor.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(vendor._id)}
                            className="text-green-600 hover:text-green-700 px-3 py-1 rounded hover:bg-green-50 text-sm font-medium flex items-center gap-1"
                            title="Approve Vendor"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(vendor._id)}
                            className="text-red-600 hover:text-red-700 px-3 py-1 rounded hover:bg-red-50 text-sm font-medium flex items-center gap-1"
                            title="Reject Vendor"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </button>
                        </>
                      )}
                      {vendor.status === 'active' && (
                        <button
                          onClick={() => handleSuspend(vendor._id)}
                          className="text-yellow-600 hover:text-yellow-700 px-3 py-1 rounded hover:bg-yellow-50 text-sm font-medium flex items-center gap-1"
                          title="Suspend Vendor"
                        >
                          <UserX className="w-4 h-4" />
                          Suspend
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6">
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
          onUpdateCommission={(commission) => updateCommissionMutation.mutate({ id: viewingVendor._id, commission })}
        />
      )}
    </div>
  );
};

// Vendor Details Modal Component
const VendorDetailsModal = ({ vendor, onClose, onApprove, onReject, onSuspend, onUpdateCommission }) => {
  const [commissionValue, setCommissionValue] = useState(vendor.defaultCommissionPercentage || 15);
  const [isEditingCommission, setIsEditingCommission] = useState(false);

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
        return 'bg-gray-100 text-gray-900';
      default:
        return 'bg-gray-100 text-gray-900';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">{vendor.storeName}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Vendor Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Vendor Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Store Name</label>
                  <p className="text-sm">{vendor.storeName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Store Slug</label>
                  <p className="text-sm font-mono">{vendor.slug}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Owner Name</label>
                  <p className="text-sm">{vendor.userId?.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <p className="text-sm">{vendor.userId?.email || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Phone</label>
                  <p className="text-sm">{vendor.phone || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <p className="text-sm">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        vendor.status
                      )}`}
                    >
                      {vendor.status?.charAt(0).toUpperCase() + vendor.status?.slice(1)}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Business Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Business Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Business Name</label>
                  <p className="text-sm">{vendor.kyc?.businessName || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Business Type</label>
                  <p className="text-sm capitalize">{vendor.kyc?.businessType || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Tax ID / PAN</label>
                  <p className="text-sm font-mono">{vendor.kyc?.taxId || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <p className="text-sm">{vendor.description || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Joined Date</label>
                  <p className="text-sm">{new Date(vendor.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bank Details */}
          {vendor.bank && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Bank Details</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Account Holder Name</label>
                    <p className="text-sm">{vendor.bank.accountName || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Bank Name</label>
                    <p className="text-sm">{vendor.bank.bankName || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Account Number</label>
                    <p className="text-sm font-mono">{vendor.bank.accountNumber ? `****${vendor.bank.accountNumber.slice(-4)}` : 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Routing/SWIFT</label>
                    <p className="text-sm font-mono">{vendor.bank.routingNumber || vendor.bank.swiftCode || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* KYC Information */}
          {vendor.kyc && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">KYC Status</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">KYC Status</label>
                    <p className="text-sm">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                          vendor.kyc.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : vendor.kyc.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {vendor.kyc.status?.charAt(0).toUpperCase() + vendor.kyc.status?.slice(1)}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Verified Date</label>
                    <p className="text-sm">
                      {vendor.kyc.verifiedAt ? new Date(vendor.kyc.verifiedAt).toLocaleDateString() : 'Not verified'}
                    </p>
                  </div>
                  {vendor.kyc.rejectionReason && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-700">Rejection Reason</label>
                      <p className="text-sm text-red-600">{vendor.kyc.rejectionReason}</p>
                    </div>
                  )}
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
                    Default Platform Commission Rate
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="Enter commission %"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                      </div>
                      <Button
                        onClick={handleCommissionSave}
                        className="bg-green-600 hover:bg-green-700"
                      >
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
                        Change Commission
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-gray-700 mt-2">
                    This is the percentage the platform takes from each sale. The vendor receives{' '}
                    <strong>{100 - (vendor.defaultCommissionPercentage || 15)}%</strong> of the sale amount.
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    💡 Individual products can override this with custom commission rates
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
          <div className="mt-6 flex items-center justify-end gap-4">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {vendor.status === 'pending' && (
              <>
                <Button onClick={onApprove} className="bg-green-600 hover:bg-green-700">
                  Approve Vendor
                </Button>
                <Button onClick={onReject} variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
                  Reject Vendor
                </Button>
              </>
            )}
            {vendor.status === 'active' && (
              <Button onClick={onSuspend} variant="outline" className="border-yellow-300 text-yellow-600 hover:bg-yellow-50">
                Suspend Vendor
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Vendors;