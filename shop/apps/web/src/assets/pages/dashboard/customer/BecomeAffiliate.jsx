// FILE: apps/web/src/pages/dashboard/customer/BecomeAffiliate.jsx
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { AlertTriangle } from 'lucide-react';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';

const BecomeAffiliate = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [confirmRoleSwitch, setConfirmRoleSwitch] = useState(false);
  const [formData, setFormData] = useState({
    paymentMethod: 'bank',
    accountNumber: '',
    ifsc: '',
    accountName: '',
    upiId: '',
    paypalEmail: '',
  });

  const applyMutation = useMutation({
    mutationFn: async (data) => {
      const paymentDetails = {};

      if (data.paymentMethod === 'bank') {
        paymentDetails.accountNumber = data.accountNumber;
        paymentDetails.ifsc = data.ifsc;
        paymentDetails.accountName = data.accountName;
      } else if (data.paymentMethod === 'upi') {
        paymentDetails.upiId = data.upiId;
      } else if (data.paymentMethod === 'paypal') {
        paymentDetails.paypalEmail = data.paypalEmail;
      }

      const response = await api.post('/affiliates/apply', {
        paymentMethod: data.paymentMethod,
        paymentDetails,
      });
      return response.data;
    },
    onSuccess: () => {
      alert('Affiliate application submitted successfully! Please wait for admin approval.');
      // Navigate to affiliate dashboard
      navigate('/affiliate-dashboard');
    },
    onError: (error) => {
      const message = error.response?.data?.error?.message || 'Failed to submit application';
      alert(message);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    applyMutation.mutate(formData);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Become an Affiliate</h1>
        <p className="text-gray-700">
          Earn commissions by promoting our products. Fill out the form below to submit your affiliate application.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role Switching Warning */}
          {(user?.role === 'vendor' || user?.role === 'support') && (
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6 mb-6 animate-fadeInUp">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5 animate-pulse" />
                <div className="flex-1">
                  <h3 className="font-bold text-yellow-900 mb-2 text-lg">
                    ⚠️ Important: Role Switching Warning
                  </h3>
                  <p className="text-yellow-800 mb-3">
                    You are currently <strong className="text-yellow-900">{user.role === 'vendor' ? 'a Vendor' : 'a Support Agent'}</strong>.
                    Applying to become an Affiliate will <strong className="text-yellow-900">replace your {user.role} role</strong> and you will:
                  </p>
                  <ul className="space-y-2 text-yellow-800 mb-4">
                    {user.role === 'vendor' && (
                      <>
                        <li className="flex items-start gap-2">
                          <span className="text-red-600 font-bold">❌</span>
                          <span><strong>Lose access</strong> to your Vendor Dashboard</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-red-600 font-bold">❌</span>
                          <span><strong>Lose all your product listings</strong> (products will be unpublished)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-red-600 font-bold">❌</span>
                          <span><strong>Lose pending vendor settlements</strong> (may not be paid out)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-red-600 font-bold">❌</span>
                          <span><strong>Cannot fulfill existing orders</strong> as a vendor</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-red-600 font-bold">❌</span>
                          <span><strong>Lose all sponsored ad campaigns</strong> and their performance data</span>
                        </li>
                      </>
                    )}
                    {user.role === 'support' && (
                      <>
                        <li className="flex items-start gap-2">
                          <span className="text-red-600 font-bold">❌</span>
                          <span><strong>Lose access</strong> to Support Dashboard and ticket system</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-red-600 font-bold">❌</span>
                          <span><strong>Can no longer</strong> handle customer support tickets</span>
                        </li>
                      </>
                    )}
                  </ul>
                  <div className="bg-white border-2 border-yellow-500 rounded-lg p-4">
                    <p className="text-yellow-900 font-semibold mb-2">
                      💡 Want to be BOTH {user.role === 'vendor' ? 'a Vendor and an Affiliate' : 'Support and an Affiliate'}?
                    </p>
                    <p className="text-sm text-yellow-800">
                      Please contact our support team at <strong>ledvtech@gmail.com</strong> or
                      call <strong>+91 99445 56683</strong> before proceeding. We may be able to help you maintain both roles.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Program Benefits */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h2 className="text-lg font-bold text-green-800 mb-3">Affiliate Program Benefits</h2>
            <ul className="space-y-2 text-sm text-green-700">
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Earn up to 10% commission on every sale</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>30-day cookie tracking for attribution</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Real-time performance tracking dashboard</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Monthly payouts with multiple payment options</span>
              </li>
            </ul>
          </div>

          {/* Payment Method */}
          <div>
            <h2 className="text-xl font-bold mb-4">Payment Information</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Payment Method
                </label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="input w-full"
                >
                  <option value="bank">Bank Transfer</option>
                  <option value="upi">UPI</option>
                  <option value="paypal">PayPal</option>
                </select>
              </div>

              {/* Bank Transfer Fields */}
              {formData.paymentMethod === 'bank' && (
                <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                  <Input
                    label="Account Holder Name"
                    type="text"
                    required
                    placeholder="Name as per bank account"
                    value={formData.accountName}
                    onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                  />

                  <Input
                    label="Account Number"
                    type="text"
                    required
                    placeholder="Enter your bank account number"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  />

                  <Input
                    label="IFSC Code"
                    type="text"
                    required
                    placeholder="Enter bank IFSC code"
                    value={formData.ifsc}
                    onChange={(e) => setFormData({ ...formData, ifsc: e.target.value })}
                  />
                </div>
              )}

              {/* UPI Fields */}
              {formData.paymentMethod === 'upi' && (
                <div className="pl-4 border-l-2 border-gray-200">
                  <Input
                    label="UPI ID"
                    type="text"
                    required
                    placeholder="username@upi"
                    value={formData.upiId}
                    onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                    helperText="Enter your UPI ID (e.g., yourname@paytm, yourname@gpay)"
                  />
                </div>
              )}

              {/* PayPal Fields */}
              {formData.paymentMethod === 'paypal' && (
                <div className="pl-4 border-l-2 border-gray-200">
                  <Input
                    label="PayPal Email"
                    type="email"
                    required
                    placeholder="your@email.com"
                    value={formData.paypalEmail}
                    onChange={(e) => setFormData({ ...formData, paypalEmail: e.target.value })}
                    helperText="Enter the email associated with your PayPal account"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Role Switch Confirmation */}
          {(user?.role === 'vendor' || user?.role === 'support') && (
            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-5">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmRoleSwitch}
                  onChange={(e) => setConfirmRoleSwitch(e.target.checked)}
                  className="mt-1 w-5 h-5 text-red-600 border-red-300 rounded focus:ring-red-500"
                  required
                />
                <span className="text-sm text-red-900">
                  <strong>I understand and confirm</strong> that I will <strong>permanently lose my {user.role} role</strong> and
                  all associated data, dashboard access, and privileges if I proceed with this Affiliate application.
                  I have read the warning above and accept the consequences.
                </span>
              </label>
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center gap-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/dashboard')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={applyMutation.isLoading}
              disabled={(user?.role === 'vendor' || user?.role === 'support') && !confirmRoleSwitch}
            >
              Submit Application
            </Button>
          </div>

          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <p className="text-sm text-primary-800">
              <strong>Note:</strong> Your application will be reviewed by our team.
              You'll receive an email notification once your affiliate account is approved.
              After approval, you'll get your unique affiliate code and tracking links.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BecomeAffiliate;
