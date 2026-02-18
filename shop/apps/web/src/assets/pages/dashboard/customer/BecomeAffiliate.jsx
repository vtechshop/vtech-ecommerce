// FILE: apps/web/src/pages/dashboard/customer/BecomeAffiliate.jsx
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Users,
  AlertTriangle,
  CheckCircle,
  Percent,
  Clock,
  BarChart3,
  CreditCard,
  Wallet,
  Building,
  Send,
  Link,
  TrendingUp,
  IndianRupee
} from 'lucide-react';
import api from '@/utils/api';
import { useToast } from '@/components/common/ToastContainer';

// Benefit card
const BenefitCard = ({ icon: Icon, title, description, highlight }) => (
  <div className={`p-4 rounded-xl border ${highlight ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
    <div className="flex items-start gap-3">
      <div className={`p-2 rounded-lg flex-shrink-0 ${highlight ? 'bg-green-100' : 'bg-white'}`}>
        <Icon className={`w-5 h-5 ${highlight ? 'text-green-600' : 'text-primary-600'}`} />
      </div>
      <div>
        <h4 className={`font-semibold ${highlight ? 'text-green-900' : 'text-gray-900'}`}>{title}</h4>
        <p className={`text-sm ${highlight ? 'text-green-700' : 'text-gray-600'}`}>{description}</p>
      </div>
    </div>
  </div>
);

// Payment Method Card
const PaymentMethodCard = ({ method, selected, onSelect, icon: Icon, title, description }) => (
  <button
    type="button"
    onClick={() => onSelect(method)}
    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
      selected
        ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-100'
        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
    }`}
  >
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${selected ? 'bg-primary-100' : 'bg-gray-100'}`}>
        <Icon className={`w-5 h-5 ${selected ? 'text-primary-600' : 'text-gray-600'}`} />
      </div>
      <div className="flex-1">
        <p className={`font-semibold ${selected ? 'text-primary-900' : 'text-gray-900'}`}>{title}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
        selected ? 'border-primary-600 bg-primary-600' : 'border-gray-300'
      }`}>
        {selected && <CheckCircle className="w-4 h-4 text-white" />}
      </div>
    </div>
  </button>
);

const BecomeAffiliate = () => {
  const navigate = useNavigate();
  const toast = useToast();
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
      toast.success('Affiliate application submitted successfully!');
      setTimeout(() => navigate('/affiliate-dashboard'), 800);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to submit application');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    applyMutation.mutate(formData);
  };

  const isFormValid = () => {
    if (formData.paymentMethod === 'bank') {
      return formData.accountName.trim() && formData.accountNumber.trim() && formData.ifsc.trim();
    } else if (formData.paymentMethod === 'upi') {
      return formData.upiId.trim();
    } else if (formData.paymentMethod === 'paypal') {
      return formData.paypalEmail.trim();
    }
    return false;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 via-green-700 to-emerald-700 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-white/20 rounded-xl">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Become an Affiliate</h1>
              <p className="text-green-100">Earn commissions by promoting our products</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
              <Percent className="w-4 h-4" />
              <span className="text-sm font-medium">Up to 10% commission</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">30-day cookie</span>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Program Benefits</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <BenefitCard
            icon={Percent}
            title="High Commissions"
            description="Earn up to 10% on every sale you refer"
            highlight
          />
          <BenefitCard
            icon={Clock}
            title="30-Day Cookie"
            description="Credit for purchases within 30 days"
          />
          <BenefitCard
            icon={BarChart3}
            title="Real-time Dashboard"
            description="Track clicks, conversions & earnings"
          />
          <BenefitCard
            icon={IndianRupee}
            title="Monthly Payouts"
            description="Get paid every month, multiple options"
          />
        </div>
      </div>

      {/* Role Warning */}
      {(user?.role === 'vendor' || user?.role === 'support') && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-amber-900 mb-2">Role Switching Warning</h3>
              <p className="text-amber-800 text-sm mb-3">
                You are currently <strong>{user.role === 'vendor' ? 'a Vendor' : 'a Support Agent'}</strong>.
                Becoming an Affiliate will replace your current role.
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
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CreditCard className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Payment Information</h2>
              <p className="text-sm text-gray-500">How you'd like to receive your earnings</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6">
          {/* Payment Method Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Select Payment Method
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <PaymentMethodCard
                method="bank"
                selected={formData.paymentMethod === 'bank'}
                onSelect={(m) => setFormData({ ...formData, paymentMethod: m })}
                icon={Building}
                title="Bank Transfer"
                description="Direct to your bank"
              />
              <PaymentMethodCard
                method="upi"
                selected={formData.paymentMethod === 'upi'}
                onSelect={(m) => setFormData({ ...formData, paymentMethod: m })}
                icon={Wallet}
                title="UPI"
                description="GPay, PhonePe, etc."
              />
              <PaymentMethodCard
                method="paypal"
                selected={formData.paymentMethod === 'paypal'}
                onSelect={(m) => setFormData({ ...formData, paymentMethod: m })}
                icon={CreditCard}
                title="PayPal"
                description="International payments"
              />
            </div>
          </div>

          {/* Bank Transfer Fields */}
          {formData.paymentMethod === 'bank' && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-xl">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Account Holder Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Name as per bank account"
                  value={formData.accountName}
                  onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
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
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    IFSC Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., HDFC0001234"
                    value={formData.ifsc}
                    onChange={(e) => setFormData({ ...formData, ifsc: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* UPI Fields */}
          {formData.paymentMethod === 'upi' && (
            <div className="p-4 bg-gray-50 rounded-xl">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                UPI ID *
              </label>
              <input
                type="text"
                required
                placeholder="yourname@upi"
                value={formData.upiId}
                onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <p className="text-xs text-gray-500 mt-1.5">e.g., yourname@paytm, yourname@gpay</p>
            </div>
          )}

          {/* PayPal Fields */}
          {formData.paymentMethod === 'paypal' && (
            <div className="p-4 bg-gray-50 rounded-xl">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                PayPal Email *
              </label>
              <input
                type="email"
                required
                placeholder="your@email.com"
                value={formData.paypalEmail}
                onChange={(e) => setFormData({ ...formData, paypalEmail: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <p className="text-xs text-gray-500 mt-1.5">Email associated with your PayPal account</p>
            </div>
          )}

          {/* Role Switch Confirmation */}
          {(user?.role === 'vendor' || user?.role === 'support') && (
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

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2.5 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!isFormValid() || applyMutation.isPending || ((user?.role === 'vendor' || user?.role === 'support') && !confirmRoleSwitch)}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {applyMutation.isPending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <Send className="w-4 h-4" />
              )}
              Submit Application
            </button>
          </div>
        </form>

        {/* Note */}
        <div className="p-4 bg-green-50 border-t border-green-100">
          <p className="text-sm text-green-800">
            <strong>Note:</strong> Your application will be reviewed by our team.
            After approval, you'll get your unique affiliate code and tracking links.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BecomeAffiliate;
