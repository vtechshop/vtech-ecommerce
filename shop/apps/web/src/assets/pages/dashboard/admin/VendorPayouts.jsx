import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import { useToast } from '@/components/common/ToastContainer';
import Button from '@/components/common/Button';
import { formatCurrency, formatDate } from '@/utils/format';

const VendorPayouts = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'held'

  // Fetch pending payouts
  const { data: pendingPayouts, isLoading } = useQuery({
    queryKey: ['admin', 'payouts', 'pending'],
    queryFn: async () => {
      const response = await api.get('/admin/payouts/pending');
      return response.data.data;
    },
  });

  // Fetch held transfers (approved commissions with held Razorpay transfers)
  const { data: heldTransfers, isLoading: heldLoading } = useQuery({
    queryKey: ['admin', 'commissions', 'held'],
    queryFn: async () => {
      const response = await api.get('/admin/commissions', {
        params: { status: 'approved', hasTransfer: true },
      });
      return response.data.data || [];
    },
  });

  // Fetch commission details for selected vendor
  const { data: vendorCommissions } = useQuery({
    queryKey: ['admin', 'commissions', selectedVendor?.vendorId],
    queryFn: async () => {
      const response = await api.get('/admin/commissions', {
        params: {
          type: 'vendor',
          status: 'approved',
          subjectId: selectedVendor?.vendorId,
        },
      });
      return response.data.data;
    },
    enabled: !!selectedVendor,
  });

  // Process payout mutation
  const processPayoutMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/admin/payouts/process', data);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Payout processed successfully!');

      if (data.data.transferId === 'MANUAL' && data.data.bankDetails) {
        const bankInfo = data.data.bankDetails;
        toast.info(
          `Manual transfer required:\nAccount: ${bankInfo.accountNumber}\nIFSC: ${bankInfo.ifscCode}\nHolder: ${bankInfo.accountHolder}`,
          { autoClose: false }
        );
      }

      queryClient.invalidateQueries({ queryKey: ['admin', 'payouts', 'pending'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'commissions'] });
      setShowPayoutModal(false);
      setSelectedVendor(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to process payout');
    },
  });

  // Batch payout mutation
  const batchPayoutMutation = useMutation({
    mutationFn: async (vendorId) => {
      const response = await api.post(`/admin/payouts/vendor/${vendorId}/batch`);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Batch payout processed: ${data.data.vendor}`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'payouts', 'pending'] });
      setSelectedVendor(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to process batch payout');
    },
  });

  // Release held transfer mutation
  const releaseTransferMutation = useMutation({
    mutationFn: async (orderId) => {
      const response = await api.post(`/admin/payouts/release-transfers/${orderId}`);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.data.message || 'Transfer released!');
      queryClient.invalidateQueries({ queryKey: ['admin', 'commissions'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'payouts'] });
    },
    onError: (error) => {
      const errData = error.response?.data?.error;
      if (errData?.code === 'RETURN_WINDOW_ACTIVE') {
        toast.warning(`Return window still active. ${errData.daysRemaining} days remaining.`);
      } else {
        toast.error(errData?.message || 'Failed to release transfer');
      }
    },
  });

  const handleProcessPayout = (vendor) => {
    setSelectedVendor(vendor);
    setShowPayoutModal(true);
  };

  const handleBatchPayout = (vendorId) => {
    if (confirm('Process all approved commissions for this vendor?')) {
      batchPayoutMutation.mutate(vendorId);
    }
  };

  const handleReleaseTransfer = (orderId) => {
    if (confirm('Release held transfer for this order? Make sure the return window has passed.')) {
      releaseTransferMutation.mutate(orderId);
    }
  };

  const submitPayout = () => {
    processPayoutMutation.mutate({
      vendorId: selectedVendor.vendorId,
      amount: selectedVendor.pendingAmount,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Group held transfers by orderId for display
  const heldByOrder = {};
  if (heldTransfers) {
    for (const c of heldTransfers) {
      if (c.transfer?.transferId && ['created', 'pending'].includes(c.transfer?.status)) {
        const oid = c.orderId?._id || c.orderId;
        if (!heldByOrder[oid]) {
          heldByOrder[oid] = {
            orderId: oid,
            orderNumber: c.orderId?.orderId || 'N/A',
            orderDate: c.orderId?.createdAt,
            transfers: [],
            totalAmount: 0,
          };
        }
        heldByOrder[oid].transfers.push(c);
        heldByOrder[oid].totalAmount += c.amount;
      }
    }
  }
  const heldOrderList = Object.values(heldByOrder);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vendor Payouts</h1>
        <p className="text-gray-700">Manage and process vendor commission payouts</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-700">Vendors with Pending</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">
            {pendingPayouts?.length || 0}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-700">Total Pending Amount</div>
          <div className="text-3xl font-bold text-green-600 mt-2">
            {formatCurrency(pendingPayouts?.reduce((sum, v) => sum + v.pendingAmount, 0) || 0)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-700">Held Transfers</div>
          <div className="text-3xl font-bold text-orange-600 mt-2">
            {heldOrderList.length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-700">Held Amount</div>
          <div className="text-3xl font-bold text-orange-600 mt-2">
            {formatCurrency(heldOrderList.reduce((sum, o) => sum + o.totalAmount, 0))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'pending'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Pending Payouts ({pendingPayouts?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('held')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'held'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Held Transfers ({heldOrderList.length})
        </button>
      </div>

      {/* Pending Payouts Tab */}
      {activeTab === 'pending' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Pending Payouts</h2>
            <p className="text-sm text-gray-500">Commissions approved and ready for payout (manual or RazorpayX)</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-blue-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commissions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pending Amount</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingPayouts && pendingPayouts.length > 0 ? (
                  pendingPayouts.map((vendor) => (
                    <tr key={vendor.vendorId} className="hover:bg-blue-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{vendor.vendorName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{vendor.commissionCount} orders</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-green-600">
                          {formatCurrency(vendor.pendingAmount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button onClick={() => handleProcessPayout(vendor)} variant="primary" size="sm" className="mr-2">
                          Process Payout
                        </Button>
                        <Button onClick={() => handleBatchPayout(vendor.vendorId)} variant="secondary" size="sm">
                          Batch Pay All
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                      No pending payouts
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Held Transfers Tab */}
      {activeTab === 'held' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Held Razorpay Transfers</h2>
            <p className="text-sm text-gray-500">
              Transfers held on Razorpay Route until the 7-day return window passes after delivery.
              Click "Release" to send money to the vendor's bank account.
            </p>
          </div>

          <div className="p-4">
            {/* Info banner */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="text-sm text-orange-800">
                  <strong>How it works:</strong> When a customer pays, the vendor's share is automatically transferred to Razorpay Route but kept on hold.
                  After the order is delivered and the 7-day return window passes, you can release the transfer here.
                  The money then goes directly to the vendor's linked bank account.
                </div>
              </div>
            </div>

            {heldOrderList.length > 0 ? (
              <div className="space-y-3">
                {heldOrderList.map((orderGroup) => {
                  // Calculate days since delivery (if available)
                  const deliveredInfo = orderGroup.transfers[0]?.orderId?.events?.find(e => e.status === 'delivered');
                  const daysSinceDelivery = deliveredInfo
                    ? Math.floor((Date.now() - new Date(deliveredInfo.timestamp).getTime()) / (1000 * 60 * 60 * 24))
                    : null;
                  const canRelease = daysSinceDelivery !== null && daysSinceDelivery >= 7;

                  return (
                    <div key={orderGroup.orderId} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-semibold text-gray-900">
                              Order #{orderGroup.orderNumber}
                            </span>
                            <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                              On Hold
                            </span>
                            {daysSinceDelivery !== null && (
                              <span className={`text-xs ${canRelease ? 'text-green-600 font-semibold' : 'text-gray-500'}`}>
                                {canRelease
                                  ? 'Return window passed'
                                  : `${7 - daysSinceDelivery} days left in return window`}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                            <span>{orderGroup.transfers.length} transfer(s)</span>
                            <span className="font-semibold text-green-700">{formatCurrency(orderGroup.totalAmount)}</span>
                            {orderGroup.orderDate && (
                              <span>Ordered: {formatDate(orderGroup.orderDate)}</span>
                            )}
                          </div>
                          {/* Show vendor names */}
                          <div className="mt-1 text-xs text-gray-500">
                            {orderGroup.transfers.map((t, i) => (
                              <span key={i}>
                                {t.transfer?.linkedAccountId && (
                                  <span className="font-mono">{t.transfer.linkedAccountId.slice(0, 12)}...</span>
                                )}
                                {' '}{formatCurrency(t.amount)}
                                {i < orderGroup.transfers.length - 1 && ' | '}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="ml-4">
                          <Button
                            onClick={() => handleReleaseTransfer(orderGroup.orderId)}
                            variant={canRelease ? 'primary' : 'secondary'}
                            size="sm"
                            disabled={releaseTransferMutation.isPending}
                          >
                            {releaseTransferMutation.isPending ? 'Releasing...' : 'Release'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No held transfers. Transfers will appear here after orders are paid via Razorpay Route.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payout Modal */}
      {showPayoutModal && selectedVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Process Payout - {selectedVendor.vendorName}
            </h2>

            <div className="mb-6">
              <div className="bg-blue-100 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-700">Vendor</div>
                    <div className="text-lg font-semibold">{selectedVendor.vendorName}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-700">Payout Amount</div>
                    <div className="text-lg font-semibold text-green-600">
                      {formatCurrency(selectedVendor.pendingAmount)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-700">Commissions</div>
                    <div className="text-lg font-semibold">{selectedVendor.commissionCount}</div>
                  </div>
                </div>
              </div>

              {/* Commission Details */}
              {vendorCommissions && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-blue-100 px-4 py-2 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">Commission Details</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {vendorCommissions.map((commission) => (
                      <div key={commission._id} className="px-4 py-3 border-b border-gray-100 hover:bg-blue-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-sm font-medium">
                              Order #{commission.orderId?.orderId || 'N/A'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {commission.percentage}% commission
                              {commission.transfer?.transferId && (
                                <span className="ml-2 text-orange-600">
                                  (Razorpay: {commission.transfer.status})
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-green-600">
                            {formatCurrency(commission.amount)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> If Razorpay is not configured, this will be marked as a manual
                transfer. You'll need to transfer the funds to the vendor's bank account manually.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                onClick={() => {
                  setShowPayoutModal(false);
                  setSelectedVendor(null);
                }}
                variant="secondary"
              >
                Cancel
              </Button>
              <Button
                onClick={submitPayout}
                variant="primary"
                disabled={processPayoutMutation.isPending}
              >
                {processPayoutMutation.isPending ? 'Processing...' : 'Confirm Payout'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorPayouts;
