import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Store, CreditCard, FileText, DollarSign, Shield, Save, Upload, Volume2, VolumeX, Bell } from 'lucide-react';
import api from '../../../utils/api';
import { useToast } from '../../../components/common/ToastContainer';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Modal from '../../../components/common/Modal';
import Spinner from '../../../components/common/Spinner';
import { getSoundEnabled, toggleSound, playClick } from '@/utils/sounds';

const VendorSettings = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('profile');
  const [uploading, setUploading] = useState(false);

  // Modal states
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
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

  // Fetch login activities
  const { data: loginActivities, isLoading: activitiesLoading } = useQuery({
    queryKey: ['login-activities'],
    queryFn: async () => {
      const response = await api.get('/user/login-activity?limit=20');
      return response.data.data;
    },
    enabled: showLoginActivityModal,
  });

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

  // Update Profile Mutation
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

  // Update Bank Details Mutation
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

  // Update Policies Mutation
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

  // Update Payout Preferences Mutation
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

  // Handle logo upload
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Logo size must be less than 10MB');
      return;
    }

    // Validate file type
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
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || 'Failed to upload logo';
      toast.error(errorMessage);
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

  // Change Password Mutation
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


  // Handle password change
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

  // Security button handlers
  const handleViewActivity = () => {
    setShowLoginActivityModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Store Profile', icon: Store },
    { id: 'bank', label: 'Bank Account', icon: CreditCard },
    { id: 'policies', label: 'Policies', icon: FileText },
    { id: 'payout', label: 'Payout Preferences', icon: DollarSign },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-600" />
          Vendor Settings
        </h1>
        <p className="text-gray-700 mt-1">Manage your store settings and preferences</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Store Profile Tab */}
        {activeTab === 'profile' && (
          <form onSubmit={handleProfileSubmit} className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Store Profile</h2>
              <p className="text-sm text-gray-700 mb-6">
                Update your store information and branding
              </p>
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Store Logo</label>
              <div className="flex items-center gap-4">
                {profileData.logo ? (
                  <img
                    src={profileData.logo}
                    alt="Store Logo"
                    className="w-20 h-20 rounded-lg object-contain border border-gray-200"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-blue-100 flex items-center justify-center border border-gray-200">
                    <Store className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <div>
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-blue-100">
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
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG, GIF, WebP, AVIF, or SVG - max 10MB</p>
                </div>
              </div>
            </div>

            <Input
              label="Store Name"
              value={profileData.storeName}
              onChange={(e) => setProfileData({ ...profileData, storeName: e.target.value })}
              required
              placeholder="Enter your store name"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Store Description
              </label>
              <textarea
                value={profileData.description}
                onChange={(e) => setProfileData({ ...profileData, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Describe your store and what you sell..."
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                loading={updateProfileMutation.isPending}
                className="inline-flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </div>
          </form>
        )}

        {/* Bank Account Tab */}
        {activeTab === 'bank' && (
          <form onSubmit={handleBankSubmit} className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Bank Account Details</h2>
              <p className="text-sm text-gray-700 mb-6">
                Add your bank account information to receive payouts
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">Secure Information</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Your bank details are encrypted and stored securely. We never share this
                      information with third parties.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Input
              label="Account Holder Name"
              value={bankData.accountHolderName}
              onChange={(e) => setBankData({ ...bankData, accountHolderName: e.target.value })}
              required
              placeholder="Full name as per bank account"
            />

            <Input
              label="Bank Name"
              value={bankData.bankName}
              onChange={(e) => setBankData({ ...bankData, bankName: e.target.value })}
              required
              placeholder="e.g., State Bank of India"
            />

            <Input
              label="Account Number"
              value={bankData.accountNumber}
              onChange={(e) => setBankData({ ...bankData, accountNumber: e.target.value })}
              required
              type="text"
              placeholder="Enter account number"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="IFSC Code (India)"
                value={bankData.ifscCode}
                onChange={(e) => setBankData({ ...bankData, ifscCode: e.target.value.toUpperCase() })}
                placeholder="e.g., SBIN0001234"
              />

              <Input
                label="SWIFT Code (International)"
                value={bankData.swiftCode}
                onChange={(e) => setBankData({ ...bankData, swiftCode: e.target.value.toUpperCase() })}
                placeholder="e.g., SBININBB123"
              />
            </div>

            <div className="border-t border-gray-200 pt-4 mt-4">
              <h3 className="text-md font-semibold text-gray-900 mb-1">PAN Details (Required for Payouts)</h3>
              <p className="text-sm text-gray-500 mb-4">PAN is mandatory for TDS compliance. Your PAN will be verified by Razorpay before payouts are enabled.</p>
              <Input
                label="PAN Number"
                value={bankData.panNumber}
                onChange={(e) => setBankData({ ...bankData, panNumber: e.target.value.toUpperCase() })}
                required
                placeholder="e.g., ABCDE1234F"
                maxLength={10}
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                loading={updateBankMutation.isPending}
                className="inline-flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Bank Details
              </Button>
            </div>
          </form>
        )}

        {/* Policies Tab */}
        {activeTab === 'policies' && (
          <form onSubmit={handlePoliciesSubmit} className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Store Policies</h2>
              <p className="text-sm text-gray-700 mb-6">
                Define your return and shipping policies for customers
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Return Policy
              </label>
              <textarea
                value={policiesData.returnPolicy}
                onChange={(e) => setPoliciesData({ ...policiesData, returnPolicy: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="E.g., We accept returns within 7 days of delivery. Products must be unused and in original packaging..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Clearly explain your return conditions and timeframes
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shipping Policy
              </label>
              <textarea
                value={policiesData.shippingPolicy}
                onChange={(e) => setPoliciesData({ ...policiesData, shippingPolicy: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="E.g., We ship within 2-3 business days. Standard delivery takes 5-7 days. Free shipping on orders above ₹500..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Include shipping timeframes, costs, and any special conditions
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                loading={updatePoliciesMutation.isPending}
                className="inline-flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Policies
              </Button>
            </div>
          </form>
        )}

        {/* Payout Preferences Tab */}
        {activeTab === 'payout' && (
          <form onSubmit={handlePayoutSubmit} className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payout Preferences</h2>
              <p className="text-sm text-gray-700 mb-6">
                Manage your commission rates and payout settings
              </p>
            </div>

            {/* Earnings Summary */}
            <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg p-6 border border-primary-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm font-medium text-primary-900">Total Earnings</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    ₹{(vendorData?.totalEarnings || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-primary-900">Pending Earnings</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    ₹{(vendorData?.pendingEarnings || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-primary-900">Commission Rate</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    {vendorData?.defaultCommissionPercentage || 15}%
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Commission Information</p>
                  <p className="text-sm text-blue-700 mt-1">
                    The platform charges a commission on each sale. Your current commission rate is{' '}
                    {vendorData?.defaultCommissionPercentage || 15}%. Contact support to negotiate custom rates.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Commission Percentage
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={payoutData.defaultCommissionPercentage}
                  onChange={(e) =>
                    setPayoutData({ ...payoutData, defaultCommissionPercentage: parseFloat(e.target.value) })
                  }
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  disabled
                />
                <span className="text-sm text-gray-700">
                  (Contact admin to change commission rate)
                </span>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                loading={updatePayoutMutation.isPending}
                disabled
                className="inline-flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Preferences
              </Button>
            </div>
          </form>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Security Settings</h2>
              <p className="text-sm text-gray-700 mb-6">
                Manage your account security and authentication settings
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-100 rounded-lg border border-gray-200">
                <div>
                  <p className="font-medium text-gray-900">Change Password</p>
                  <p className="text-sm text-gray-700 mt-1">
                    Update your password regularly for better security
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowChangePasswordModal(true)}>
                  Change Password
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 bg-blue-100 rounded-lg border border-gray-200">
                <div>
                  <p className="font-medium text-gray-900">Login Activity</p>
                  <p className="text-sm text-gray-700 mt-1">
                    View recent login attempts and active sessions
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleViewActivity}>
                  View Activity
                </Button>
              </div>

            </div>

            {/* Sound Preferences */}
            <div className="border-t border-gray-200 pt-6 mt-6">
              <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-gray-700" />
                Notification Preferences
              </h3>
              <div className="flex items-center justify-between p-4 bg-blue-100 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  {soundEnabled ? (
                    <Volume2 className="w-5 h-5 text-blue-600" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-gray-400" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">Sound Notifications</p>
                    <p className="text-sm text-gray-700 mt-1">
                      Play sounds for new orders and other actions
                    </p>
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
          <Input
            label="Current Password"
            type="password"
            value={passwordData.currentPassword}
            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
            required
            placeholder="Enter current password"
          />

          <Input
            label="New Password"
            type="password"
            value={passwordData.newPassword}
            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
            required
            placeholder="Enter new password (min 6 characters)"
          />

          <Input
            label="Confirm New Password"
            type="password"
            value={passwordData.confirmPassword}
            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
            required
            placeholder="Confirm new password"
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowChangePasswordModal(false)}
            >
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
          <p className="text-sm text-gray-600">
            View your recent login attempts and active sessions
          </p>

          {activitiesLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : loginActivities && loginActivities.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-blue-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Device
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loginActivities.map((activity) => (
                    <tr key={activity._id} className="hover:bg-blue-100">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          activity.type === 'login' ? 'bg-green-100 text-green-800' :
                          activity.type === 'failed_login' ? 'bg-red-100 text-red-800' :
                          activity.type === 'logout' ? 'bg-blue-100 text-gray-800' :
                          'bg-blue-100 text-blue-800'
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
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
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
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No login activity found</p>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button onClick={() => setShowLoginActivityModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default VendorSettings;
