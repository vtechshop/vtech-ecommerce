// FILE: apps/web/src/pages/dashboard/admin/AdCampaignApprovals.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Pause, Eye, ArrowLeft } from 'lucide-react';
import api from '../../../utils/api';
import Button from '../../../components/common/Button';
import Modal from '../../../components/common/Modal';
import { useToast } from '../../../components/common/ToastContainer';
import { formatCurrency, formatDate } from '../../../utils/format';

const AdCampaignApprovals = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState('pending'); // pending, all, stats
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  // Fetch pending campaigns
  const { data: pendingData, isLoading: pendingLoading } = useQuery({
    queryKey: ['admin-pending-campaigns'],
    queryFn: async () => {
      const response = await api.get('/admin/ads/campaigns/pending');
      return response.data.data;
    },
    enabled: selectedTab === 'pending',
  });

  // Fetch all campaigns
  const { data: allCampaigns, isLoading: allLoading } = useQuery({
    queryKey: ['admin-all-campaigns'],
    queryFn: async () => {
      const response = await api.get('/admin/ads/campaigns/all');
      return response.data.data;
    },
    enabled: selectedTab === 'all',
  });

  // Fetch campaign stats
  const { data: statsData } = useQuery({
    queryKey: ['admin-campaign-stats'],
    queryFn: async () => {
      const response = await api.get('/admin/ads/campaigns/stats');
      return response.data.data;
    },
  });

  // Approve campaign mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, adminNotes }) => {
      const response = await api.put(`/admin/ads/campaigns/${id}/approve`, { adminNotes });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['admin-campaign-stats'] });
      toast.success('Campaign approved successfully');
      setShowApproveModal(false);
      setSelectedCampaign(null);
      setAdminNotes('');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to approve campaign');
    },
  });

  // Reject campaign mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, rejectionReason, adminNotes }) => {
      const response = await api.put(`/admin/ads/campaigns/${id}/reject`, {
        rejectionReason,
        adminNotes,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['admin-campaign-stats'] });
      toast.success('Campaign rejected');
      setShowRejectModal(false);
      setSelectedCampaign(null);
      setRejectionReason('');
      setAdminNotes('');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to reject campaign');
    },
  });

  // Pause campaign mutation
  const pauseMutation = useMutation({
    mutationFn: async ({ id, reason }) => {
      const response = await api.put(`/admin/ads/campaigns/${id}/pause`, { reason });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-campaigns'] });
      toast.success('Campaign paused');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to pause campaign');
    },
  });

  const handleApprove = (campaign) => {
    setSelectedCampaign(campaign);
    setShowApproveModal(true);
  };

  const handleReject = (campaign) => {
    setSelectedCampaign(campaign);
    setShowRejectModal(true);
  };

  const handleView = (campaign) => {
    setSelectedCampaign(campaign);
    setShowViewModal(true);
  };

  const confirmApprove = () => {
    if (selectedCampaign) {
      approveMutation.mutate({
        id: selectedCampaign._id,
        adminNotes,
      });
    }
  };

  const confirmReject = () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    if (selectedCampaign) {
      rejectMutation.mutate({
        id: selectedCampaign._id,
        rejectionReason,
        adminNotes,
      });
    }
  };

  const renderCampaignCard = (campaign) => (
    <div key={campaign._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h3 className="text-lg font-semibold">{campaign.name}</h3>
            <span
              className={`px-2 py-1 text-xs font-semibold rounded-full ${
                campaign.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : campaign.status === 'pending_approval'
                  ? 'bg-blue-100 text-blue-800'
                  : campaign.status === 'approved'
                  ? 'bg-green-100 text-green-800'
                  : campaign.status === 'rejected'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {campaign.status.replace('_', ' ')}
            </span>
            {campaign.approval?.status && (
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${
                  campaign.approval.status === 'approved'
                    ? 'bg-green-100 text-green-800'
                    : campaign.approval.status === 'rejected'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {campaign.approval.status === 'approved'
                  ? '✓ Approved'
                  : campaign.approval.status === 'rejected'
                  ? '✗ Rejected'
                  : '⏳ Pending Review'}
              </span>
            )}
            {campaign.qualityScore?.overall && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                Quality: {campaign.qualityScore.overall}/10
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-2">
            <strong>Vendor:</strong> {campaign.vendorId?.storeName || campaign.vendorId?.businessName || 'Unknown'}
          </p>
          <p className="text-sm text-gray-700">
            {campaign.type} • {campaign.pricing} • Bid: {formatCurrency(campaign.bid)}
            {campaign.auctionScore && ` • Auction Score: ${campaign.auctionScore.toFixed(2)}`}
          </p>
          <p className="text-sm text-gray-700">
            Daily Budget: {formatCurrency(campaign.dailyBudget)} • Placement: {campaign.placement}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Created: {formatDate(campaign.createdAt)}
          </p>
          {campaign.approval?.rejectionReason && (
            <p className="text-sm text-red-600 mt-2">
              <strong>Rejection Reason:</strong> {campaign.approval.rejectionReason}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleView(campaign)}>
            <Eye className="w-4 h-4" />
          </Button>
          {(campaign.status === 'pending_approval' || campaign.approval?.status === 'pending') && (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleApprove(campaign)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4 mr-1" />
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReject(campaign)}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <X className="w-4 h-4 mr-1" />
                Reject
              </Button>
            </>
          )}
          {campaign.status === 'active' && campaign.approval?.status === 'approved' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => pauseMutation.mutate({ id: campaign._id, reason: 'Paused by admin' })}
            >
              <Pause className="w-4 h-4 mr-1" />
              Pause
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      {campaign.stats && (
        <div className="grid grid-cols-5 gap-4 pt-4 border-t">
          <div>
            <p className="text-xs text-gray-600">Impressions</p>
            <p className="text-lg font-bold">{campaign.stats.impressions || 0}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Clicks</p>
            <p className="text-lg font-bold">{campaign.stats.clicks || 0}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">CTR</p>
            <p className="text-lg font-bold">
              {campaign.stats.impressions > 0
                ? ((campaign.stats.clicks / campaign.stats.impressions) * 100).toFixed(2)
                : 0}
              %
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Conversions</p>
            <p className="text-lg font-bold">{campaign.stats.conversions || 0}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Spend</p>
            <p className="text-lg font-bold text-red-600">{formatCurrency(campaign.stats.spend || 0)}</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/admin-dashboard/ads"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sponsored Ads
        </Link>
        <h1 className="text-2xl font-bold mb-2">Ad Campaign Approvals</h1>
        <p className="text-gray-600">Review and approve vendor ad campaigns</p>
      </div>

      {/* Stats Cards */}
      {statsData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Total Campaigns</p>
            <p className="text-2xl font-bold">{statsData.total}</p>
          </div>
          <div className="bg-blue-50 rounded-lg shadow-sm border border-blue-200 p-4">
            <p className="text-sm text-blue-700 mb-1">Pending Review</p>
            <p className="text-2xl font-bold text-blue-600">{statsData.pending}</p>
          </div>
          <div className="bg-green-50 rounded-lg shadow-sm border border-green-200 p-4">
            <p className="text-sm text-green-700 mb-1">Approved</p>
            <p className="text-2xl font-bold text-green-600">{statsData.approved}</p>
          </div>
          <div className="bg-red-50 rounded-lg shadow-sm border border-red-200 p-4">
            <p className="text-sm text-red-700 mb-1">Rejected</p>
            <p className="text-2xl font-bold text-red-600">{statsData.rejected}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex gap-4 px-6">
            <button
              onClick={() => setSelectedTab('pending')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                selectedTab === 'pending'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Pending Approval ({statsData?.pending || 0})
            </button>
            <button
              onClick={() => setSelectedTab('all')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                selectedTab === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              All Campaigns ({statsData?.total || 0})
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {selectedTab === 'pending' && (
            <div className="space-y-4">
              {pendingLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : pendingData && pendingData.length > 0 ? (
                pendingData.map(renderCampaignCard)
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">No campaigns pending approval</p>
                </div>
              )}
            </div>
          )}

          {selectedTab === 'all' && (
            <div className="space-y-4">
              {allLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : allCampaigns && allCampaigns.length > 0 ? (
                allCampaigns.map(renderCampaignCard)
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">No campaigns found</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Approve Modal */}
      <Modal isOpen={showApproveModal} onClose={() => setShowApproveModal(false)} title="Approve Campaign" size="md">
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to approve the campaign <strong>{selectedCampaign?.name}</strong>?
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Admin Notes (Optional)</label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Add any notes for the vendor..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowApproveModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={confirmApprove}
              loading={approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="w-4 h-4 mr-2" />
              Approve Campaign
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject Campaign" size="md">
        <div className="space-y-4">
          <p className="text-gray-700">
            Please provide a reason for rejecting the campaign <strong>{selectedCampaign?.name}</strong>:
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="e.g., Bid too low, inappropriate content, etc."
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Admin Notes (Optional)</label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Additional internal notes..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowRejectModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={confirmReject}
              loading={rejectMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              <X className="w-4 h-4 mr-2" />
              Reject Campaign
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Details Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        title="Campaign Details"
        size="lg"
      >
        {selectedCampaign && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Campaign Name</p>
                <p className="text-base text-gray-900">{selectedCampaign.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Type</p>
                <p className="text-base text-gray-900">{selectedCampaign.type}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Pricing Model</p>
                <p className="text-base text-gray-900">{selectedCampaign.pricing}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Bid Amount</p>
                <p className="text-base text-gray-900">{formatCurrency(selectedCampaign.bid)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Daily Budget</p>
                <p className="text-base text-gray-900">{formatCurrency(selectedCampaign.dailyBudget)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Placement</p>
                <p className="text-base text-gray-900">{selectedCampaign.placement}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Quality Score</p>
                <p className="text-base text-gray-900">{selectedCampaign.qualityScore?.overall || 'N/A'}/10</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Auction Score</p>
                <p className="text-base text-gray-900">
                  {selectedCampaign.auctionScore?.toFixed(2) || 'N/A'}
                </p>
              </div>
            </div>
            {selectedCampaign.approval?.adminNotes && (
              <div>
                <p className="text-sm font-medium text-gray-600">Admin Notes</p>
                <p className="text-base text-gray-900">{selectedCampaign.approval.adminNotes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdCampaignApprovals;
