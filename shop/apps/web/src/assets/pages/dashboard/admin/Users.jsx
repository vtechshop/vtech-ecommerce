// FILE: apps/web/src/pages/dashboard/admin/Users.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Pagination from '@/components/common/Pagination';
import Spinner from '@/components/common/Spinner';
import CustomSelect from '@/components/common/CustomSelect';
import NewBadge from '@/components/common/NewBadge';
import { isNewItem, getNewItemClasses, formatRelativeTime } from '@/utils/dateHelpers';
import { Trash2, Eye, Search, UserCheck, UserX, Key } from 'lucide-react';

const Users = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingUser, setViewingUser] = useState(null);
  const [resettingPasswordFor, setResettingPasswordFor] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, roleFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', '20');
      if (roleFilter) params.append('role', roleFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await api.get(`/admin/users?${params}`);
      return response.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await api.put(`/admin/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      alert('User updated successfully');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      alert('User deleted successfully');
    },
  });

  const handleView = (user) => {
    setViewingUser(user);
  };

  const handleUpdate = (id, data) => {
    updateMutation.mutate({ id, data });
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this user?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const users = data?.data || [];
  const totalPages = Math.ceil((data?.meta?.total || 0) / 20);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">User Management</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="input pl-10 w-full"
            />
          </div>
          <CustomSelect
            value={roleFilter}
            onChange={(value) => {
              setRoleFilter(value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All Roles' },
              { value: 'customer', label: 'Customer' },
              { value: 'vendor', label: 'Vendor' },
              { value: 'affiliate', label: 'Affiliate' },
              { value: 'support', label: 'Support' },
              { value: 'admin', label: 'Admin' },
            ]}
            placeholder="All Roles"
            className="w-full"
          />
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('');
              setRoleFilter('');
              setPage(1);
            }}
            className="flex items-center gap-2"
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-sm">User</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Email</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Role</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Joined</th>
                <th className="text-right py-3 px-4 font-semibold text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isNew = isNewItem(user.createdAt);
                return (
                  <tr
                    key={user._id}
                    className={`border-b last:border-b-0 transition-colors ${getNewItemClasses(user.createdAt)}`}
                  >
                    <td className="py-3 px-3 sm:px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isNew ? 'bg-blue-200' : 'bg-gray-200'
                        }`}>
                          <span className={`text-sm font-medium ${
                            isNew ? 'text-blue-700' : 'text-gray-700'
                          }`}>
                            {user.name?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{user.name || 'N/A'}</p>
                            <NewBadge createdAt={user.createdAt} />
                          </div>
                          <p className="text-xs text-gray-700">
                            ID: {user._id.slice(-8)} • {formatRelativeTime(user.createdAt)}
                          </p>
                        </div>
                      </div>
                    </td>
                  <td className="py-3 px-4 text-sm">{user.email}</td>
                  <td className="py-3 px-3 sm:px-4">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                        user.role === 'admin'
                          ? 'bg-red-100 text-red-800'
                          : user.role === 'vendor'
                          ? 'bg-primary-100 text-primary-800'
                          : user.role === 'affiliate'
                          ? 'bg-secondary-100 text-secondary-800'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      {user.role?.charAt(0).toUpperCase() + user.role?.slice(1) || 'Customer'}
                    </span>
                  </td>
                  <td className="py-3 px-3 sm:px-4">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                        user.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleView(user)}
                        className="text-blue-600 hover:text-blue-700 p-1"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleUpdate(user._id, { isActive: !user.isActive })}
                        className={`p-1 ${
                          user.isActive
                            ? 'text-red-600 hover:text-red-700'
                            : 'text-green-600 hover:text-green-700'
                        }`}
                        title={user.isActive ? 'Deactivate User' : 'Activate User'}
                      >
                        {user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setResettingPasswordFor(user)}
                        className="text-secondary-600 hover:text-secondary-700 p-1"
                        title="Reset Password"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(user._id)}
                        className="text-red-600 hover:text-red-700 p-1"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {/* User Details Modal */}
      {viewingUser && (
        <UserDetailsModal
          user={viewingUser}
          onClose={() => setViewingUser(null)}
          onUpdate={(data) => handleUpdate(viewingUser._id, data)}
        />
      )}

      {/* Password Reset Modal */}
      {resettingPasswordFor && (
        <PasswordResetModal
          user={resettingPasswordFor}
          onClose={() => setResettingPasswordFor(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            setResettingPasswordFor(null);
          }}
        />
      )}
    </div>
  );
};

// User Details Modal Component
const UserDetailsModal = ({ user, onClose, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    role: user.role || 'customer',
    isActive: user.isActive ?? true,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate(formData);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">User Details</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditing(!isEditing)}
              className="text-sm"
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </Button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
              ✕
            </button>
          </div>
        </div>

        <div className="p-4">
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="input w-full"
                  >
                    <option value="customer">Customer</option>
                    <option value="vendor">Vendor</option>
                    <option value="affiliate">Affiliate</option>
                    <option value="support">Support</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  Active User
                </label>
              </div>

              <div className="flex items-center justify-end gap-4 mt-6">
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Name</label>
                      <p className="text-sm">{user.name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Email</label>
                      <p className="text-sm">{user.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Phone</label>
                      <p className="text-sm">{user.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Role</label>
                      <p className="text-sm capitalize">{user.role || 'Customer'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Status</label>
                      <p className="text-sm">
                        <span
                          className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                            user.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Account Details</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">User ID</label>
                      <p className="text-sm font-mono">{user._id}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Joined</label>
                      <p className="text-sm">{new Date(user.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Last Updated</label>
                      <p className="text-sm">{new Date(user.updatedAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Email Verified</label>
                      <p className="text-sm">
                        <span
                          className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                            user.emailVerified
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          {user.emailVerified ? 'Verified' : 'Not Verified'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Password Reset Modal Component
const PasswordResetModal = ({ user, onClose, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const resetMutation = useMutation({
    mutationFn: async () => {
      await api.put(`/admin/users/${user._id}/reset-password`, { password });
    },
    onSuccess: () => {
      alert('Password reset successfully!');
      onSuccess();
    },
    onError: (error) => {
      const message = error.response?.data?.error?.message || 'Failed to reset password';
      alert(message);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    if (password.length < 8) {
      alert('Password must be at least 8 characters long!');
      return;
    }

    if (confirm(`Are you sure you want to reset password for ${user.name} (${user.email})?`)) {
      resetMutation.mutate();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">Reset Password</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Key className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-yellow-800">Reset password for:</p>
                <p className="text-sm text-yellow-700">{user.name}</p>
                <p className="text-sm text-yellow-700">{user.email}</p>
                <p className="text-xs text-yellow-600 mt-2">
                  Role: <span className="font-semibold capitalize">{user.role}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input w-full"
                placeholder="Enter new password (min 8 characters)"
                required
                minLength={8}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input w-full"
                placeholder="Confirm new password"
                required
                minLength={8}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={resetMutation.isLoading}>
              Reset Password
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Users;