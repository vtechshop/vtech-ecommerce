// FILE: apps/web/src/pages/dashboard/customer/BecomeVendor.jsx
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Store,
  Building,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  User,
  FileText,
  Shield,
  TrendingUp,
  Package,
  Users,
  Percent,
  Clock,
  Send
} from 'lucide-react';
import api from '@/utils/api';
import { setUser } from '@/store/slices/authSlice';
import { useToast } from '@/components/common/ToastContainer';

// Step indicator component
const StepIndicator = ({ steps, currentStep }) => (
  <div className="flex items-center justify-center gap-2 mb-8">
    {steps.map((step, index) => (
      <div key={step.id} className="flex items-center">
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
          index < currentStep
            ? 'bg-green-100 text-green-700'
            : index === currentStep
            ? 'bg-primary-600 text-white'
            : 'bg-gray-100 text-gray-500'
        }`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
            index < currentStep
              ? 'bg-green-500 text-white'
              : index === currentStep
              ? 'bg-white text-primary-600'
              : 'bg-gray-300 text-gray-600'
          }`}>
            {index < currentStep ? <CheckCircle className="w-4 h-4" /> : index + 1}
          </div>
          <span className="hidden sm:inline text-sm font-medium">{step.label}</span>
        </div>
        {index < steps.length - 1 && (
          <ChevronRight className="w-5 h-5 text-gray-300 mx-1" />
        )}
      </div>
    ))}
  </div>
);

// Benefit card
const BenefitCard = ({ icon: Icon, title, description }) => (
  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
    <div className="p-2 bg-primary-100 rounded-lg flex-shrink-0">
      <Icon className="w-5 h-5 text-primary-600" />
    </div>
    <div>
      <h4 className="font-semibold text-gray-900">{title}</h4>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  </div>
);

const BecomeVendor = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { user } = useSelector((state) => state.auth);
  const [currentStep, setCurrentStep] = useState(0);
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
    ifscCode: '',
  });

  const steps = [
    { id: 'store', label: 'Store Info' },
    { id: 'business', label: 'Business' },
    { id: 'bank', label: 'Bank Details' },
  ];

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
          ifscCode: data.ifscCode,
        },
      });
      return response.data;
    },
    onSuccess: async () => {
      try {
        const meResponse = await api.get('/auth/me');
        dispatch(setUser(meResponse.data.data));
        queryClient.invalidateQueries({ queryKey: ['notification-counts'] });
        queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });
        toast.success('Vendor application submitted successfully!');
      } catch (error) {
        toast.error('Application submitted but failed to update session. Please refresh.');
      }
      setTimeout(() => navigate('/vendor-dashboard/kyc'), 1500);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to submit application');
    },
  });

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onboardMutation.mutate(formData);
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return formData.storeName.trim() && formData.description.trim();
      case 1:
        return formData.businessName.trim() && formData.taxId.trim();
      case 2:
        return formData.bankAccountName.trim() && formData.bankName.trim() && formData.bankAccountNumber.trim();
      default:
        return false;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 via-primary-700 to-blue-700 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-white/20 rounded-xl">
              <Store className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Become a Vendor</h1>
              <p className="text-primary-100">Start selling your products on our platform</p>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Why sell with us?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <BenefitCard
            icon={Users}
            title="Reach Thousands"
            description="Access our large customer base"
          />
          <BenefitCard
            icon={TrendingUp}
            title="Grow Your Business"
            description="Powerful analytics & insights"
          />
          <BenefitCard
            icon={Percent}
            title="Low Commissions"
            description="Competitive marketplace rates"
          />
          <BenefitCard
            icon={Clock}
            title="Quick Payouts"
            description="Weekly settlements to your bank"
          />
        </div>
      </div>

      {/* Role Warning */}
      {(user?.role === 'affiliate' || user?.role === 'support') && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-amber-900 mb-2">Role Switching Warning</h3>
              <p className="text-amber-800 text-sm mb-3">
                You are currently <strong>{user.role === 'affiliate' ? 'an Affiliate' : 'a Support Agent'}</strong>.
                Becoming a Vendor will replace your current role.
              </p>
              <div className="bg-white border border-amber-200 rounded-lg p-3 text-sm">
                <p className="text-amber-900">
                  <strong>Want both roles?</strong> Contact support at{' '}
                  <strong>vtechshop.customercare@gmail.com</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50">
          <StepIndicator steps={steps} currentStep={currentStep} />
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6">
          {/* Step 1: Store Information */}
          {currentStep === 0 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Store className="w-5 h-5 text-primary-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Store Information</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Store Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter your store name"
                  value={formData.storeName}
                  onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">This will be displayed to customers</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Store Description *
                </label>
                <textarea
                  required
                  rows="4"
                  placeholder="Describe what you sell and what makes your store unique"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          )}

          {/* Step 2: Business Information */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Building className="w-5 h-5 text-primary-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Business Information</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Business / Legal Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter your business or individual name"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Business Type
                </label>
                <select
                  value={formData.businessType}
                  onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="sole_proprietorship">Individual / Sole Proprietor</option>
                  <option value="partnership">Partnership</option>
                  <option value="private_limited">Private Limited Company</option>
                  <option value="public_limited">Public Limited Company</option>
                  <option value="llp">LLP (Limited Liability Partnership)</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Tax ID / PAN Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="PAN / GST / Tax ID number"
                  value={formData.taxId}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          )}

          {/* Step 3: Bank Details */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <CreditCard className="w-5 h-5 text-primary-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Bank Details</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Account Holder Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Name as per bank account"
                    value={formData.bankAccountName}
                    onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Bank Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., HDFC Bank"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Account Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter account number"
                    value={formData.bankAccountNumber}
                    onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., HDFC0001234"
                    value={formData.ifscCode}
                    onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              {/* Role Switch Confirmation */}
              {(user?.role === 'affiliate' || user?.role === 'support') && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmRoleSwitch}
                      onChange={(e) => setConfirmRoleSwitch(e.target.checked)}
                      className="mt-1 w-5 h-5 text-red-600 border-red-300 rounded focus:ring-red-500"
                    />
                    <span className="text-sm text-red-800">
                      I understand that I will <strong>lose my {user.role} role</strong> and accept the consequences.
                    </span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={currentStep === 0 ? () => navigate('/dashboard') : handleBack}
              className="px-4 py-2.5 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {currentStep === 0 ? 'Cancel' : 'Back'}
            </button>

            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!isStepValid()}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!isStepValid() || onboardMutation.isPending || ((user?.role === 'affiliate' || user?.role === 'support') && !confirmRoleSwitch)}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {onboardMutation.isPending ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Submit Application
              </button>
            )}
          </div>
        </form>

        {/* Note */}
        <div className="p-4 bg-blue-50 border-t border-blue-100">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Your application will be reviewed by our team.
            You'll receive an email notification once approved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BecomeVendor;
