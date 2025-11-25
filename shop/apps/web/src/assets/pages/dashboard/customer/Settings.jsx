import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/utils/api';
import { useToast } from '@/components/common/ToastContainer';
import { logout, updateUserProfile } from '@/store/slices/authSlice';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import DeleteAccountModal from '@/components/common/DeleteAccountModal';

const Settings = () => {
  const toast = useToast();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [emailPreferences, setEmailPreferences] = useState({
    orderUpdates: true,
    promotions: true,
    newsletter: false,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.put('/user/profile', data);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Profile updated successfully!');
      // Update Redux store with new user data
      dispatch(updateUserProfile(data.data));
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update profile');
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.put('/user/password', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to change password');
    },
  });

  // Update email preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.put('/user/email-preferences', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Email preferences updated!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update preferences');
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async (password) => {
      const response = await api.delete('/user/account', { data: { password } });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Your account has been deleted successfully');
      // Logout and redirect to homepage
      dispatch(logout());
      navigate('/');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete account');
    },
  });

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };

  const handlePreferencesSubmit = (e) => {
    e.preventDefault();
    updatePreferencesMutation.mutate(emailPreferences);
  };

  const handleDeleteAccount = (password) => {
    deleteAccountMutation.mutate(password);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>

      {/* Profile Information */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-bold mb-4">Profile Information</h2>
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <Input
              type="text"
              value={profileData.name}
              onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <Input
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <Input
              type="tel"
              value={profileData.phone}
              onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <Button
            type="submit"
            loading={updateProfileMutation.isPending}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
          >
            Save Changes
          </Button>
        </form>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-bold mb-4">Change Password</h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Password
            </label>
            <Input
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <Input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              required
              minLength={8}
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <Input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              required
              minLength={8}
            />
          </div>

          <Button
            type="submit"
            loading={changePasswordMutation.isPending}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
          >
            Change Password
          </Button>
        </form>
      </div>

      {/* Email Preferences - Coming Soon */}
      {/* Commented out until backend endpoint is implemented
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-bold mb-4">Email Preferences</h2>
        <form onSubmit={handlePreferencesSubmit} className="space-y-4">
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={emailPreferences.orderUpdates}
                onChange={(e) => setEmailPreferences({ ...emailPreferences, orderUpdates: e.target.checked })}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="ml-3 text-sm font-medium text-gray-700">
                Order updates and shipping notifications
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={emailPreferences.promotions}
                onChange={(e) => setEmailPreferences({ ...emailPreferences, promotions: e.target.checked })}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="ml-3 text-sm font-medium text-gray-700">
                Promotional offers and discounts
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={emailPreferences.newsletter}
                onChange={(e) => setEmailPreferences({ ...emailPreferences, newsletter: e.target.checked })}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="ml-3 text-sm font-medium text-gray-700">
                Newsletter and product updates
              </span>
            </label>
          </div>

          <Button
            type="submit"
            loading={updatePreferencesMutation.isPending}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
          >
            Save Preferences
          </Button>
        </form>
      </div>
      */}

      {/* Account Information */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-bold mb-4">Account Information</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b">
            <span className="font-medium text-gray-700">Account Type:</span>
            <span className="text-gray-900 capitalize">{user?.role || 'Customer'}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="font-medium text-gray-700">Member Since:</span>
            <span className="text-gray-900">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="font-medium text-gray-700">Account Status:</span>
            <span className="text-green-600 font-semibold">Active</span>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 rounded-lg border border-red-200 p-6">
        <h2 className="text-xl font-bold mb-2 text-red-900">Danger Zone</h2>
        <p className="text-sm text-red-700 mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 font-semibold transition-colors"
        >
          Delete Account
        </button>
      </div>

      {/* Delete Account Modal */}
      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        isLoading={deleteAccountMutation.isPending}
      />
    </div>
  );
};

export default Settings;
