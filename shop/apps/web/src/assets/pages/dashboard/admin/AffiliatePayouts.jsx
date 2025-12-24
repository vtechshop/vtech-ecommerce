import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DollarSign, Eye, CheckCircle, Clock, Filter, Download } from 'lucide-react';
import api from '../../../utils/api';
import { useToast } from '../../../components/common/ToastContainer';
import Button from '../../../components/common/Button';
import Modal from '../../../components/common/Modal';
import Input from '../../../components/common/Input';

const AffiliatePayouts = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedAffiliate, setSelectedAffiliate] = useState(null);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');

  // Fetch affiliates with pending payouts
  const { data: affiliatesData, isLoading } = useQuery({
    queryKey: ['admin-affiliate-payouts', statusFilter],
    queryFn: async () => {
      let url = '/admin/affiliates?';
      if (statusFilter !== 'all') {
        url += `status=${statusFilter}`;
      }
      const response = await api.get(url);
      return response.data.data;
    },
  });

  // Mark payout as paid mutation
  const markPaidMutation = useMutation({
    mutationFn: async ({ affiliateId, amount, reference }) => {
      const response = await api.post(`/admin/affiliates/${affiliateId}/payout`, {
        amount,
        reference,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-affiliate-payouts'] });
      toast.success('Payout recorded successfully');
      setShowPayoutModal(false);
      setSelectedAffiliate(null);
      setPayoutAmount('');
      setPaymentReference('');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to record payout');
    },
  });

  const handleViewDetails = (affiliate) => {
    setSelectedAffiliate(affiliate);
  };

  const handleProcessPayout = (affiliate) => {
    setSelectedAffiliate(affiliate);
    setPayoutAmount(affiliate.pendingEarnings?.toFixed(2) || '0');
    setShowPayoutModal(true);
  };

  const handleSubmitPayout = (e) => {
    e.preventDefault();

    if (!payoutAmount || parseFloat(payoutAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    markPaidMutation.mutate({
      affiliateId: selectedAffiliate._id,
      amount: parseFloat(payoutAmount),
      reference: paymentReference,
    });
  };

  const affiliates = affiliatesData || [];

  // Calculate totals
  const totalPending = affiliates.reduce((sum, a) => sum + (a.pendingEarnings || 0), 0);
  const totalPaid = affiliates.reduce((sum, a) => sum + (a.paidEarnings || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Affiliate Payouts</h1>
        <p className="text-gray-700 mt-1">Manage commission payments to affiliates</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-700">Total Pending</p>
              <p className="text-2xl font-bold text-gray-900">₹{totalPending.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-700">Total Paid</p>
              <p className="text-2xl font-bold text-gray-900">₹{totalPaid.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-700">Active Affiliates</p>
              <p className="text-2xl font-bold text-gray-900">
                {affiliates.filter(a => a.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Affiliates</option>
            <option value="active">Active Only</option>
            <option value="pending">Pending Approval</option>
          </select>
        </div>
      </div>

      {/* Affiliates Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {affiliates.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No affiliates found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Affiliate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total Earnings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Pending
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Paid
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {affiliates.map((affiliate) => (
                <tr key={affiliate._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{affiliate.userId?.name || 'N/A'}</p>
                      <p className="text-sm text-gray-700">{affiliate.userId?.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                      {affiliate.code}
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">
                      ₹{affiliate.totalEarnings?.toFixed(2) || '0.00'}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-yellow-600">
                      ₹{affiliate.pendingEarnings?.toFixed(2) || '0.00'}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-green-600">
                      ₹{affiliate.paidEarnings?.toFixed(2) || '0.00'}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      affiliate.status === 'active' ? 'bg-green-100 text-green-800' :
                      affiliate.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {affiliate.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewDetails(affiliate)}
                        title="View Bank Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {affiliate.pendingEarnings > 0 && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleProcessPayout(affiliate)}
                          title="Process Payout"
                        >
                          <DollarSign className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* View Details Modal */}
      {selectedAffiliate && !showPayoutModal && (
        <Modal
          isOpen={!!selectedAffiliate}
          onClose={() => setSelectedAffiliate(null)}
          title="Affiliate Payment Details"
          size="md"
        >
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Affiliate Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">Name:</span>
                  <span className="font-medium">{selectedAffiliate.userId?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Email:</span>
                  <span className="font-medium">{selectedAffiliate.userId?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Code:</span>
                  <code className="font-medium">{selectedAffiliate.code}</code>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-900 mb-3">Bank Account Details</h3>
              {selectedAffiliate.paymentDetails ? (
                <div className="space-y-2 text-sm bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Account Holder:</span>
                    <span className="font-medium">{selectedAffiliate.paymentDetails.accountHolderName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Bank Name:</span>
                    <span className="font-medium">{selectedAffiliate.paymentDetails.bankName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Account Number:</span>
                    <span className="font-medium font-mono">{selectedAffiliate.paymentDetails.accountNumber || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">IFSC Code:</span>
                    <span className="font-medium font-mono">{selectedAffiliate.paymentDetails.ifscCode || 'N/A'}</span>
                  </div>
                  {selectedAffiliate.paymentDetails.upiId && (
                    <div className="flex justify-between">
                      <span className="text-gray-700">UPI ID:</span>
                      <span className="font-medium">{selectedAffiliate.paymentDetails.upiId}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No bank details added yet</p>
              )}
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-900 mb-3">Earnings Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">Total Earnings:</span>
                  <span className="font-medium">₹{selectedAffiliate.totalEarnings?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-yellow-700">Pending:</span>
                  <span className="font-medium text-yellow-600">₹{selectedAffiliate.pendingEarnings?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Paid Out:</span>
                  <span className="font-medium text-green-600">₹{selectedAffiliate.paidEarnings?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => setSelectedAffiliate(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Process Payout Modal */}
      {showPayoutModal && (
        <Modal
          isOpen={showPayoutModal}
          onClose={() => {
            setShowPayoutModal(false);
            setSelectedAffiliate(null);
            setPayoutAmount('');
            setPaymentReference('');
          }}
          title="Process Payout"
          size="md"
        >
          <form onSubmit={handleSubmitPayout} className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                Processing payment for <strong>{selectedAffiliate?.userId?.name}</strong>
              </p>
            </div>

            <Input
              label="Payout Amount (₹)"
              type="number"
              step="0.01"
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(e.target.value)}
              required
              placeholder="Enter amount"
            />

            <Input
              label="Payment Reference / Transaction ID"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              required
              placeholder="e.g., TXN123456789"
            />

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Make sure you have transferred the amount to the affiliate's bank account before marking this as paid.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowPayoutModal(false);
                  setSelectedAffiliate(null);
                  setPayoutAmount('');
                  setPaymentReference('');
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={markPaidMutation.isPending}
              >
                Mark as Paid
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AffiliatePayouts;
