// FILE: apps/web/src/pages/dashboard/admin/Warranties.jsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import CustomSelect from '@/components/common/CustomSelect';
import Pagination from '@/components/common/Pagination';
import Spinner from '@/components/common/Spinner';
import { Search, Eye, X, Calendar, Clock, AlertTriangle, CheckCircle, XCircle, Package } from 'lucide-react';

const Warranties = () => {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingWarranty, setViewingWarranty] = useState(null);

  // Fetch warranty statistics
  const { data: stats } = useQuery({
    queryKey: ['warranty-stats'],
    queryFn: async () => {
      const response = await api.get('/warranties/admin/stats');
      return response.data.data;
    },
  });

  // Fetch warranties list
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-warranties', page, statusFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', '20');
      if (statusFilter) params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await api.get(`/warranties/admin/all?${params}`);
      return response.data;
    },
  });

  const warranties = data?.data || [];
  const pagination = data?.pagination || {};

  const getStatusBadge = (status) => {
    const badges = {
      active: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, label: 'Active' },
      expiring_soon: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: AlertTriangle, label: 'Expiring Soon' },
      expired: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle, label: 'Expired' },
      no_warranty: { bg: 'bg-blue-100', text: 'text-gray-900', icon: XCircle, label: 'No Warranty' },
      claimed: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Package, label: 'Claimed' },
      void: { bg: 'bg-blue-100', text: 'text-gray-900', icon: XCircle, label: 'Void' },
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
      none: { bg: 'bg-blue-100', text: 'text-gray-700', label: 'None' },
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

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Warranty Management</h1>
        <p className="text-gray-700 mt-2">Track and manage product warranties and their expiration status</p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Total Warranties</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Active</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.active || 0}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Expiring Soon</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.expiringSoon || 0}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Expired</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{stats.expired || 0}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">No Warranty</p>
                <p className="text-2xl font-bold text-gray-700 mt-1">{stats.noWarranty || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-6 h-6 text-gray-700" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by warranty ID, product name, or customer..."
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
          <div className="w-full md:w-64">
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
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Warranties Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-blue-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Warranty ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Purchase Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expiry Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Days Remaining
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {warranties.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                    <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-lg font-medium">No warranties found</p>
                    <p className="text-sm mt-1">Try adjusting your filters or search term</p>
                  </td>
                </tr>
              ) : (
                warranties.map((warranty) => (
                  <tr key={warranty._id} className="hover:bg-blue-100 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-blue-600">{warranty.warrantyId}</div>
                      <div className="text-xs text-gray-500">Order: {warranty.purchaseId}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{warranty.product?.name}</div>
                      {warranty.product?.model && (
                        <div className="text-xs text-gray-500">Model: {warranty.product.model}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {warranty.userId?.name || warranty.userId?.email || 'N/A'}
                      </div>
                      {warranty.userId?.email && (
                        <div className="text-xs text-gray-500">{warranty.userId.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getTypeBadge(warranty.warrantyType)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-gray-900">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {formatDate(warranty.purchaseDate)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-gray-900">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {formatDate(warranty.warrantyEndDate)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        {getDaysRemainingText(warranty.daysRemaining)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(warranty.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => setViewingWarranty(warranty)}
                        className="text-blue-600 hover:text-blue-700 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
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
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Warranty Details</h2>
                <p className="text-sm text-gray-700 mt-1">{viewingWarranty.warrantyId}</p>
              </div>
              <button
                onClick={() => setViewingWarranty(null)}
                className="text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Status Overview */}
              <div className="bg-blue-100 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">Status</h3>
                    <div className="mt-2">{getStatusBadge(viewingWarranty.status)}</div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-700">Days Remaining</p>
                    <div className="mt-1">{getDaysRemainingText(viewingWarranty.daysRemaining)}</div>
                  </div>
                </div>
              </div>

              {/* Product Information */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Product Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-700">Product Name</p>
                    <p className="font-medium text-gray-900">{viewingWarranty.product?.name}</p>
                  </div>
                  {viewingWarranty.product?.model && (
                    <div>
                      <p className="text-sm text-gray-700">Model</p>
                      <p className="font-medium text-gray-900">{viewingWarranty.product.model}</p>
                    </div>
                  )}
                  {viewingWarranty.product?.serial && (
                    <div>
                      <p className="text-sm text-gray-700">Serial Number</p>
                      <p className="font-medium text-gray-900">{viewingWarranty.product.serial}</p>
                    </div>
                  )}
                  {viewingWarranty.product?.category && (
                    <div>
                      <p className="text-sm text-gray-700">Category</p>
                      <p className="font-medium text-gray-900">{viewingWarranty.product.category}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Warranty Information */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Warranty Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-700">Warranty Type</p>
                    <div className="mt-1">{getTypeBadge(viewingWarranty.warrantyType)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">Warranty Period</p>
                    <p className="font-medium text-gray-900">{viewingWarranty.warrantyPeriodDays} days</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">Start Date</p>
                    <p className="font-medium text-gray-900">{formatDate(viewingWarranty.warrantyStartDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">End Date</p>
                    <p className="font-medium text-gray-900">{formatDate(viewingWarranty.warrantyEndDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">Purchase Date</p>
                    <p className="font-medium text-gray-900">{formatDate(viewingWarranty.purchaseDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">Days Since Purchase</p>
                    <p className="font-medium text-gray-900">{viewingWarranty.daysSincePurchase} days</p>
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Customer Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-700">Customer Name</p>
                    <p className="font-medium text-gray-900">{viewingWarranty.userId?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">Email</p>
                    <p className="font-medium text-gray-900">{viewingWarranty.userId?.email || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Order Information */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Order Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-700">Order ID</p>
                    <p className="font-medium text-gray-900">{viewingWarranty.purchaseId}</p>
                  </div>
                  {viewingWarranty.extraInfo?.invoiceNo && (
                    <div>
                      <p className="text-sm text-gray-700">Invoice Number</p>
                      <p className="font-medium text-gray-900">{viewingWarranty.extraInfo.invoiceNo}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Claims */}
              {viewingWarranty.claims && viewingWarranty.claims.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Warranty Claims</h3>
                  <div className="space-y-3">
                    {viewingWarranty.claims.map((claim, index) => (
                      <div key={index} className="bg-blue-100 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">Claim #{claim.claimId}</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            claim.status === 'completed' ? 'bg-green-100 text-green-800' :
                            claim.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                            claim.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {claim.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{claim.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Claimed: {formatDate(claim.claimDate)}</span>
                          {claim.resolvedDate && <span>Resolved: {formatDate(claim.resolvedDate)}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notifications */}
              {viewingWarranty.notifications && viewingWarranty.notifications.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Notifications Sent</h3>
                  <div className="space-y-2">
                    {viewingWarranty.notifications.map((notification, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{notification.type.replace(/_/g, ' ')}</span>
                        <span className="text-gray-500">{formatDate(notification.sentAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setViewingWarranty(null)}
                className="px-4 py-2 bg-blue-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Warranties;
