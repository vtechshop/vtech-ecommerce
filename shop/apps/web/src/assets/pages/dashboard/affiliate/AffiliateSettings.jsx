import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Settings, DollarSign, Shield, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../utils/api';

const AffiliateSettings = () => {
  const navigate = useNavigate();

  // Fetch affiliate data
  const { data: affiliateData, isLoading } = useQuery({
    queryKey: ['affiliate-settings'],
    queryFn: async () => {
      const response = await api.get('/affiliates/me');
      return response.data.data;
    },
  });

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

      {/* Quick Settings Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* KYC & Bank Details */}
        <div
          onClick={() => navigate('/affiliate-dashboard/kyc')}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:border-primary-500 cursor-pointer transition-colors"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">KYC & Bank Details</h3>
              <p className="text-sm text-gray-700 mb-3">
                Complete your verification and add bank account details for receiving payouts
              </p>
              <div className="inline-flex items-center gap-2 text-blue-600 text-sm font-medium">
                <span>Manage KYC & Bank Details</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Payment History */}
        <div
          onClick={() => navigate('/affiliate-dashboard/commissions')}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:border-primary-500 cursor-pointer transition-colors"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Commission History</h3>
              <p className="text-sm text-gray-700 mb-3">
                View your commission earnings, pending payouts, and transaction history
              </p>
              <div className="inline-flex items-center gap-2 text-green-600 text-sm font-medium">
                <span>View Commissions</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-700" />
          Account Information
        </h2>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Affiliate Code</label>
              <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                <span className="font-mono text-lg font-semibold text-primary-600">
                  {affiliateData?.code || 'N/A'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Status</label>
              <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                  affiliateData?.status === 'active' ? 'bg-green-100 text-green-800' :
                  affiliateData?.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {affiliateData?.status?.toUpperCase() || 'PENDING'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Commission Rate</label>
              <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                <span className="text-lg font-semibold text-gray-900">
                  {affiliateData?.commissionPercentage || 5}%
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Conversions</label>
              <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                <span className="text-lg font-semibold text-gray-900">
                  {affiliateData?.totalConversions || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Important Information
        </h3>
        <ul className="text-sm text-blue-900 space-y-2 list-disc list-inside">
          <li>Update your bank details in the <strong>KYC Verification</strong> page</li>
          <li>Commissions are paid out weekly/monthly once they reach the minimum threshold</li>
          <li>Ensure your KYC is approved to receive payouts</li>
          <li>Contact support if you have any payment-related issues</li>
        </ul>
      </div>
    </div>
  );
};

export default AffiliateSettings;
