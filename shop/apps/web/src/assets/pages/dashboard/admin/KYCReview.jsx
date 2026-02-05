import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield, Eye, CheckCircle, XCircle, FileText, Clock, Store, Users,
  BadgeCheck, AlertTriangle, Download, RefreshCw, ChevronRight,
  CreditCard, Building, Phone, Mail, MapPin, FileCheck, FileX,
  CheckCircle2, Circle, Hourglass, Calendar, ExternalLink
} from 'lucide-react';
import api from '../../../utils/api';
import { useToast } from '../../../components/common/ToastContainer';
import Button from '../../../components/common/Button';

// Pre-defined rejection reasons
const REJECTION_REASONS = [
  { value: 'invalid_documents', label: 'Invalid or unclear documents' },
  { value: 'incomplete_info', label: 'Incomplete information provided' },
  { value: 'gst_mismatch', label: 'GST details do not match business name' },
  { value: 'fake_documents', label: 'Documents appear to be fraudulent' },
  { value: 'address_mismatch', label: 'Address does not match documents' },
  { value: 'id_expired', label: 'ID document has expired' },
  { value: 'business_not_verified', label: 'Business could not be verified' },
  { value: 'other', label: 'Other (specify below)' },
];

// Calculate waiting days
const getWaitingDays = (createdAt) => {
  const now = new Date();
  const created = new Date(createdAt);
  const diffTime = Math.abs(now - created);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Get priority badge based on waiting time
const getPriorityBadge = (days) => {
  if (days >= 7) return { label: 'Urgent', color: 'bg-red-100 text-red-800 border-red-200', icon: '🔴' };
  if (days >= 3) return { label: 'High', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: '🟠' };
  if (days >= 1) return { label: 'Normal', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: '🟡' };
  return { label: 'New', color: 'bg-green-100 text-green-800 border-green-200', icon: '🟢' };
};

const KYCReview = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all'); // all, vendor, affiliate
  const [selectedKYC, setSelectedKYC] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedRejectReason, setSelectedRejectReason] = useState('');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  // Fetch pending KYC submissions
  const { data: kycData, isLoading, refetch } = useQuery({
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
      queryClient.invalidateQueries({ queryKey: ['admin-pending-kyc'] });
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
      queryClient.invalidateQueries({ queryKey: ['admin-pending-kyc'] });
      toast.success('Vendor KYC rejected');
      setRejectModalOpen(false);
      setViewModalOpen(false);
      setSelectedKYC(null);
      setRejectReason('');
      setSelectedRejectReason('');
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
      queryClient.invalidateQueries({ queryKey: ['admin-pending-kyc'] });
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
      queryClient.invalidateQueries({ queryKey: ['admin-pending-kyc'] });
      toast.success('Affiliate KYC rejected');
      setRejectModalOpen(false);
      setViewModalOpen(false);
      setSelectedKYC(null);
      setRejectReason('');
      setSelectedRejectReason('');
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
    const finalReason = selectedRejectReason === 'other'
      ? rejectReason
      : REJECTION_REASONS.find(r => r.value === selectedRejectReason)?.label || rejectReason;

    if (!selectedKYC || !finalReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    if (selectedKYC.type === 'vendor') {
      rejectVendorMutation.mutate({ id: selectedKYC._id, reason: finalReason });
    } else {
      rejectAffiliateMutation.mutate({ id: selectedKYC._id, reason: finalReason });
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const csvData = [
      ['Type', 'Name', 'Email', 'Phone', 'GST Status', 'Documents', 'Submitted', 'Waiting Days'].join(','),
      ...(submissions || []).map(s => [
        s.type,
        s.type === 'vendor' ? s.storeName : s.kyc?.fullName || 'N/A',
        s.userId?.email || 'N/A',
        s.kyc?.phoneNumber || 'N/A',
        s.kyc?.gstVerified ? 'Verified' : 'Not Verified',
        s.kyc?.documents?.length || 0,
        new Date(s.createdAt).toLocaleDateString(),
        getWaitingDays(s.createdAt),
      ].map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kyc-pending-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully!');
  };

  // Toggle selection
  const toggleSelection = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Select all
  const toggleSelectAll = () => {
    if (selectedIds.length === submissions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(submissions.map(s => s._id));
    }
  };

  // Get verification checklist for modal
  const getVerificationChecklist = (kyc) => {
    if (!kyc) return [];

    const items = [
      {
        label: 'Email Verified',
        status: kyc.userId?.isEmailVerified ? 'verified' : 'pending',
        icon: Mail,
      },
      {
        label: 'Phone Provided',
        status: kyc.kyc?.phoneNumber ? 'verified' : 'pending',
        icon: Phone,
      },
      {
        label: 'Address Provided',
        status: kyc.kyc?.address || kyc.kyc?.businessAddress ? 'verified' : 'pending',
        icon: MapPin,
      },
      {
        label: 'Documents Uploaded',
        status: kyc.kyc?.documents?.length > 0 ? 'verified' : 'missing',
        icon: FileText,
      },
    ];

    if (kyc.type === 'vendor') {
      items.push(
        {
          label: 'GST Verified',
          status: kyc.kyc?.gstVerified ? 'verified' : 'missing',
          icon: Building,
          critical: true,
        },
        {
          label: 'Business Name',
          status: kyc.kyc?.businessName ? 'verified' : 'pending',
          icon: Store,
        }
      );
    } else {
      items.push(
        {
          label: 'PAN Number',
          status: kyc.panNumber ? 'verified' : 'pending',
          icon: CreditCard,
        },
        {
          label: 'Bank Details',
          status: kyc.bankDetails?.accountNumber ? 'verified' : 'pending',
          icon: Building,
        }
      );
    }

    return items;
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

  // Calculate additional stats
  const urgentCount = submissions.filter(s => getWaitingDays(s.createdAt) >= 7).length;
  const withDocsCount = submissions.filter(s => s.kyc?.documents?.length > 0).length;
  const gstVerifiedCount = submissions.filter(s => s.kyc?.gstVerified).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-600" />
            KYC Review
          </h1>
          <p className="text-gray-700 mt-1">Review and approve vendor & affiliate verifications</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Pending</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total || 0}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Vendors</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{stats.totalVendors || 0}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Store className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Affiliates</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.totalAffiliates || 0}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Urgent - Waiting 7+ days */}
        <div className={`rounded-xl shadow-sm border p-5 ${urgentCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Urgent (7+ days)</p>
              <p className={`text-3xl font-bold mt-1 ${urgentCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>{urgentCount}</p>
            </div>
            <div className={`p-3 rounded-lg ${urgentCount > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
              <Hourglass className={`w-6 h-6 ${urgentCount > 0 ? 'text-red-600' : 'text-gray-600'}`} />
            </div>
          </div>
        </div>

        {/* GST Verified Count */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">GST Verified</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">{gstVerifiedCount}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <BadgeCheck className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'all', label: 'All', count: stats.total || 0 },
              { key: 'vendor', label: 'Vendors', count: stats.totalVendors || 0 },
              { key: 'affiliate', label: 'Affiliates', count: stats.totalAffiliates || 0 },
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === key
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label} ({count})
              </button>
            ))}
          </div>
          <div className="text-sm text-gray-500">
            {withDocsCount} with documents uploaded
          </div>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {submissions.length === 0 ? (
          <div className="text-center py-16">
            <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No pending KYC submissions</p>
            <p className="text-gray-400 text-sm mt-1">All verifications have been processed</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === submissions.length}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    Applicant
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">
                    Waiting
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">
                    Docs
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">
                    GST
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {submissions.map((submission) => {
                  const waitingDays = getWaitingDays(submission.createdAt);
                  const priority = getPriorityBadge(waitingDays);

                  return (
                    <tr
                      key={submission._id}
                      className={`hover:bg-gray-50 transition-colors ${waitingDays >= 7 ? 'bg-red-50/30' : ''}`}
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(submission._id)}
                          onChange={() => toggleSelection(submission._id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            submission.type === 'vendor'
                              ? 'bg-blue-100 text-blue-800'
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
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            submission.type === 'vendor' ? 'bg-blue-100' : 'bg-green-100'
                          }`}>
                            <span className={`text-sm font-bold ${
                              submission.type === 'vendor' ? 'text-blue-700' : 'text-green-700'
                            }`}>
                              {(submission.type === 'vendor'
                                ? submission.storeName
                                : submission.kyc?.fullName)?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {submission.type === 'vendor'
                                ? submission.storeName
                                : submission.kyc?.fullName || 'N/A'}
                            </p>
                            <p className="text-xs text-gray-500">{submission.userId?.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-900">{submission.userId?.email}</p>
                        <p className="text-xs text-gray-500">{submission.kyc?.phoneNumber || 'No phone'}</p>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${priority.color}`}>
                          {priority.icon} {waitingDays}d
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {submission.kyc?.documents?.length > 0 ? (
                            <>
                              <FileCheck className="w-4 h-4 text-green-600" />
                              <span className="text-sm font-medium text-green-700">
                                {submission.kyc.documents.length}
                              </span>
                            </>
                          ) : (
                            <>
                              <FileX className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-400">0</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {submission.kyc?.gstVerified ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
                            <BadgeCheck className="w-3 h-3" /> ✓
                          </span>
                        ) : submission.type === 'vendor' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded-full">
                            <AlertTriangle className="w-3 h-3" /> ✗
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => handleView(submission)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          Review
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewModalOpen && selectedKYC && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    selectedKYC.type === 'vendor' ? 'bg-blue-100' : 'bg-green-100'
                  }`}>
                    {selectedKYC.type === 'vendor' ? (
                      <Store className="w-6 h-6 text-blue-600" />
                    ) : (
                      <Users className="w-6 h-6 text-green-600" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedKYC.type === 'vendor' ? selectedKYC.storeName : selectedKYC.kyc?.fullName}
                    </h2>
                    <p className="text-sm text-gray-500 capitalize">{selectedKYC.type} Verification</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setViewModalOpen(false);
                    setSelectedKYC(null);
                  }}
                  className="text-gray-400 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {/* Waiting badge */}
              <div className="mt-4 flex items-center gap-4">
                {(() => {
                  const days = getWaitingDays(selectedKYC.createdAt);
                  const priority = getPriorityBadge(days);
                  return (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${priority.color}`}>
                      <Calendar className="w-4 h-4" />
                      Waiting {days} day{days !== 1 ? 's' : ''}
                    </span>
                  );
                })()}
                <span className="text-sm text-gray-500">
                  Submitted on {new Date(selectedKYC.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </span>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Verification Checklist */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  Verification Checklist
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {getVerificationChecklist(selectedKYC).map((item, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        item.status === 'verified'
                          ? 'bg-green-50 border-green-200'
                          : item.status === 'missing' && item.critical
                            ? 'bg-red-50 border-red-200'
                            : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      {item.status === 'verified' ? (
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      ) : item.status === 'missing' ? (
                        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          item.status === 'verified' ? 'text-green-800' :
                          item.status === 'missing' && item.critical ? 'text-red-800' : 'text-gray-700'
                        }`}>
                          {item.label}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Info */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">User Information</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 flex items-center gap-2">
                        <Users className="w-4 h-4" /> Name
                      </span>
                      <span className="font-medium">{selectedKYC.userId?.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 flex items-center gap-2">
                        <Mail className="w-4 h-4" /> Email
                      </span>
                      <span className="font-medium">{selectedKYC.userId?.email}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Type</span>
                      <span className={`capitalize px-2 py-0.5 rounded text-sm font-medium ${
                        selectedKYC.type === 'vendor' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>{selectedKYC.type}</span>
                    </div>
                  </div>
                </div>

                {/* KYC Details */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    {selectedKYC.type === 'vendor' ? 'Business Information' : 'Personal Information'}
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    {selectedKYC.type === 'vendor' ? (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Business Name</span>
                          <span className="font-medium">{selectedKYC.kyc?.businessName || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Business Type</span>
                          <span className="font-medium">{selectedKYC.kyc?.businessType || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Tax ID</span>
                          <span className="font-medium font-mono">{selectedKYC.kyc?.taxId || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Phone</span>
                          <span className="font-medium">{selectedKYC.kyc?.phoneNumber || 'N/A'}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Full Name</span>
                          <span className="font-medium">{selectedKYC.kyc?.fullName || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Phone</span>
                          <span className="font-medium">{selectedKYC.kyc?.phoneNumber || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">ID Type</span>
                          <span className="font-medium capitalize">{selectedKYC.kyc?.idType?.replace(/_/g, ' ') || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">ID Number</span>
                          <span className="font-medium font-mono">{selectedKYC.kyc?.idNumber || 'N/A'}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-gray-600" />
                  Address
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-800">
                    {selectedKYC.type === 'vendor'
                      ? selectedKYC.kyc?.businessAddress
                      : `${selectedKYC.kyc?.address || ''}, ${selectedKYC.kyc?.city || ''}, ${selectedKYC.kyc?.state || ''}, ${selectedKYC.kyc?.country || ''} ${selectedKYC.kyc?.zipCode || ''}`
                    || 'No address provided'}
                  </p>
                </div>
              </div>

              {/* GST Verification Status */}
              {(selectedKYC.type === 'vendor' || selectedKYC.kyc?.gstNumber) && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Building className="w-5 h-5 text-gray-600" />
                    GST Verification
                  </h3>
                  {selectedKYC.kyc?.gstVerified ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <BadgeCheck className="w-6 h-6 text-green-600" />
                        <span className="font-semibold text-green-800 text-lg">GST Verified</span>
                      </div>
                      {selectedKYC.kyc?.gstDetails && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {selectedKYC.kyc.gstDetails.gstNumber && (
                            <div className="flex justify-between bg-white p-3 rounded-lg">
                              <span className="text-gray-600">GST Number</span>
                              <span className="font-mono font-medium">{selectedKYC.kyc.gstDetails.gstNumber}</span>
                            </div>
                          )}
                          {selectedKYC.kyc.gstDetails.tradeName && (
                            <div className="flex justify-between bg-white p-3 rounded-lg">
                              <span className="text-gray-600">Trade Name</span>
                              <span className="font-medium">{selectedKYC.kyc.gstDetails.tradeName}</span>
                            </div>
                          )}
                          {selectedKYC.kyc.gstDetails.legalName && (
                            <div className="flex justify-between bg-white p-3 rounded-lg">
                              <span className="text-gray-600">Legal Name</span>
                              <span className="font-medium">{selectedKYC.kyc.gstDetails.legalName}</span>
                            </div>
                          )}
                          {selectedKYC.kyc.gstDetails.status && (
                            <div className="flex justify-between bg-white p-3 rounded-lg">
                              <span className="text-gray-600">Status</span>
                              <span className={`font-semibold ${selectedKYC.kyc.gstDetails.status === 'Active' ? 'text-green-700' : 'text-amber-700'}`}>
                                {selectedKYC.kyc.gstDetails.status}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={`${selectedKYC.type === 'vendor' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'} border rounded-lg p-4 flex items-center gap-3`}>
                      <AlertTriangle className={`w-6 h-6 flex-shrink-0 ${selectedKYC.type === 'vendor' ? 'text-red-500' : 'text-gray-400'}`} />
                      <span className={selectedKYC.type === 'vendor' ? 'text-red-700 font-medium' : 'text-gray-500'}>
                        {selectedKYC.type === 'vendor'
                          ? 'GST NOT verified - Vendor KYC requires GST verification before approval'
                          : 'GST not provided (optional for affiliates)'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Documents */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-600" />
                  Submitted Documents
                  {selectedKYC.kyc?.documents?.length > 0 && (
                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                      {selectedKYC.kyc.documents.length} file(s)
                    </span>
                  )}
                </h3>
                {selectedKYC.kyc?.documents?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedKYC.kyc.documents.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-100 p-2 rounded-lg">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{doc.filename}</p>
                            <p className="text-xs text-gray-500 capitalize">{doc.type?.replace(/_/g, ' ')}</p>
                          </div>
                        </div>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 hover:border-blue-600 rounded-lg text-sm font-medium transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-6 text-center border border-gray-200">
                    <FileX className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">No documents uploaded</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex flex-wrap justify-between items-center gap-4">
              <p className="text-sm text-gray-500">
                Review the information carefully before approving or rejecting.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setRejectModalOpen(true)}
                  className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 font-medium transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
                <button
                  onClick={handleApprove}
                  disabled={
                    approveVendorMutation.isPending ||
                    approveAffiliateMutation.isPending ||
                    (selectedKYC.type === 'vendor' && !selectedKYC.kyc?.gstVerified)
                  }
                  className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  {approveVendorMutation.isPending || approveAffiliateMutation.isPending
                    ? 'Approving...'
                    : 'Approve'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                Reject KYC Application
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Select a reason for rejection
              </p>
            </div>
            <div className="p-6 space-y-4">
              {/* Pre-defined rejection reasons */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason
                </label>
                <select
                  value={selectedRejectReason}
                  onChange={(e) => setSelectedRejectReason(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="">Select a reason...</option>
                  {REJECTION_REASONS.map((reason) => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom reason textarea (shown when "Other" is selected) */}
              {selectedRejectReason === 'other' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Reason
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    rows={3}
                    placeholder="Enter custom rejection reason..."
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setRejectModalOpen(false);
                    setRejectReason('');
                    setSelectedRejectReason('');
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectSubmit}
                  disabled={
                    (!selectedRejectReason || (selectedRejectReason === 'other' && !rejectReason.trim())) ||
                    rejectVendorMutation.isPending ||
                    rejectAffiliateMutation.isPending
                  }
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium transition-colors"
                >
                  {rejectVendorMutation.isPending || rejectAffiliateMutation.isPending
                    ? 'Rejecting...'
                    : 'Confirm Reject'}
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
