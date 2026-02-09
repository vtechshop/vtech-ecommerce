// FILE: apps/web/src/pages/dashboard/admin/Warranties.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import CustomSelect from '@/components/common/CustomSelect';
import Pagination from '@/components/common/Pagination';
import Spinner from '@/components/common/Spinner';
import {
  Search, Eye, X, Calendar, Clock, AlertTriangle, CheckCircle, XCircle,
  Package, RefreshCw, Download, Shield, Bell, FileText, Plus, Minus,
  Settings, TrendingUp, ShieldCheck, ShieldX, ClipboardList, Mail
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const Warranties = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingWarranty, setViewingWarranty] = useState(null);
  const [selectedWarranties, setSelectedWarranties] = useState([]);
  const [showExtendModal, setShowExtendModal] = useState(null);
  const [extendDays, setExtendDays] = useState(90);
  const [showClaimModal, setShowClaimModal] = useState(null);
  const [claimAction, setClaimAction] = useState({ status: '', resolution: '' });

  // Fetch warranty statistics (enhanced)
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['warranty-stats-enhanced'],
    queryFn: async () => {
      const response = await api.get('/warranties/admin/stats/enhanced');
      return response.data.data;
    },
  });

  // Fetch warranties list
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-warranties', page, statusFilter, typeFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', '20');
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('type', typeFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await api.get(`/warranties/admin/all?${params}`);
      return response.data;
    },
  });

  const warranties = data?.data || [];
  const pagination = data?.pagination || {};

  // Mutations
  const extendWarrantyMutation = useMutation({
    mutationFn: async ({ warrantyId, days }) => {
      const response = await api.put(`/warranties/admin/${warrantyId}/extend`, { days });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Warranty extended successfully');
      queryClient.invalidateQueries(['admin-warranties']);
      queryClient.invalidateQueries(['warranty-stats-enhanced']);
      setShowExtendModal(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to extend warranty');
    },
  });

  const voidWarrantyMutation = useMutation({
    mutationFn: async (warrantyId) => {
      const response = await api.put(`/warranties/admin/${warrantyId}/void`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Warranty voided successfully');
      queryClient.invalidateQueries(['admin-warranties']);
      queryClient.invalidateQueries(['warranty-stats-enhanced']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to void warranty');
    },
  });

  const sendReminderMutation = useMutation({
    mutationFn: async (warrantyId) => {
      const response = await api.post(`/warranties/admin/${warrantyId}/send-reminder`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Reminder sent successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to send reminder');
    },
  });

  const processClaimMutation = useMutation({
    mutationFn: async ({ warrantyId, claimId, status, resolution }) => {
      const response = await api.put(`/warranties/admin/${warrantyId}/claims/${claimId}`, { status, resolution });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Claim processed successfully');
      queryClient.invalidateQueries(['admin-warranties']);
      queryClient.invalidateQueries(['warranty-stats-enhanced']);
      setShowClaimModal(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to process claim');
    },
  });

  const bulkActionMutation = useMutation({
    mutationFn: async ({ action, warrantyIds, data }) => {
      const response = await api.post('/warranties/admin/bulk-action', { action, warrantyIds, data });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Bulk action completed');
      queryClient.invalidateQueries(['admin-warranties']);
      queryClient.invalidateQueries(['warranty-stats-enhanced']);
      setSelectedWarranties([]);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Bulk action failed');
    },
  });

  // Export CSV
  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('type', typeFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await api.get(`/warranties/admin/export?${params}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `warranties-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Export downloaded');
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  // Selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedWarranties(warranties.map(w => w._id));
    } else {
      setSelectedWarranties([]);
    }
  };

  const handleSelectWarranty = (id) => {
    setSelectedWarranties(prev =>
      prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]
    );
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, label: 'Active' },
      expiring_soon: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: AlertTriangle, label: 'Expiring Soon' },
      expired: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle, label: 'Expired' },
      no_warranty: { bg: 'bg-gray-100', text: 'text-gray-600', icon: XCircle, label: 'No Warranty' },
      claimed: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Package, label: 'Claimed' },
      void: { bg: 'bg-gray-200', text: 'text-gray-700', icon: ShieldX, label: 'Void' },
    };
    const badge = badges[status] || badges.active;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  const getTypeBadge = (type) => {
    const badges = {
      manufacturer: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Manufacturer' },
      extended: { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Extended' },
      seller: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Seller' },
      none: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'None' },
    };
    const badge = badges[type] || badges.manufacturer;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysRemainingText = (daysRemaining) => {
    if (daysRemaining < 0) {
      return <span className="text-red-600 font-medium">Expired {Math.abs(daysRemaining)} days ago</span>;
    } else if (daysRemaining === 0) {
      return <span className="text-red-600 font-medium">Expires today</span>;
    } else if (daysRemaining <= 30) {
      return <span className="text-yellow-600 font-medium">{daysRemaining} days remaining</span>;
    } else {
      return <span className="text-green-600 font-medium">{daysRemaining} days remaining</span>;
    }
  };

  if (isLoading && !warranties.length) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Warranty Management</h1>
          <p className="text-gray-700 mt-2">Track and manage product warranties, claims, and extensions</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Warranty Overview Card - Dark Gradient */}
      {stats && (
        <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-6 mb-8 text-white">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-8 h-8" />
            <div>
              <h2 className="text-xl font-bold">Warranty Overview</h2>
              <p className="text-gray-300 text-sm">Summary of all product warranties</p>
            </div>
          </div>

          {/* Type Distribution */}
          {stats.typeDistribution && (
            <div className="grid grid-cols-4 gap-4 mb-6">
              {Object.entries(stats.typeDistribution).map(([type, count]) => (
                <div key={type} className="bg-white/10 rounded-lg p-3">
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-gray-300 text-sm capitalize">{type} Warranty</div>
                </div>
              ))}
            </div>
          )}

          {/* Progress bars for status */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Active ({stats.active || 0})</span>
                <span>{stats.total ? Math.round((stats.active / stats.total) * 100) : 0}%</span>
              </div>
              <div className="h-2 bg-gray-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${stats.total ? (stats.active / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Expiring Soon ({stats.expiringSoon || 0})</span>
                <span>{stats.total ? Math.round((stats.expiringSoon / stats.total) * 100) : 0}%</span>
              </div>
              <div className="h-2 bg-gray-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                  style={{ width: `${stats.total ? (stats.expiringSoon / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Expired ({stats.expired || 0})</span>
                <span>{stats.total ? Math.round((stats.expired / stats.total) * 100) : 0}%</span>
              </div>
              <div className="h-2 bg-gray-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full transition-all duration-500"
                  style={{ width: `${stats.total ? (stats.expired / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-xl font-bold text-gray-900">{stats.total || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active</p>
                <p className="text-xl font-bold text-green-600">{stats.active || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Expiring Soon</p>
                <p className="text-xl font-bold text-yellow-600">{stats.expiringSoon || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Expired</p>
                <p className="text-xl font-bold text-red-600">{stats.expired || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending Claims</p>
                <p className="text-xl font-bold text-purple-600">{stats.pendingClaims || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg Period</p>
                <p className="text-xl font-bold text-indigo-600">{stats.avgWarrantyDays || 0}d</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by warranty ID, product name, or customer email..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="w-full lg:w-48">
            <CustomSelect
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'expiring_soon', label: 'Expiring Soon' },
                { value: 'expired', label: 'Expired' },
                { value: 'claimed', label: 'Claimed' },
                { value: 'void', label: 'Void' },
                { value: 'no_warranty', label: 'No Warranty' },
              ]}
              placeholder="Filter by status"
            />
          </div>

          {/* Type Filter */}
          <div className="w-full lg:w-48">
            <CustomSelect
              value={typeFilter}
              onChange={(value) => {
                setTypeFilter(value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Types' },
                { value: 'manufacturer', label: 'Manufacturer' },
                { value: 'extended', label: 'Extended' },
                { value: 'seller', label: 'Seller' },
              ]}
              placeholder="Filter by type"
            />
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedWarranties.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap items-center gap-3">
            <span className="text-sm text-gray-600">
              {selectedWarranties.length} selected
            </span>
            <button
              onClick={() => bulkActionMutation.mutate({ action: 'send_reminder', warrantyIds: selectedWarranties })}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
              disabled={bulkActionMutation.isPending}
            >
              <Bell className="w-4 h-4" />
              Send Reminders
            </button>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to void these warranties?')) {
                  bulkActionMutation.mutate({ action: 'void', warrantyIds: selectedWarranties });
                }
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
              disabled={bulkActionMutation.isPending}
            >
              <ShieldX className="w-4 h-4" />
              Void Selected
            </button>
            <button
              onClick={() => setSelectedWarranties([])}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Clear Selection
            </button>
          </div>
        )}
      </div>

      {/* Warranties Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={selectedWarranties.length === warranties.length && warranties.length > 0}
                    className="rounded border-gray-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Warranty ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Purchase Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Expiry Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Remaining
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {warranties.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-6 py-12 text-center text-gray-500">
                    <Shield className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-lg font-medium">No warranties found</p>
                    <p className="text-sm mt-1">Try adjusting your filters or search term</p>
                  </td>
                </tr>
              ) : (
                warranties.map((warranty) => (
                  <tr key={warranty._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedWarranties.includes(warranty._id)}
                        onChange={() => handleSelectWarranty(warranty._id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-blue-600">{warranty.warrantyId}</div>
                      <div className="text-xs text-gray-500">Order: {warranty.purchaseId}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-gray-900 max-w-[200px] truncate">
                        {warranty.product?.name}
                      </div>
                      {warranty.product?.model && (
                        <div className="text-xs text-gray-500">Model: {warranty.product.model}</div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {warranty.userId?.name || warranty.customerName || warranty.userId?.email || 'N/A'}
                      </div>
                      {(warranty.userId?.email || warranty.customerEmail) && (
                        <div className="text-xs text-gray-500">{warranty.userId?.email || warranty.customerEmail}</div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {getTypeBadge(warranty.warrantyType)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-gray-900">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {formatDate(warranty.purchaseDate)}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-gray-900">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {formatDate(warranty.warrantyEndDate)}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        {getDaysRemainingText(warranty.daysRemaining)}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {getStatusBadge(warranty.status)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setViewingWarranty(warranty)}
                          className="text-blue-600 hover:text-blue-700 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        {warranty.status !== 'void' && warranty.status !== 'expired' && (
                          <>
                            <button
                              onClick={() => setShowExtendModal(warranty)}
                              className="text-green-600 hover:text-green-700 transition-colors"
                              title="Extend Warranty"
                            >
                              <Plus className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => sendReminderMutation.mutate(warranty._id)}
                              className="text-yellow-600 hover:text-yellow-700 transition-colors"
                              title="Send Reminder"
                              disabled={sendReminderMutation.isPending}
                            >
                              <Bell className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <Pagination
              currentPage={pagination.currentPage || 1}
              totalPages={pagination.totalPages || 1}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* View Warranty Modal */}
      {viewingWarranty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header - Dark Gradient */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-700 px-6 py-4 flex items-center justify-between">
              <div className="text-white">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Shield className="w-6 h-6" />
                  Warranty Details
                </h2>
                <p className="text-gray-300 text-sm mt-1">{viewingWarranty.warrantyId}</p>
              </div>
              <button
                onClick={() => setViewingWarranty(null)}
                className="text-gray-300 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Status Overview */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">Current Status</h3>
                    <div className="mt-2">{getStatusBadge(viewingWarranty.status)}</div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Days Remaining</p>
                    <div className="mt-1 text-lg font-bold">
                      {getDaysRemainingText(viewingWarranty.daysRemaining)}
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                {viewingWarranty.status !== 'void' && (
                  <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setViewingWarranty(null);
                        setShowExtendModal(viewingWarranty);
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Extend Warranty
                    </button>
                    <button
                      onClick={() => sendReminderMutation.mutate(viewingWarranty._id)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                      disabled={sendReminderMutation.isPending}
                    >
                      <Mail className="w-4 h-4" />
                      Send Reminder
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to void this warranty?')) {
                          voidWarrantyMutation.mutate(viewingWarranty._id);
                          setViewingWarranty(null);
                        }
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                    >
                      <ShieldX className="w-4 h-4" />
                      Void Warranty
                    </button>
                  </div>
                )}
              </div>

              {/* Product Information */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Package className="w-5 h-5 text-gray-400" />
                  Product Information
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
                  <div>
                    <p className="text-sm text-gray-500">Product Name</p>
                    <p className="font-medium text-gray-900">{viewingWarranty.product?.name}</p>
                  </div>
                  {viewingWarranty.product?.model && (
                    <div>
                      <p className="text-sm text-gray-500">Model</p>
                      <p className="font-medium text-gray-900">{viewingWarranty.product.model}</p>
                    </div>
                  )}
                  {viewingWarranty.product?.serial && (
                    <div>
                      <p className="text-sm text-gray-500">Serial Number</p>
                      <p className="font-medium text-gray-900">{viewingWarranty.product.serial}</p>
                    </div>
                  )}
                  {viewingWarranty.product?.category && (
                    <div>
                      <p className="text-sm text-gray-500">Category</p>
                      <p className="font-medium text-gray-900">{viewingWarranty.product.category}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Warranty Information */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-gray-400" />
                  Warranty Information
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 bg-gray-50 rounded-lg p-4">
                  <div>
                    <p className="text-sm text-gray-500">Warranty Type</p>
                    <div className="mt-1">{getTypeBadge(viewingWarranty.warrantyType)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Warranty Period</p>
                    <p className="font-medium text-gray-900">{viewingWarranty.warrantyPeriodDays} days</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Start Date</p>
                    <p className="font-medium text-gray-900">{formatDate(viewingWarranty.warrantyStartDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">End Date</p>
                    <p className="font-medium text-gray-900">{formatDate(viewingWarranty.warrantyEndDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Purchase Date</p>
                    <p className="font-medium text-gray-900">{formatDate(viewingWarranty.purchaseDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Days Since Purchase</p>
                    <p className="font-medium text-gray-900">{viewingWarranty.daysSincePurchase} days</p>
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-400" />
                  Customer Information
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
                  <div>
                    <p className="text-sm text-gray-500">Customer Name</p>
                    <p className="font-medium text-gray-900">{viewingWarranty.userId?.name || viewingWarranty.customerName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">{viewingWarranty.userId?.email || viewingWarranty.customerEmail || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Order ID</p>
                    <p className="font-medium text-gray-900">{viewingWarranty.purchaseId}</p>
                  </div>
                  {viewingWarranty.extraInfo?.invoiceNo && (
                    <div>
                      <p className="text-sm text-gray-500">Invoice Number</p>
                      <p className="font-medium text-gray-900">{viewingWarranty.extraInfo.invoiceNo}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Claims Section */}
              {viewingWarranty.claims && viewingWarranty.claims.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-gray-400" />
                    Warranty Claims ({viewingWarranty.claims.length})
                  </h3>
                  <div className="space-y-3">
                    {viewingWarranty.claims.map((claim, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium text-gray-900">Claim #{claim.claimId}</span>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            claim.status === 'completed' ? 'bg-green-100 text-green-800' :
                            claim.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                            claim.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {claim.status?.charAt(0).toUpperCase() + claim.status?.slice(1)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-3">{claim.description}</p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Claimed: {formatDate(claim.claimDate)}</span>
                          {claim.resolvedDate && <span>Resolved: {formatDate(claim.resolvedDate)}</span>}
                        </div>

                        {/* Claim Actions */}
                        {claim.status === 'pending' && (
                          <div className="mt-3 pt-3 border-t border-gray-200 flex gap-2">
                            <button
                              onClick={() => setShowClaimModal({ warranty: viewingWarranty, claim })}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                            >
                              Process Claim
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notifications */}
              {viewingWarranty.notifications && viewingWarranty.notifications.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-gray-400" />
                    Notification History
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    {viewingWarranty.notifications.map((notification, index) => (
                      <div key={index} className="flex items-center justify-between text-sm py-2 border-b border-gray-200 last:border-0">
                        <span className="text-gray-700 capitalize">{notification.type?.replace(/_/g, ' ')}</span>
                        <span className="text-gray-500">{formatDate(notification.sentAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setViewingWarranty(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extend Warranty Modal */}
      {showExtendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-gradient-to-r from-green-600 to-green-500 px-6 py-4 flex items-center justify-between rounded-t-lg">
              <div className="text-white">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Extend Warranty
                </h2>
                <p className="text-green-100 text-sm">{showExtendModal.warrantyId}</p>
              </div>
              <button
                onClick={() => setShowExtendModal(null)}
                className="text-green-100 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Product: <span className="font-medium">{showExtendModal.product?.name}</span></p>
                <p className="text-sm text-gray-600">Current Expiry: <span className="font-medium">{formatDate(showExtendModal.warrantyEndDate)}</span></p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Extension Period (Days)
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setExtendDays(30)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${extendDays === 30 ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    30 Days
                  </button>
                  <button
                    onClick={() => setExtendDays(90)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${extendDays === 90 ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    90 Days
                  </button>
                  <button
                    onClick={() => setExtendDays(180)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${extendDays === 180 ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    180 Days
                  </button>
                  <button
                    onClick={() => setExtendDays(365)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${extendDays === 365 ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    1 Year
                  </button>
                </div>
                <input
                  type="number"
                  value={extendDays}
                  onChange={(e) => setExtendDays(parseInt(e.target.value) || 0)}
                  min="1"
                  className="mt-3 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Custom days..."
                />
              </div>

              <div className="bg-green-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-green-800">
                  <strong>New Expiry Date:</strong>{' '}
                  {formatDate(new Date(new Date(showExtendModal.warrantyEndDate).getTime() + extendDays * 24 * 60 * 60 * 1000))}
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowExtendModal(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => extendWarrantyMutation.mutate({ warrantyId: showExtendModal._id, days: extendDays })}
                  disabled={extendWarrantyMutation.isPending || extendDays <= 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {extendWarrantyMutation.isPending ? 'Extending...' : 'Extend Warranty'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Process Claim Modal */}
      {showClaimModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4 flex items-center justify-between rounded-t-lg">
              <div className="text-white">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" />
                  Process Claim
                </h2>
                <p className="text-blue-100 text-sm">Claim #{showClaimModal.claim.claimId}</p>
              </div>
              <button
                onClick={() => setShowClaimModal(null)}
                className="text-blue-100 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Claim Description:</p>
                <p className="text-gray-900">{showClaimModal.claim.description}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Decision
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setClaimAction({ ...claimAction, status: 'approved' })}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${claimAction.status === 'approved' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setClaimAction({ ...claimAction, status: 'rejected' })}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${claimAction.status === 'rejected' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    Reject
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resolution Notes
                </label>
                <textarea
                  value={claimAction.resolution}
                  onChange={(e) => setClaimAction({ ...claimAction, resolution: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter resolution notes..."
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowClaimModal(null);
                    setClaimAction({ status: '', resolution: '' });
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => processClaimMutation.mutate({
                    warrantyId: showClaimModal.warranty._id,
                    claimId: showClaimModal.claim.claimId,
                    status: claimAction.status,
                    resolution: claimAction.resolution
                  })}
                  disabled={processClaimMutation.isPending || !claimAction.status}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processClaimMutation.isPending ? 'Processing...' : 'Submit Decision'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Warranties;
