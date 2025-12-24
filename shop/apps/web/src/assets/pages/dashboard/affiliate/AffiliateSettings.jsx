import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, CreditCard, DollarSign, Save } from 'lucide-react';
import api from '../../../utils/api';
import { useToast } from '../../../components/common/ToastContainer';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';

const AffiliateSettings = () => {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [paymentData, setPaymentData] = useState({
    paymentMethod: 'bank',
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    upiId: '',
  });

  // Fetch affiliate data
  const { data: affiliateData, isLoading } = useQuery({
    queryKey: ['affiliate-settings'],
    queryFn: async () => {
      const response = await api.get('/affiliates/me');
      return response.data.data;
    },
  });

  // Update payment details when data is loaded
  useEffect(() => {
    if (affiliateData?.paymentDetails) {
      setPaymentData({
        paymentMethod: affiliateData.paymentMethod || 'bank',
        accountHolderName: affiliateData.paymentDetails.accountHolderName || '',
        bankName: affiliateData.paymentDetails.bankName || '',
        accountNumber: affiliateData.paymentDetails.accountNumber || '',
        ifscCode: affiliateData.paymentDetails.ifscCode || '',
        upiId: affiliateData.paymentDetails.upiId || '',
      });
    }
  }, [affiliateData]);

  // Update payment details mutation
  const updatePaymentMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.put('/affiliates/payment-details', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-settings'] });
      toast.success('Payment details updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update payment details');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (paymentData.paymentMethod === 'bank') {
      if (!paymentData.accountHolderName || !paymentData.bankName ||
          !paymentData.accountNumber || !paymentData.ifscCode) {
        toast.error('Please fill all bank details');
        return;
      }
    }

    updatePaymentMutation.mutate({
      paymentMethod: paymentData.paymentMethod,
      paymentDetails: {
        accountHolderName: paymentData.accountHolderName,
        bankName: paymentData.bankName,
        accountNumber: paymentData.accountNumber,
        ifscCode: paymentData.ifscCode,
        upiId: paymentData.upiId,
      },
    });
  };

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
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-600" />
          Affiliate Settings
        </h1>
        <p className="text-gray-700 mt-1">Manage your payment preferences</p>
      </div>

      {/* Earnings Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-700">Total Earnings</p>
              <p className="text-2xl font-bold text-gray-900">
                ₹{affiliateData?.totalEarnings?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-700">Pending</p>
              <p className="text-2xl font-bold text-gray-900">
                ₹{affiliateData?.pendingEarnings?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-700">Paid Out</p>
              <p className="text-2xl font-bold text-gray-900">
                ₹{affiliateData?.paidEarnings?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Details Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              Bank Account Details
            </h2>
            <p className="text-sm text-gray-700 mb-6">
              Add your bank details to receive commission payments
            </p>
          </div>

          <div className="space-y-4">
            <Input
              label="Account Holder Name"
              value={paymentData.accountHolderName}
              onChange={(e) => setPaymentData({ ...paymentData, accountHolderName: e.target.value })}
              required
              placeholder="Enter full name as per bank account"
            />

            <Input
              label="Bank Name"
              value={paymentData.bankName}
              onChange={(e) => setPaymentData({ ...paymentData, bankName: e.target.value })}
              required
              placeholder="e.g., State Bank of India"
            />

            <Input
              label="Account Number"
              value={paymentData.accountNumber}
              onChange={(e) => setPaymentData({ ...paymentData, accountNumber: e.target.value })}
              required
              placeholder="Enter bank account number"
              type="text"
            />

            <Input
              label="IFSC Code"
              value={paymentData.ifscCode}
              onChange={(e) => setPaymentData({ ...paymentData, ifscCode: e.target.value.toUpperCase() })}
              required
              placeholder="e.g., SBIN0001234"
              maxLength={11}
            />

            <Input
              label="UPI ID (Optional)"
              value={paymentData.upiId}
              onChange={(e) => setPaymentData({ ...paymentData, upiId: e.target.value })}
              placeholder="e.g., yourname@paytm"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Commissions are typically paid out weekly/monthly once they reach the minimum threshold.
              Ensure your bank details are correct to avoid payment delays.
            </p>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button
              type="submit"
              variant="primary"
              loading={updatePaymentMutation.isPending}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Payment Details
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AffiliateSettings;
