// FILE: apps/web/src/pages/dashboard/customer/BecomeVendor.jsx
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AlertTriangle } from 'lucide-react';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import { setUser } from '@/store/slices/authSlice';
import { useToast } from '@/components/common/ToastContainer';

const BecomeVendor = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { user } = useSelector((state) => state.auth);
  const [confirmRoleSwitch, setConfirmRoleSwitch] = useState(false);
  const [formData, setFormData] = useState({
    storeName: '',
    description: '',
    businessName: '',
    businessType: 'sole_proprietorship',
    taxId: '',
    bankAccountNumber: '',
    bankName: '',
    bankAccountName: '',
  });

  const onboardMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/vendors/onboard', {
        storeName: data.storeName,
        description: data.description,
        kyc: {
          businessName: data.businessName,
          businessType: data.businessType,
          taxId: data.taxId,
        },
        bank: {
          accountNumber: data.bankAccountNumber,
          bankName: data.bankName,
          accountName: data.bankAccountName,
        },
      });

      return response.data;
    },
    onSuccess: async (responseData) => {
      // Refresh user data to get vendorProfile populated
      try {
        const meResponse = await api.get('/auth/me');
        dispatch(setUser(meResponse.data.data));

        // Invalidate notification counts so admin sees new vendor
        queryClient.invalidateQueries({ queryKey: ['notification-counts'] });
        queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });

        toast.success('Vendor application submitted successfully! Please wait for admin approval.');
      } catch (error) {
        toast.error('Application submitted but failed to update session. Please refresh the page.');
      }

      // Navigate to vendor dashboard KYC page
      setTimeout(() => {
        navigate('/vendor-dashboard/kyc');
      }, 1500);
    },
    onError: (error) => {
      const message = error.response?.data?.error?.message || 'Failed to submit application';
      toast.error(message);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onboardMutation.mutate(formData);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Become a Vendor</h1>
        <p className="text-gray-700">
          Start selling your products on our platform. Fill out the form below to submit your vendor application.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role Switching Warning */}
          {(user?.role === 'affiliate' || user?.role === 'support') && (
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6 mb-6 animate-fadeInUp">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5 animate-pulse" />
                <div className="flex-1">
                  <h3 className="font-bold text-yellow-900 mb-2 text-lg">
                    ⚠️ Important: Role Switching Warning
                  </h3>
                  <p className="text-yellow-800 mb-3">
                    You are currently <strong className="text-yellow-900">{user.role === 'affiliate' ? 'an Affiliate' : 'a Support Agent'}</strong>.
                    Applying to become a Vendor will <strong className="text-yellow-900">replace your {user.role} role</strong> and you will:
                  </p>
                  <ul className="space-y-2 text-yellow-800 mb-4">
                    {user.role === 'affiliate' && (
                      <>
                        <li className="flex items-start gap-2">
                          <span className="text-red-600 font-bold">❌</span>
                          <span><strong>Lose access</strong> to your Affiliate Dashboard</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-red-600 font-bold">❌</span>
                          <span><strong>Lose all pending affiliate commissions</strong> (may not be paid out)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-red-600 font-bold">❌</span>
                          <span><strong>Have all your affiliate links deactivated</strong></span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-red-600 font-bold">❌</span>
                          <span><strong>Lose your affiliate performance history</strong></span>
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
                      💡 Want to be BOTH {user.role === 'affiliate' ? 'an Affiliate and a Vendor' : 'Support and a Vendor'}?
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

          {/* Store Information */}
          <div>
            <h2 className="text-xl font-bold mb-4">Store Information</h2>

            <div className="space-y-4">
              <Input
                label="Store Name"
                type="text"
                required
                placeholder="Enter your store name"
                value={formData.storeName}
                onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                helperText="This will be displayed to customers"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Store Description
                </label>
                <textarea
                  required
                  rows="4"
                  placeholder="Describe what you sell and what makes your store unique"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input w-full"
                />
              </div>
            </div>
          </div>

          {/* KYC Information */}
          <div>
            <h2 className="text-xl font-bold mb-4">Business Information</h2>

            <div className="space-y-4">
              <Input
                label="Business Name"
                type="text"
                required
                placeholder="Enter your business or individual name"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                helperText="Your legal business name or full name"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Type
                </label>
                <select
                  value={formData.businessType}
                  onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                  className="input w-full"
                >
                  <option value="sole_proprietorship">Individual / Sole Proprietor</option>
                  <option value="partnership">Partnership</option>
                  <option value="private_limited">Private Limited Company</option>
                  <option value="public_limited">Public Limited Company</option>
                  <option value="llp">LLP (Limited Liability Partnership)</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <Input
                label="Tax ID / PAN Number"
                type="text"
                required
                placeholder="PAN / GST / Tax ID number"
                value={formData.taxId}
                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                helperText="Enter your PAN, GST, or Tax ID number"
              />
            </div>
          </div>

          {/* Bank Details */}
          <div>
            <h2 className="text-xl font-bold mb-4">Bank Details</h2>

            <div className="space-y-4">
              <Input
                label="Account Holder Name"
                type="text"
                required
                placeholder="Name as per bank account"
                value={formData.bankAccountName}
                onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })}
              />

              <Input
                label="Bank Name"
                type="text"
                required
                placeholder="Enter your bank name"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                helperText="e.g., State Bank of India, HDFC Bank, etc."
              />

              <Input
                label="Account Number"
                type="text"
                required
                placeholder="Enter your bank account number"
                value={formData.bankAccountNumber}
                onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
              />
            </div>
          </div>

          {/* Role Switch Confirmation */}
          {(user?.role === 'affiliate' || user?.role === 'support') && (
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
                  all associated data, dashboard access, and privileges if I proceed with this Vendor application.
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
              loading={onboardMutation.isPending}
              disabled={(user?.role === 'affiliate' || user?.role === 'support') && !confirmRoleSwitch}
            >
              Submit Application
            </Button>
          </div>

          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <p className="text-sm text-primary-800">
              <strong>Note:</strong> Your application will be reviewed by our team.
              You'll receive an email notification once your vendor account is approved.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BecomeVendor;
