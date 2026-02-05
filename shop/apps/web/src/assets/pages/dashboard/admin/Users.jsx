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
import {
  Trash2, Eye, Search, UserCheck, UserX, Key, Users as UsersIcon,
  Store, Link2, Shield, Download, CheckSquare, Square, X,
  ShoppingBag, Package, Clock, Activity
} from 'lucide-react';
import { useToast } from '@/components/common/ToastContainer';

const Users = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingUser, setViewingUser] = useState(null);
  const [resettingPasswordFor, setResettingPasswordFor] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);

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

  // Fetch user stats
  const { data: statsData } = useQuery({
    queryKey: ['admin-users-stats'],
    queryFn: async () => {
      const response = await api.get('/admin/users/stats');
      return response.data.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await api.put(`/admin/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users-stats'] });
      toast.success('User updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update user');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users-stats'] });
      toast.success('User deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete user');
    },
  });

  // Bulk actions
  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ userIds, action }) => {
      await api.post('/admin/users/bulk-update', { userIds, action });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users-stats'] });
      setSelectedUsers([]);
      toast.success('Users updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update users');
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

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(u => u._id));
    }
  };

  const handleSelectUser = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  // Bulk action handlers
  const handleBulkDeactivate = () => {
    if (confirm(`Deactivate ${selectedUsers.length} users?`)) {
      bulkUpdateMutation.mutate({ userIds: selectedUsers, action: 'deactivate' });
    }
  };

  const handleBulkActivate = () => {
    if (confirm(`Activate ${selectedUsers.length} users?`)) {
      bulkUpdateMutation.mutate({ userIds: selectedUsers, action: 'activate' });
    }
  };

  const handleBulkDelete = () => {
    if (confirm(`Delete ${selectedUsers.length} users? This cannot be undone.`)) {
      bulkUpdateMutation.mutate({ userIds: selectedUsers, action: 'delete' });
    }
  };

  const handleExportCSV = () => {
    const exportUsers = selectedUsers.length > 0
      ? users.filter(u => selectedUsers.includes(u._id))
      : users;

    const csvData = [
      ['Name', 'Email', 'Role', 'Status', 'Joined', 'Last Login'].join(','),
      ...exportUsers.map(user => [
        user.name || 'N/A',
        user.email,
        user.role || 'customer',
        user.isActive ? 'Active' : 'Inactive',
        new Date(user.createdAt).toLocaleDateString(),
        user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Users exported successfully!');
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
  const stats = statsData || { total: 0, customers: 0, vendors: 0, affiliates: 0, admins: 0 };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        <Button variant="outline" onClick={handleExportCSV}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <UsersIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total || users.length}</p>
              <p className="text-xs text-gray-500">Total Users</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.customers || 0}</p>
              <p className="text-xs text-gray-500">Customers</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Store className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.vendors || 0}</p>
              <p className="text-xs text-gray-500">Vendors</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Link2 className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.affiliates || 0}</p>
              <p className="text-xs text-gray-500">Affiliates</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.admins || 0}</p>
              <p className="text-xs text-gray-500">Admins</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
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

      {/* Bulk Actions Bar */}
      {selectedUsers.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-900">{selectedUsers.length} users selected</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleBulkActivate}>
              <UserCheck className="w-4 h-4 mr-1" />
              Activate
            </Button>
            <Button variant="outline" size="sm" onClick={handleBulkDeactivate}>
              <UserX className="w-4 h-4 mr-1" />
              Deactivate
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
            <Button variant="danger" size="sm" onClick={handleBulkDelete}>
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
            <button
              onClick={() => setSelectedUsers([])}
              className="p-1 text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-blue-100 border-b">
              <tr>
                <th className="py-3 px-4 w-10">
                  <button onClick={handleSelectAll} className="p-1">
                    {selectedUsers.length === users.length && users.length > 0 ? (
                      <CheckSquare className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                </th>
                <th className="text-left py-3 px-4 font-semibold text-sm">User</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Email</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Role</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Last Login</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Joined</th>
                <th className="text-right py-3 px-4 font-semibold text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isNew = isNewItem(user.createdAt);
                const isSelected = selectedUsers.includes(user._id);
                return (
                  <tr
                    key={user._id}
                    className={`border-b last:border-b-0 transition-colors cursor-pointer ${
                      isSelected ? 'bg-blue-50' : getNewItemClasses(user.createdAt)
                    }`}
                    onClick={() => handleView(user)}
                  >
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleSelectUser(user._id)} className="p-1">
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </td>
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
                            ID: {user._id.slice(-8)}
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
                            ? 'bg-purple-100 text-purple-800'
                            : user.role === 'affiliate'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-blue-100 text-gray-900'
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
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {user.lastLogin ? (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span>{formatRelativeTime(user.lastLogin)}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">Never</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
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
                          className="text-yellow-600 hover:text-yellow-700 p-1"
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

      {/* User Details Drawer */}
      {viewingUser && (
        <UserDetailsDrawer
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

// User Details Drawer Component (Slide-in from right)
const UserDetailsDrawer = ({ user, onClose, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    role: user.role || 'customer',
    isActive: user.isActive ?? true,
  });

  // Fetch user activity
  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ['user-activity', user._id],
    queryFn: async () => {
      const response = await api.get(`/admin/users/${user._id}/activity`);
      return response.data.data;
    },
  });

  // Fetch role-specific data
  const { data: roleData, isLoading: roleLoading } = useQuery({
    queryKey: ['user-role-data', user._id, user.role],
    queryFn: async () => {
      if (user.role === 'vendor') {
        const response = await api.get(`/admin/vendors?userId=${user._id}`);
        return response.data.data?.vendors?.[0] || null;
      } else if (user.role === 'affiliate') {
        const response = await api.get(`/admin/affiliates?userId=${user._id}`);
        return response.data.data?.affiliates?.[0] || null;
      } else if (user.role === 'customer') {
        const response = await api.get(`/admin/orders?userId=${user._id}&limit=5`);
        return { orders: response.data.data || [] };
      }
      return null;
    },
    enabled: ['vendor', 'affiliate', 'customer'].includes(user.role),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate(formData);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={onClose}>
      <div
        className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold">User Details</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </Button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* User Header */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {user.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <h3 className="text-xl font-bold">{user.name || 'N/A'}</h3>
              <p className="text-gray-600">{user.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${
                  user.role === 'admin' ? 'bg-red-100 text-red-800' :
                  user.role === 'vendor' ? 'bg-purple-100 text-purple-800' :
                  user.role === 'affiliate' ? 'bg-orange-100 text-orange-800' :
                  'bg-blue-100 text-gray-900'
                }`}>
                  {user.role?.charAt(0).toUpperCase() + user.role?.slice(1) || 'Customer'}
                </span>
                <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${
                  user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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

              <div className="flex items-center justify-end gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          ) : (
            <>
              {/* Basic Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Account Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">User ID</p>
                    <p className="font-mono text-xs">{user._id}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Phone</p>
                    <p>{user.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Joined</p>
                    <p>{new Date(user.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Last Login</p>
                    <p>{user.lastLogin ? formatRelativeTime(user.lastLogin) : 'Never'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Email Verified</p>
                    <p className={user.emailVerified ? 'text-green-600' : 'text-red-600'}>
                      {user.emailVerified ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Role-Specific Data */}
              {user.role === 'vendor' && roleData && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                    <Store className="w-4 h-4" />
                    Vendor Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-purple-700">Store Name</p>
                      <p className="font-medium">{roleData.storeName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-purple-700">Total Products</p>
                      <p className="font-medium">{roleData.productCount || 0}</p>
                    </div>
                    <div>
                      <p className="text-purple-700">Total Earnings</p>
                      <p className="font-medium">₹{roleData.totalEarnings?.toLocaleString() || 0}</p>
                    </div>
                    <div>
                      <p className="text-purple-700">Status</p>
                      <p className="font-medium capitalize">{roleData.status || 'pending'}</p>
                    </div>
                  </div>
                </div>
              )}

              {user.role === 'affiliate' && roleData && (
                <div className="bg-orange-50 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
                    <Link2 className="w-4 h-4" />
                    Affiliate Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-orange-700">Affiliate Code</p>
                      <p className="font-mono font-medium">{roleData.code || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-orange-700">Commission Rate</p>
                      <p className="font-medium">{roleData.commissionPercentage || 5}%</p>
                    </div>
                    <div>
                      <p className="text-orange-700">Total Earnings</p>
                      <p className="font-medium">₹{roleData.totalEarnings?.toLocaleString() || 0}</p>
                    </div>
                    <div>
                      <p className="text-orange-700">Conversions</p>
                      <p className="font-medium">{roleData.totalConversions || 0}</p>
                    </div>
                  </div>
                </div>
              )}

              {user.role === 'customer' && roleData?.orders && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" />
                    Recent Orders
                  </h4>
                  {roleData.orders.length > 0 ? (
                    <div className="space-y-2">
                      {roleData.orders.slice(0, 5).map(order => (
                        <div key={order._id} className="flex items-center justify-between text-sm bg-white rounded p-2">
                          <span className="font-mono text-xs">{order.orderId}</span>
                          <span>₹{order.totals?.total?.toLocaleString() || 0}</span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                            order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>{order.status}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No orders yet</p>
                  )}
                </div>
              )}

              {/* Activity Log */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Recent Activity
                </h4>
                {activityLoading ? (
                  <div className="flex justify-center py-4">
                    <Spinner size="sm" />
                  </div>
                ) : activityData?.activity && activityData.activity.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {activityData.activity.slice(0, 10).map((activity, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <div className="flex-1">
                          <p className="text-gray-900 capitalize">{activity.type?.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-gray-500">{formatRelativeTime(activity.date)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No recent activity</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Password Reset Modal Component
const PasswordResetModal = ({ user, onClose, onSuccess }) => {
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const resetMutation = useMutation({
    mutationFn: async () => {
      await api.put(`/admin/users/${user._id}/reset-password`, { password });
    },
    onSuccess: () => {
      toast.success('Password reset successfully!');
      onSuccess();
    },
    onError: (error) => {
      const message = error.response?.data?.error?.message || 'Failed to reset password';
      toast.error(message);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match!');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long!');
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
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Key className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-yellow-800">Reset password for:</p>
                <p className="text-sm text-yellow-700">{user.name}</p>
                <p className="text-sm text-yellow-700">{user.email}</p>
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
            <Button type="submit" loading={resetMutation.isPending}>
              Reset Password
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Users;
