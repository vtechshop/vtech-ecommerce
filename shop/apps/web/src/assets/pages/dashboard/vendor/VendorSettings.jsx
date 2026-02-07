// FILE: apps/web/src/pages/dashboard/vendor/VendorSettings.jsx
import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Settings, Store, CreditCard, FileText, DollarSign, Shield, Save, Upload,
  Volume2, VolumeX, Bell, CheckCircle, AlertCircle, Clock, ChevronRight,
  User, Building, MapPin, Phone, Mail, Globe, Eye, EyeOff, Lock, Smartphone,
  Percent, Wallet, TrendingUp, Info, ExternalLink, Copy, Check, AlertTriangle,
  BadgeCheck, XCircle, HelpCircle
} from 'lucide-react';
import api from '../../../utils/api';
import { useToast } from '../../../components/common/ToastContainer';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Modal from '../../../components/common/Modal';
import Spinner from '../../../components/common/Spinner';
import { getSoundEnabled, toggleSound, playClick } from '@/utils/sounds';
import { formatCurrency } from '@/utils/format';

// Profile completion calculator
const calculateProfileCompletion = (vendorData) => {
  if (!vendorData) return { percentage: 0, items: [] };

  const checks = [
    { key: 'storeName', label: 'Store Name', completed: !!vendorData.storeName },
    { key: 'description', label: 'Store Description', completed: !!vendorData.description },
    { key: 'logo', label: 'Store Logo', completed: !!vendorData.logo },
    { key: 'bankAccount', label: 'Bank Account', completed: !!(vendorData.bank?.accountNumber && vendorData.bank?.ifscCode) },
    { key: 'panNumber', label: 'PAN Number', completed: !!vendorData.panNumber },
    { key: 'returnPolicy', label: 'Return Policy', completed: !!vendorData.returnPolicy },
    { key: 'shippingPolicy', label: 'Shipping Policy', completed: !!vendorData.shippingPolicy },
  ];

  const completed = checks.filter(c => c.completed).length;
  return {
    percentage: Math.round((completed / checks.length) * 100),
    items: checks,
    completed,
    total: checks.length
  };
};

