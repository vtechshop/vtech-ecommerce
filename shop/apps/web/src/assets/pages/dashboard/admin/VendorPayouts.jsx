import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import { useToast } from '@/components/common/ToastContainer';
import Button from '@/components/common/Button';

const VendorPayouts = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showPayoutModal, setShowPayoutModal] = useState(false);

  // Fetch pending payouts
  const { data: pendingPayouts, isLoading } = useQuery({
    queryKey: ['admin', 'payouts', 'pending'],
    queryFn: async () => {
      const response = await api.get('/admin/payouts/pending');
      return response.data.data;
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

      // Show bank details if manual transfer required
      if (data.data.transferId === 'MANUAL' && data.data.bankDetails) {
        const bankInfo = data.data.bankDetails;
        toast.info(
          `Manual transfer required:\nAccount: ${bankInfo.accountNumber}\nIFSC: ${bankInfo.ifscCode}\nHolder: ${bankInfo.accountHolder}`,
          { autoClose: false }
        );
      }

      queryClient.invalidateQueries(['admin', 'payouts', 'pending']);
      queryClient.invalidateQueries(['admin', 'commissions']);
      setShowPayoutModal(false);
      setSelectedVendor(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to process payout');
    },
  });

  // Batch payout mutation (pay all approved commissions)
  const batchPayoutMutation = useMutation({
    mutationFn: async (vendorId) => {
      const response = await api.post(`/admin/payouts/vendor/${vendorId}/batch`);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Batch payout processed: ${data.data.vendor}`);
      queryClient.invalidateQueries(['admin', 'payouts', 'pending']);
      setSelectedVendor(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to process batch payout');
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

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vendor Payouts</h1>
        <p className="text-gray-700">Manage and process vendor commission payouts</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-700">Total Vendors with Pending Payouts</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">
            {pendingPayouts?.length || 0}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-700">Total Pending Amount</div>
          <div className="text-3xl font-bold text-green-600 mt-2">
            ₹{pendingPayouts?.reduce((sum, v) => sum + v.pendingAmount, 0).toLocaleString('en-IN') || 0}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-700">Total Commissions</div>
          <div className="text-3xl font-bold text-blue-600 mt-2">
            {pendingPayouts?.reduce((sum, v) => sum + v.commissionCount, 0) || 0}
          </div>
        </div>
      </div>

      {/* Pending Payouts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Pending Payouts</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Commissions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pending Amount
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pendingPayouts && pendingPayouts.length > 0 ? (
                pendingPayouts.map((vendor) => (
                  <tr key={vendor.vendorId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {vendor.vendorName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {vendor.commissionCount} orders
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-green-600">
                        ₹{vendor.pendingAmount.toLocaleString('en-IN')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        onClick={() => handleProcessPayout(vendor)}
                        variant="primary"
                        size="sm"
                        className="mr-2"
                      >
                        Process Payout
                      </Button>
                      <Button
                        onClick={() => handleBatchPayout(vendor.vendorId)}
                        variant="secondary"
                        size="sm"
                      >
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

      {/* Payout Modal */}
      {showPayoutModal && selectedVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Process Payout - {selectedVendor.vendorName}
            </h2>

            <div className="mb-6">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-700">Vendor</div>
                    <div className="text-lg font-semibold">{selectedVendor.vendorName}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-700">Payout Amount</div>
                    <div className="text-lg font-semibold text-green-600">
                      ₹{selectedVendor.pendingAmount.toLocaleString('en-IN')}
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
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">Commission Details</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {vendorCommissions.map((commission) => (
                      <div key={commission._id} className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-sm font-medium">
                              Order #{commission.orderId?.orderId || 'N/A'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {commission.percentage}% commission
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-green-600">
                            ₹{commission.amount.toLocaleString('en-IN')}
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
                <strong>Note:</strong> If Stripe is not configured, this will be marked as a manual
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
