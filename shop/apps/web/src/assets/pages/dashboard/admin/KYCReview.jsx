import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Eye, CheckCircle, XCircle, FileText, Clock, Store, Users } from 'lucide-react';
import api from '../../../utils/api';
import { useToast } from '../../../components/common/ToastContainer';

const KYCReview = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all'); // all, vendor, affiliate
  const [selectedKYC, setSelectedKYC] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);

  // Fetch pending KYC submissions
  const { data: kycData, isLoading } = useQuery({
    queryKey: ['admin-pending-kyc', filter],
    queryFn: async () => {
      const params = filter !== 'all' ? `?type=${filter}` : '';
      const response = await api.get(`/admin/kyc/pending${params}`);
      return response.data;
    },
  });

  // Approve vendor KYC mutation
  const approveVendorMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.put(`/admin/kyc/vendors/${id}/approve`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-pending-kyc']);
      toast.success('Vendor KYC approved successfully');
      setViewModalOpen(false);
      setSelectedKYC(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to approve vendor KYC');
    },
  });

  // Reject vendor KYC mutation
  const rejectVendorMutation = useMutation({
    mutationFn: async ({ id, reason }) => {
      const response = await api.put(`/admin/kyc/vendors/${id}/reject`, { reason });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-pending-kyc']);
      toast.success('Vendor KYC rejected');
      setRejectModalOpen(false);
      setViewModalOpen(false);
      setSelectedKYC(null);
      setRejectReason('');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to reject vendor KYC');
    },
  });

  // Approve affiliate KYC mutation
  const approveAffiliateMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.put(`/admin/kyc/affiliates/${id}/approve`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-pending-kyc']);
      toast.success('Affiliate KYC approved successfully');
      setViewModalOpen(false);
      setSelectedKYC(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to approve affiliate KYC');
    },
  });

  // Reject affiliate KYC mutation
  const rejectAffiliateMutation = useMutation({
    mutationFn: async ({ id, reason }) => {
      const response = await api.put(`/admin/kyc/affiliates/${id}/reject`, { reason });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-pending-kyc']);
      toast.success('Affiliate KYC rejected');
      setRejectModalOpen(false);
      setViewModalOpen(false);
      setSelectedKYC(null);
      setRejectReason('');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to reject affiliate KYC');
    },
  });

  const handleView = (kyc) => {
    setSelectedKYC(kyc);
    setViewModalOpen(true);
  };

  const handleApprove = () => {
    if (!selectedKYC) return;

    if (selectedKYC.type === 'vendor') {
      approveVendorMutation.mutate(selectedKYC._id);
    } else {
      approveAffiliateMutation.mutate(selectedKYC._id);
    }
  };

  const handleRejectSubmit = () => {
    if (!selectedKYC || !rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    if (selectedKYC.type === 'vendor') {
      rejectVendorMutation.mutate({ id: selectedKYC._id, reason: rejectReason });
    } else {
      rejectAffiliateMutation.mutate({ id: selectedKYC._id, reason: rejectReason });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const submissions = kycData?.data || [];
  const stats = kycData?.meta || {};

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            KYC Review
          </h1>
          <p className="text-gray-700 mt-1">Review and approve vendor & affiliate verifications</p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">Total Pending</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total || 0}</p>
            </div>
            <Clock className="w-10 h-10 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">Pending Vendors</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalVendors || 0}</p>
            </div>
            <Store className="w-10 h-10 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">Pending Affiliates</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalAffiliates || 0}</p>
            </div>
            <Users className="w-10 h-10 text-green-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({stats.total || 0})
          </button>
          <button
            onClick={() => setFilter('vendor')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'vendor'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Vendors ({stats.totalVendors || 0})
          </button>
          <button
            onClick={() => setFilter('affiliate')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'affiliate'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Affiliates ({stats.totalAffiliates || 0})
          </button>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {submissions.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No pending KYC submissions</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Documents
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {submissions.map((submission) => (
                <tr key={submission._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        submission.type === 'vendor'
                          ? 'bg-primary-100 text-primary-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {submission.type === 'vendor' ? (
                        <Store className="w-3 h-3" />
                      ) : (
                        <Users className="w-3 h-3" />
                      )}
                      {submission.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {submission.type === 'vendor'
                        ? submission.storeName
                        : submission.kyc?.fullName || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">{submission.userId?.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">
                      {new Date(submission.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">
                      {submission.kyc?.documents?.length || 0} file(s)
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleView(submission)}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* View Modal */}
      {viewModalOpen && selectedKYC && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  KYC Review - {selectedKYC.type === 'vendor' ? selectedKYC.storeName : selectedKYC.kyc?.fullName}
                </h2>
                <button
                  onClick={() => {
                    setViewModalOpen(false);
                    setSelectedKYC(null);
                  }}
                  className="text-gray-400 hover:text-gray-700"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* User Info */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">User Information</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Name:</span>
                    <span className="font-medium">{selectedKYC.userId?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Email:</span>
                    <span className="font-medium">{selectedKYC.userId?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Type:</span>
                    <span className="font-medium capitalize">{selectedKYC.type}</span>
                  </div>
                </div>
              </div>

              {/* KYC Details */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  {selectedKYC.type === 'vendor' ? 'Business Information' : 'Personal Information'}
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  {selectedKYC.type === 'vendor' ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Business Name:</span>
                        <span className="font-medium">{selectedKYC.kyc?.businessName || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Business Type:</span>
                        <span className="font-medium">{selectedKYC.kyc?.businessType || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Tax ID:</span>
                        <span className="font-medium">{selectedKYC.kyc?.taxId || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Phone:</span>
                        <span className="font-medium">{selectedKYC.kyc?.phoneNumber || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Address:</span>
                        <span className="font-medium text-right">{selectedKYC.kyc?.businessAddress || 'N/A'}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Full Name:</span>
                        <span className="font-medium">{selectedKYC.kyc?.fullName || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Phone:</span>
                        <span className="font-medium">{selectedKYC.kyc?.phoneNumber || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">ID Type:</span>
                        <span className="font-medium">{selectedKYC.kyc?.idType || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">ID Number:</span>
                        <span className="font-medium">{selectedKYC.kyc?.idNumber || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Address:</span>
                        <span className="font-medium text-right">
                          {selectedKYC.kyc?.address}, {selectedKYC.kyc?.city}, {selectedKYC.kyc?.state},{' '}
                          {selectedKYC.kyc?.country} {selectedKYC.kyc?.zipCode}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Documents */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Submitted Documents</h3>
                {selectedKYC.kyc?.documents?.length > 0 ? (
                  <div className="space-y-2">
                    {selectedKYC.kyc.documents.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-gray-700" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{doc.filename}</p>
                            <p className="text-xs text-gray-500 capitalize">{doc.type?.replace(/_/g, ' ')}</p>
                          </div>
                        </div>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          View
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No documents uploaded</p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setRejectModalOpen(true)}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </button>
              <button
                onClick={handleApprove}
                disabled={
                  approveVendorMutation.isLoading || approveAffiliateMutation.isLoading
                }
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                {approveVendorMutation.isLoading || approveAffiliateMutation.isLoading
                  ? 'Approving...'
                  : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Reject KYC Application</h3>
              <p className="text-sm text-gray-700 mb-4">
                Please provide a reason for rejecting this application:
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                rows={4}
                placeholder="Enter rejection reason..."
              />
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => {
                    setRejectModalOpen(false);
                    setRejectReason('');
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectSubmit}
                  disabled={
                    !rejectReason.trim() ||
                    rejectVendorMutation.isLoading ||
                    rejectAffiliateMutation.isLoading
                  }
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {rejectVendorMutation.isLoading || rejectAffiliateMutation.isLoading
                    ? 'Rejecting...'
                    : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KYCReview;