// Account Status Badge
const AccountStatusBadge = ({ status }) => {
  const badges = {
    active: { bg: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle, label: 'Active' },
    pending: { bg: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock, label: 'Pending Approval' },
    suspended: { bg: 'bg-red-100 text-red-800 border-red-200', icon: XCircle, label: 'Suspended' },
    under_review: { bg: 'bg-orange-100 text-orange-800 border-orange-200', icon: AlertCircle, label: 'Under Review' },
  };
  const badge = badges[status] || badges.pending;
  const Icon = badge.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-sm font-semibold rounded-full border ${badge.bg}`}>
      <Icon className="w-4 h-4" />
      {badge.label}
    </span>
  );
};

const VendorSettings = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('profile');
  const [uploading, setUploading] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  // Modal states
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });
  const [showLoginActivityModal, setShowLoginActivityModal] = useState(false);

  // Sound preferences
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    setSoundEnabled(getSoundEnabled());
  }, []);

  const handleSoundToggle = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    toggleSound(newValue);
    if (newValue) {
      setTimeout(() => playClick(), 50);
    }
    toast.success(newValue ? 'Sound notifications enabled' : 'Sound notifications disabled');
  };

  // Fetch vendor settings
  const { data: vendorData, isLoading } = useQuery({
    queryKey: ['vendor-settings'],
    queryFn: async () => {
      const response = await api.get('/vendors/settings');
      return response.data.data;
    },
  });

  // Fetch KYC status
  const { data: kycData } = useQuery({
    queryKey: ['vendor-kyc'],
    queryFn: async () => {
      const response = await api.get('/vendors/kyc');
      return response.data.data;
    },
  });

  // Fetch login activities
  const { data: loginActivities, isLoading: activitiesLoading } = useQuery({
    queryKey: ['login-activities'],
    queryFn: async () => {
      const response = await api.get('/user/login-activity?limit=20');
      return response.data.data;
    },
    enabled: showLoginActivityModal,
  });

  // Profile completion
  const profileCompletion = useMemo(() => calculateProfileCompletion(vendorData), [vendorData]);

  // Store Profile State
  const [profileData, setProfileData] = useState({
    storeName: '',
    description: '',
    logo: '',
  });

  // Bank Details State
  const [bankData, setBankData] = useState({
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    swiftCode: '',
    panNumber: '',
  });

  // Policies State
  const [policiesData, setPoliciesData] = useState({
    returnPolicy: '',
    shippingPolicy: '',
  });

  // Payout Preferences State
  const [payoutData, setPayoutData] = useState({
    defaultCommissionPercentage: 15,
    minimumPayout: 1000,
  });

  // Update state when data is loaded
  useEffect(() => {
    if (vendorData) {
      setProfileData({
        storeName: vendorData.storeName || '',
        description: vendorData.description || '',
        logo: vendorData.logo || '',
      });
      setBankData({
        accountHolderName: vendorData.bank?.accountHolderName || '',
        bankName: vendorData.bank?.bankName || '',
        accountNumber: vendorData.bank?.accountNumber || '',
        ifscCode: vendorData.bank?.ifscCode || '',
        swiftCode: vendorData.bank?.swiftCode || '',
        panNumber: vendorData.panNumber || '',
      });
      setPoliciesData({
        returnPolicy: vendorData.returnPolicy || '',
        shippingPolicy: vendorData.shippingPolicy || '',
      });
      setPayoutData({
        defaultCommissionPercentage: vendorData.defaultCommissionPercentage || 15,
        minimumPayout: 1000,
      });
    }
  }, [vendorData]);

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.put('/vendors/settings/profile', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-settings'] });
      toast.success('Store profile updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update profile');
    },
  });

  const updateBankMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.put('/vendors/settings/bank', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-settings'] });
      toast.success('Bank details updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update bank details');
    },
  });

  const updatePoliciesMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.put('/vendors/settings/policies', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-settings'] });
      toast.success('Policies updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update policies');
    },
  });

  const updatePayoutMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.put('/vendors/settings/payout', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-settings'] });
      toast.success('Payout preferences updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update payout preferences');
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.put('/user/password', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Password changed successfully');
      setShowChangePasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to change password');
    },
  });

  // Handle logo upload
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Logo size must be less than 10MB');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPG, PNG, GIF, WebP, AVIF, and SVG files are allowed');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'vendor-logos');

      const uploadResponse = await api.post('/upload/single', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setProfileData({ ...profileData, logo: uploadResponse.data.data.url });
      toast.success('Logo uploaded successfully');
    } catch (error) {
      console.error('Logo upload error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  // Handle form submissions
  const handleProfileSubmit = (e) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  const handleBankSubmit = (e) => {
    e.preventDefault();
    updateBankMutation.mutate(bankData);
  };

  const handlePoliciesSubmit = (e) => {
    e.preventDefault();
    updatePoliciesMutation.mutate(policiesData);
  };

  const handlePayoutSubmit = (e) => {
    e.preventDefault();
    updatePayoutMutation.mutate(payoutData);
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };

  // Copy to clipboard
  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast.success('Copied to clipboard');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Store Profile', icon: Store, shortLabel: 'Profile' },
    { id: 'bank', label: 'Bank Account', icon: CreditCard, shortLabel: 'Bank' },
    { id: 'policies', label: 'Policies', icon: FileText, shortLabel: 'Policies' },
    { id: 'payout', label: 'Payout', icon: DollarSign, shortLabel: 'Payout' },
    { id: 'security', label: 'Security', icon: Shield, shortLabel: 'Security' },
  ];

  const kycStatus = kycData?.status || 'pending';

  return (
    <div className="px-2 sm:px-0 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
            Vendor Settings
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage your store settings and preferences</p>
        </div>
        <Link
          to="/vendor-dashboard/kyc"
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          <BadgeCheck className="w-4 h-4" />
          KYC Verification
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Account Health Card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 sm:p-5 mb-4 sm:mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8">
          {/* Store Info */}
          <div className="flex items-center gap-4 flex-1">
            {profileData.logo ? (
              <img src={profileData.logo} alt="Store" className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-contain border border-gray-200" />
            ) : (
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-blue-100 flex items-center justify-center border border-blue-200">
                <Store className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600" />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="font-semibold text-lg text-gray-900 truncate">{vendorData?.storeName || 'Your Store'}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <AccountStatusBadge status={kycStatus === 'approved' ? 'active' : kycStatus} />
                {vendorData?.slug && (
                  <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded">
                    /{vendorData.slug}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Profile Completion */}
          <div className="flex-shrink-0 w-full lg:w-auto">
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Profile Completion</span>
                <span className={`text-sm font-bold ${profileCompletion.percentage === 100 ? 'text-green-600' : 'text-blue-600'}`}>
                  {profileCompletion.percentage}%
                </span>
              </div>
              <div className="w-full lg:w-48 bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${profileCompletion.percentage === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                  style={{ width: `${profileCompletion.percentage}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1.5">
                {profileCompletion.completed}/{profileCompletion.total} items completed
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="hidden xl:flex items-center gap-4">
            <div className="text-center px-4 border-l border-gray-200">
              <p className="text-xs text-gray-500">Commission</p>
              <p className="text-lg font-bold text-gray-900">{vendorData?.defaultCommissionPercentage || 15}%</p>
            </div>
            <div className="text-center px-4 border-l border-gray-200">
              <p className="text-xs text-gray-500">Total Sales</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(vendorData?.totalEarnings || 0)}</p>
            </div>
          </div>
        </div>

        {/* Incomplete Profile Warning */}
        {profileCompletion.percentage < 100 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-start gap-3 bg-amber-50 rounded-lg p-3 border border-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-800">Complete your profile to receive payouts</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {profileCompletion.items.filter(i => !i.completed).slice(0, 3).map(item => (
                    <span key={item.key} className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                      {item.label}
                    </span>
                  ))}
                  {profileCompletion.items.filter(i => !i.completed).length > 3 && (
                    <span className="text-xs text-amber-600">
                      +{profileCompletion.items.filter(i => !i.completed).length - 3} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs - Scrollable on Mobile */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-4 sm:mb-6 overflow-hidden">
        <div className="overflow-x-auto scrollbar-hide">
          <nav className="flex border-b border-gray-200 min-w-max">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 font-medium text-sm whitespace-nowrap transition-colors border-b-2 -mb-px ${
                    isActive
                      ? 'border-blue-600 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Store Profile Tab */}
        {activeTab === 'profile' && (
          <form onSubmit={handleProfileSubmit}>
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Store className="w-5 h-5 text-blue-600" />
                Store Profile
              </h2>
              <p className="text-sm text-gray-600 mt-1">Update your store information and branding</p>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
              {/* Logo Upload */}
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="flex-shrink-0">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Store Logo</label>
                  <div className="flex items-center gap-4">
                    {profileData.logo ? (
                      <img
                        src={profileData.logo}
                        alt="Store Logo"
                        className="w-20 h-20 rounded-lg object-contain border border-gray-200 bg-white"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-blue-100 flex items-center justify-center border border-blue-200">
                        <Store className="w-8 h-8 text-blue-400" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                    <Upload className="w-4 h-4" />
                    {uploading ? 'Uploading...' : 'Upload Logo'}
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/avif,image/svg+xml"
                      onChange={handleLogoUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-2">JPG, PNG, GIF, WebP, AVIF, or SVG - max 10MB</p>
                  {profileData.logo && (
                    <button
                      type="button"
                      onClick={() => setProfileData({ ...profileData, logo: '' })}
                      className="text-xs text-red-600 hover:text-red-700 mt-1"
                    >
                      Remove logo
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Store Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={profileData.storeName}
                    onChange={(e) => setProfileData({ ...profileData, storeName: e.target.value })}
                    required
                    placeholder="Enter your store name"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Store URL</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center bg-gray-100 border border-gray-300 rounded-lg px-3 py-2.5 text-sm">
                      <span className="text-gray-500">vtech.com/store/</span>
                      <span className="text-gray-900 font-medium">{vendorData?.slug || 'your-store'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(`${window.location.origin}/store/${vendorData?.slug}`, 'url')}
                      className="p-2.5 text-gray-500 hover:text-blue-600 border border-gray-300 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      {copiedField === 'url' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Store Description</label>
                <textarea
                  value={profileData.description}
                  onChange={(e) => setProfileData({ ...profileData, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="Describe your store and what you sell..."
                />
                <p className="text-xs text-gray-500 mt-1">This will be displayed on your store page</p>
              </div>
            </div>

            <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <Button type="submit" loading={updateProfileMutation.isPending} className="inline-flex items-center gap-2">
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </div>
          </form>
        )}

        {/* Bank Account Tab */}
        {activeTab === 'bank' && (
          <form onSubmit={handleBankSubmit}>
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                Bank Account Details
              </h2>
              <p className="text-sm text-gray-600 mt-1">Add your bank account information to receive payouts</p>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
              {/* Security Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Your information is secure</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Bank details are encrypted and stored securely. We never share this information with third parties.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Account Holder Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={bankData.accountHolderName}
                    onChange={(e) => setBankData({ ...bankData, accountHolderName: e.target.value })}
                    required
                    placeholder="Full name as per bank account"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Bank Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={bankData.bankName}
                    onChange={(e) => setBankData({ ...bankData, bankName: e.target.value })}
                    required
                    placeholder="e.g., State Bank of India"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Account Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={bankData.accountNumber}
                    onChange={(e) => setBankData({ ...bankData, accountNumber: e.target.value })}
                    required
                    placeholder="Enter account number"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    IFSC Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={bankData.ifscCode}
                    onChange={(e) => setBankData({ ...bankData, ifscCode: e.target.value.toUpperCase() })}
                    placeholder="e.g., SBIN0001234"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    SWIFT Code <span className="text-gray-400 text-xs">(International)</span>
                  </label>
                  <input
                    type="text"
                    value={bankData.swiftCode}
                    onChange={(e) => setBankData({ ...bankData, swiftCode: e.target.value.toUpperCase() })}
                    placeholder="e.g., SBININBB123"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    PAN Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={bankData.panNumber}
                    onChange={(e) => setBankData({ ...bankData, panNumber: e.target.value.toUpperCase() })}
                    required
                    placeholder="e.g., ABCDE1234F"
                    maxLength={10}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono uppercase"
                  />
                  <p className="text-xs text-gray-500 mt-1">Required for TDS compliance</p>
                </div>
              </div>
            </div>

            <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <Button type="submit" loading={updateBankMutation.isPending} className="inline-flex items-center gap-2">
                <Save className="w-4 h-4" />
                Save Bank Details
              </Button>
            </div>
          </form>
        )}

        {/* Policies Tab */}
        {activeTab === 'policies' && (
          <form onSubmit={handlePoliciesSubmit}>
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Store Policies
              </h2>
              <p className="text-sm text-gray-600 mt-1">Define your return and shipping policies for customers</p>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Return Policy</label>
                <textarea
                  value={policiesData.returnPolicy}
                  onChange={(e) => setPoliciesData({ ...policiesData, returnPolicy: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="E.g., We accept returns within 7 days of delivery. Products must be unused and in original packaging..."
                />
                <p className="text-xs text-gray-500 mt-1">Clearly explain your return conditions and timeframes</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Shipping Policy</label>
                <textarea
                  value={policiesData.shippingPolicy}
                  onChange={(e) => setPoliciesData({ ...policiesData, shippingPolicy: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="E.g., We ship within 2-3 business days. Standard delivery takes 5-7 days. Free shipping on orders above ₹500..."
                />
                <p className="text-xs text-gray-500 mt-1">Include shipping timeframes, costs, and any special conditions</p>
              </div>

              {/* Policy Tips */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2 mb-3">
                  <HelpCircle className="w-4 h-4 text-gray-500" />
                  Tips for writing good policies
                </h4>
                <ul className="text-xs text-gray-600 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                    Be clear about return timeframes and conditions
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                    Specify who pays for return shipping
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                    Include estimated delivery times for different regions
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                    Mention any items that cannot be returned
                  </li>
                </ul>
              </div>
            </div>

            <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <Button type="submit" loading={updatePoliciesMutation.isPending} className="inline-flex items-center gap-2">
                <Save className="w-4 h-4" />
                Save Policies
              </Button>
            </div>
          </form>
        )}

        {/* Payout Preferences Tab */}
        {activeTab === 'payout' && (
          <div>
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                Payout Preferences
              </h2>
              <p className="text-sm text-gray-600 mt-1">View your commission rates and payout information</p>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
              {/* Earnings Summary */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs sm:text-sm text-green-700">Total Earnings</span>
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-green-700">
                    {formatCurrency(vendorData?.totalEarnings || 0)}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-yellow-50 to-amber-100 rounded-lg p-4 border border-yellow-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs sm:text-sm text-yellow-700">Pending</span>
                    <Clock className="w-4 h-4 text-yellow-600" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-yellow-700">
                    {formatCurrency(vendorData?.pendingEarnings || 0)}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs sm:text-sm text-blue-700">Commission Rate</span>
                    <Percent className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-blue-700">
                    {vendorData?.defaultCommissionPercentage || 15}%
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-violet-100 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs sm:text-sm text-purple-700">You Keep</span>
                    <Wallet className="w-4 h-4 text-purple-600" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-purple-700">
                    {100 - (vendorData?.defaultCommissionPercentage || 15)}%
                  </p>
                </div>
              </div>

              {/* Commission Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">How commissions work</p>
                  <p className="text-sm text-blue-700 mt-1">
                    The platform charges {vendorData?.defaultCommissionPercentage || 15}% commission on each sale.
                    You receive {100 - (vendorData?.defaultCommissionPercentage || 15)}% of the sale amount after deducting the commission.
                  </p>
                  <div className="mt-3 bg-white rounded-lg p-3 border border-blue-200">
                    <p className="text-xs text-blue-800 font-medium mb-1">Example Calculation:</p>
                    <p className="text-sm text-blue-900">
                      Sale: ₹1,000 → Commission: ₹{(vendorData?.defaultCommissionPercentage || 15) * 10} ({vendorData?.defaultCommissionPercentage || 15}%) →
                      <span className="font-bold text-green-700"> You earn: ₹{1000 - (vendorData?.defaultCommissionPercentage || 15) * 10}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact for Rate Change */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Need a different commission rate?</p>
                  <p className="text-xs text-gray-600 mt-0.5">Contact support to negotiate custom rates for high-volume sellers</p>
                </div>
                <Link
                  to="/vendor-dashboard/support"
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  Contact Support
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div>
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                Security Settings
              </h2>
              <p className="text-sm text-gray-600 mt-1">Manage your account security and authentication settings</p>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              {/* Change Password */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-lg border border-gray-200 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Change Password</p>
                    <p className="text-sm text-gray-600">Update your password regularly for better security</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowChangePasswordModal(true)}>
                  Change Password
                </Button>
              </div>

              {/* Login Activity */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-lg border border-gray-200 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Login Activity</p>
                    <p className="text-sm text-gray-600">View recent login attempts and active sessions</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowLoginActivityModal(true)}>
                  View Activity
                </Button>
              </div>

              {/* Sound Notifications */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-lg border border-gray-200 gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${soundEnabled ? 'bg-purple-100' : 'bg-gray-100'}`}>
                    {soundEnabled ? (
                      <Volume2 className="w-5 h-5 text-purple-600" />
                    ) : (
                      <VolumeX className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Sound Notifications</p>
                    <p className="text-sm text-gray-600">Play sounds for new orders and other actions</p>
                  </div>
                </div>
                <button
                  onClick={handleSoundToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    soundEnabled ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      soundEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* KYC Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-lg border border-gray-200 gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    kycStatus === 'approved' ? 'bg-green-100' : kycStatus === 'pending' ? 'bg-yellow-100' : 'bg-red-100'
                  }`}>
                    <BadgeCheck className={`w-5 h-5 ${
                      kycStatus === 'approved' ? 'text-green-600' : kycStatus === 'pending' ? 'text-yellow-600' : 'text-red-600'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">KYC Verification</p>
                    <p className="text-sm text-gray-600">
                      {kycStatus === 'approved' ? 'Your account is verified' :
                       kycStatus === 'pending' ? 'Verification in progress' :
                       'Complete verification to receive orders'}
                    </p>
                  </div>
                </div>
                <Link
                  to="/vendor-dashboard/kyc"
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  {kycStatus === 'approved' ? 'View Details' : 'Complete KYC'}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Change Password Modal */}
      <Modal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        title="Change Password"
        size="md"
      >
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Password</label>
            <div className="relative">
              <input
                type={showPassword.current ? 'text' : 'password'}
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                required
                placeholder="Enter current password"
                className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
            <div className="relative">
              <input
                type={showPassword.new ? 'text' : 'password'}
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                required
                placeholder="Enter new password (min 6 characters)"
                className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
            <div className="relative">
              <input
                type={showPassword.confirm ? 'text' : 'password'}
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                required
                placeholder="Confirm new password"
                className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowChangePasswordModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={changePasswordMutation.isPending}>
              Change Password
            </Button>
          </div>
        </form>
      </Modal>

      {/* Login Activity Modal */}
      <Modal
        isOpen={showLoginActivityModal}
        onClose={() => setShowLoginActivityModal(false)}
        title="Login Activity"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">View your recent login attempts and active sessions</p>

          {activitiesLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : loginActivities && loginActivities.length > 0 ? (
            <>
              {/* Mobile Card View */}
              <div className="block sm:hidden space-y-3">
                {loginActivities.map((activity) => (
                  <div key={activity._id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        activity.type === 'login' ? 'bg-green-100 text-green-800' :
                        activity.type === 'failed_login' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {activity.type.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        activity.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {activity.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900">{activity.browser} / {activity.os}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {activity.ipAddress || 'Unknown IP'} • {new Date(activity.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-blue-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Device</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loginActivities.map((activity) => (
                      <tr key={activity._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            activity.type === 'login' ? 'bg-green-100 text-green-800' :
                            activity.type === 'failed_login' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {activity.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            activity.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {activity.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">{activity.browser}</div>
                          <div className="text-xs text-gray-500">{activity.os}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-mono">
                          {activity.ipAddress || 'Unknown'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {new Date(activity.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Smartphone className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No login activity found</p>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button onClick={() => setShowLoginActivityModal(false)}>Close</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default VendorSettings;
