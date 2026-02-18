// FILE: apps/web/src/pages/dashboard/admin/CRMCustomers.jsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Pagination from '@/components/common/Pagination';
import Spinner from '@/components/common/Spinner';
import CustomSelect from '@/components/common/CustomSelect';
import { formatCurrency, formatDate } from '@/utils/format';
import { useToast } from '@/components/common/ToastContainer';
import {
  Eye, Search, Mail, Tag, TrendingUp, ShoppingCart, DollarSign,
  Calendar, Phone, MapPin, RefreshCw, Download, Users, Crown,
  AlertTriangle, UserCheck, UserX, Clock, Award, XCircle,
  ChevronRight, Star, Heart, Package, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

// Customer Lifetime Value (CLV) Tiers
const getCLVTier = (totalSpent) => {
  if (totalSpent >= 50000) return { tier: 'Platinum', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: '💎', iconColor: 'text-purple-600' };
  if (totalSpent >= 20000) return { tier: 'Gold', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: '🥇', iconColor: 'text-yellow-600' };
  if (totalSpent >= 5000) return { tier: 'Silver', color: 'bg-gray-200 text-gray-800 border-gray-300', icon: '🥈', iconColor: 'text-gray-600' };
  return { tier: 'Bronze', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: '🥉', iconColor: 'text-orange-600' };
};

// Days since last order
const getDaysSinceLastOrder = (lastOrderDate) => {
  if (!lastOrderDate) return null;
  const now = new Date();
  const last = new Date(lastOrderDate);
  const diffTime = Math.abs(now - last);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Get risk indicator based on days inactive
const getRiskIndicator = (days, orderCount) => {
  if (!days || orderCount === 0) return { label: 'New', color: 'text-blue-600', bg: 'bg-blue-50' };
  if (days > 90) return { label: 'Lost', color: 'text-red-600', bg: 'bg-red-50', icon: UserX };
  if (days > 60) return { label: 'At Risk', color: 'text-orange-600', bg: 'bg-orange-50', icon: AlertTriangle };
  if (days > 30) return { label: 'Cooling', color: 'text-yellow-600', bg: 'bg-yellow-50', icon: Clock };
  return { label: 'Active', color: 'text-green-600', bg: 'bg-green-50', icon: UserCheck };
};

const CRMCustomers = () => {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('');
  const [viewingCustomer, setViewingCustomer] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['crm-customers', page, searchTerm, segmentFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', '20');
      if (searchTerm) params.append('search', searchTerm);
      if (segmentFilter) params.append('segment', segmentFilter);

      const response = await api.get(`/admin/crm/customers?${params}`);
      return response.data;
    },
  });

  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ['crm-stats'],
    queryFn: async () => {
      const response = await api.get('/admin/crm/stats');
      return response.data;
    },
  });

  const handleView = (customer) => {
    setViewingCustomer(customer);
  };

  const getSegmentColor = (segment) => {
    switch (segment) {
      case 'vip':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'loyal':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'new':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'at-risk':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'inactive':
        return 'bg-gray-200 text-gray-700 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSegmentIcon = (segment) => {
    switch (segment) {
      case 'vip': return Crown;
      case 'loyal': return Heart;
      case 'new': return Star;
      case 'at-risk': return AlertTriangle;
      case 'inactive': return UserX;
      default: return Users;
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const csvData = [
      ['Name', 'Email', 'Phone', 'Segment', 'CLV Tier', 'Orders', 'Total Spent', 'Avg Order', 'Last Order', 'Days Inactive', 'Joined'].join(','),
      ...(customers || []).map(c => {
        const clv = getCLVTier(c.totalSpent || 0);
        const days = getDaysSinceLastOrder(c.lastOrderDate);
        return [
          c.name || 'N/A',
          c.email || 'N/A',
          c.phone || 'N/A',
          c.segment || 'regular',
          clv.tier,
          c.orderCount || 0,
          c.totalSpent || 0,
          c.avgOrderValue || 0,
          c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString() : 'Never',
          days || 'N/A',
          c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A',
        ].map(cell => `"${cell}"`).join(',');
      })
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `customers-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully!');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const customers = data?.data || [];
  const totalPages = Math.ceil((data?.meta?.total || 0) / 20);
  const stats = statsData?.data || {};

  // Calculate segment counts from current data for the segment pills
  const segmentCounts = {
    vip: stats.vipCount || 0,
    loyal: stats.loyalCount || 0,
    new: stats.newCount || 0,
    'at-risk': stats.atRiskCount || 0,
    inactive: stats.inactiveCount || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            CRM - Customers
          </h1>
          <p className="text-gray-700 mt-1">Manage customer relationships and analytics</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetch();
              refetchStats();
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Customers</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalCustomers || 0}</p>
              {stats.newThisMonth > 0 && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" />
                  +{stats.newThisMonth} this month
                </p>
              )}
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Revenue</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{formatCurrency(stats.totalRevenue || 0)}</p>
              <p className="text-xs text-gray-500 mt-1">Lifetime value</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Avg Order Value</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">{formatCurrency(stats.avgOrderValue || 0)}</p>
              <p className="text-xs text-gray-500 mt-1">Per transaction</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Active This Month</p>
              <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.activeThisMonth || 0}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.totalCustomers > 0
                  ? `${Math.round((stats.activeThisMonth / stats.totalCustomers) * 100)}% of total`
                  : '0% of total'}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Segment Distribution */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Award className="w-5 h-5 text-gray-600" />
            Customer Segments
          </h3>
          <span className="text-sm text-gray-500">Click to filter</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {[
            { key: '', label: 'All', count: stats.totalCustomers || 0, color: 'bg-gray-800 text-white' },
            { key: 'vip', label: 'VIP', count: segmentCounts.vip, color: 'bg-purple-100 text-purple-800', icon: Crown },
            { key: 'loyal', label: 'Loyal', count: segmentCounts.loyal, color: 'bg-green-100 text-green-800', icon: Heart },
            { key: 'new', label: 'New', count: segmentCounts.new, color: 'bg-blue-100 text-blue-800', icon: Star },
            { key: 'at-risk', label: 'At Risk', count: segmentCounts['at-risk'], color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
            { key: 'inactive', label: 'Inactive', count: segmentCounts.inactive, color: 'bg-gray-200 text-gray-700', icon: UserX },
          ].map(({ key, label, count, color, icon: Icon }) => (
            <button
              key={key}
              onClick={() => {
                setSegmentFilter(key);
                setPage(1);
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                segmentFilter === key
                  ? 'bg-gray-800 text-white ring-2 ring-gray-800 ring-offset-2'
                  : `${color} hover:ring-2 hover:ring-gray-300 hover:ring-offset-1`
              }`}
            >
              {Icon && <Icon className="w-4 h-4" />}
              {label}
              <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                segmentFilter === key ? 'bg-white/20' : 'bg-black/10'
              }`}>
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="input pl-10 w-full"
            />
          </div>
          <CustomSelect
            value={segmentFilter}
            onChange={(value) => {
              setSegmentFilter(value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All Segments' },
              { value: 'vip', label: 'VIP Customers' },
              { value: 'loyal', label: 'Loyal Customers' },
              { value: 'new', label: 'New Customers' },
              { value: 'at-risk', label: 'At Risk' },
              { value: 'inactive', label: 'Inactive' },
            ]}
            placeholder="All Segments"
            className="w-48"
          />
          {(searchTerm || segmentFilter) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSegmentFilter('');
                setPage(1);
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider">Customer</th>
                <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wider">Segment</th>
                <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wider">CLV Tier</th>
                <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wider">Orders</th>
                <th className="text-right py-3 px-4 font-semibold text-xs uppercase tracking-wider">Total Spent</th>
                <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wider">Status</th>
                <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wider">Last Order</th>
                <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-lg">No customers found</p>
                    <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
                  </td>
                </tr>
              ) : (
                customers.map((customer) => {
                  const clvTier = getCLVTier(customer.totalSpent || 0);
                  const daysSince = getDaysSinceLastOrder(customer.lastOrderDate);
                  const risk = getRiskIndicator(daysSince, customer.orderCount);
                  const SegmentIcon = getSegmentIcon(customer.segment);

                  return (
                    <tr key={customer._id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-white">
                              {customer.name?.charAt(0)?.toUpperCase() || 'C'}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{customer.name || 'N/A'}</p>
                            <p className="text-xs text-gray-500 truncate">{customer.email || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border ${getSegmentColor(customer.segment)}`}>
                          <SegmentIcon className="w-3 h-3" />
                          {customer.segment?.toUpperCase() || 'REGULAR'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full border ${clvTier.color}`}>
                          {clvTier.icon} {clvTier.tier}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Package className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{customer.orderCount || 0}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <p className="font-bold text-green-600">{formatCurrency(customer.totalSpent || 0)}</p>
                        <p className="text-xs text-gray-500">
                          Avg: {formatCurrency(customer.avgOrderValue || 0)}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${risk.bg} ${risk.color}`}>
                          {risk.icon && <risk.icon className="w-3 h-3" />}
                          {risk.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div>
                          <p className="text-sm text-gray-900">
                            {customer.lastOrderDate ? formatDate(customer.lastOrderDate) : 'Never'}
                          </p>
                          {daysSince && (
                            <p className={`text-xs ${daysSince > 60 ? 'text-red-500' : daysSince > 30 ? 'text-yellow-600' : 'text-gray-500'}`}>
                              {daysSince} days ago
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleView(customer)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Send Email"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                          <button
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Add Tag"
                          >
                            <Tag className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
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

      {/* Customer Details Modal */}
      {viewingCustomer && (
        <CustomerDetailsModal
          customer={viewingCustomer}
          onClose={() => setViewingCustomer(null)}
        />
      )}
    </div>
  );
};

// Customer Details Modal Component
const CustomerDetailsModal = ({ customer, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');

  const { data: ordersData } = useQuery({
    queryKey: ['customer-orders', customer._id],
    queryFn: async () => {
      const response = await api.get(`/admin/crm/customers/${customer._id}/orders`);
      return response.data;
    },
    enabled: !!customer._id,
  });

  const orders = ordersData?.data || [];
  const clvTier = getCLVTier(customer.totalSpent || 0);
  const daysSince = getDaysSinceLastOrder(customer.lastOrderDate);
  const risk = getRiskIndicator(daysSince, customer.orderCount);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold">
                  {customer.name?.charAt(0)?.toUpperCase() || 'C'}
                </span>
              </div>
              <div>
                <h2 className="text-2xl font-bold">{customer.name || 'Customer'}</h2>
                <p className="text-blue-100">{customer.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-white/20`}>
                    {clvTier.icon} {clvTier.tier} Customer
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-white/20`}>
                    {risk.label}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 border-b">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{customer.orderCount || 0}</p>
            <p className="text-xs text-gray-500">Total Orders</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{formatCurrency(customer.totalSpent || 0)}</p>
            <p className="text-xs text-gray-500">Lifetime Value</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{formatCurrency(customer.avgOrderValue || 0)}</p>
            <p className="text-xs text-gray-500">Avg Order</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{daysSince || 'N/A'}</p>
            <p className="text-xs text-gray-500">Days Since Last Order</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex gap-1 px-6">
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'orders', label: `Orders (${customer.orderCount || 0})` },
              { key: 'activity', label: 'Activity' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[400px]">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Customer Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-600" />
                  Customer Information
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 flex items-center gap-2">
                      <Mail className="w-4 h-4" /> Email
                    </span>
                    <span className="font-medium">{customer.email || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 flex items-center gap-2">
                      <Phone className="w-4 h-4" /> Phone
                    </span>
                    <span className="font-medium">{customer.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> Location
                    </span>
                    <span className="font-medium">{customer.location || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> Joined
                    </span>
                    <span className="font-medium">{formatDate(customer.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 flex items-center gap-2">
                      <Tag className="w-4 h-4" /> Segment
                    </span>
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                      customer.segment ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {customer.segment?.toUpperCase() || 'REGULAR'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Purchase Statistics */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-gray-600" />
                  Purchase Statistics
                </h3>
                <div className="space-y-3">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-700">Total Orders</p>
                        <p className="text-2xl font-bold text-blue-900">{customer.orderCount || 0}</p>
                      </div>
                      <Package className="w-8 h-8 text-blue-500" />
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-700">Total Spent</p>
                        <p className="text-2xl font-bold text-green-900">{formatCurrency(customer.totalSpent || 0)}</p>
                      </div>
                      <DollarSign className="w-8 h-8 text-green-500" />
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-purple-700">CLV Tier</p>
                        <p className="text-2xl font-bold text-purple-900">{clvTier.icon} {clvTier.tier}</p>
                      </div>
                      <Award className="w-8 h-8 text-purple-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Order History</h3>
              <div className="space-y-3">
                {orders.length > 0 ? (
                  orders.map((order) => (
                    <div key={order._id} className="border rounded-lg p-4 hover:border-blue-300 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium flex items-center gap-2">
                            Order #{order.orderNumber || order.orderId}
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </p>
                          <p className="text-sm text-gray-600">{formatDate(order.createdAt)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">{formatCurrency(order.total)}</p>
                          <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                            order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                            order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {order.status?.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">No orders yet</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
              <div className="text-center py-12">
                <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">Activity tracking coming soon...</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Send Email
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CRMCustomers;
