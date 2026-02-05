// FILE: apps/web/src/pages/dashboard/admin/VendorCommissions.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import { formatCurrency } from '@/utils/format';
import Button from '@/components/common/Button';
import CustomSelect from '@/components/common/CustomSelect';
import {
  DollarSign, User, ShoppingCart, Calendar,
  Check, X, Clock, Filter, Download, Eye,
  TrendingUp, Store, CheckCircle, AlertCircle,
  Wallet, RefreshCw, CreditCard, PieChart,
  Banknote, ArrowRight
} from 'lucide-react';
import { useToast } from '@/components/common/ToastContainer';
import PendingBadge from '@/components/common/PendingBadge';
import { getPendingItemClasses, formatRelativeTime } from '@/utils/dateHelpers';

const DATE_RANGE_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last 1 year' },
  { value: 'all', label: 'All time' },
];

const getDateRange = (days) => {
  if (days === 'all') return { startDate: '', endDate: '' };
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - parseInt(days));
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
};

const VendorCommissions = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('30'); // Default to 30 days
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const toast = useToast();

  // Export panel state
  const [showExport, setShowExport] = useState(false);
  const [exportVendorId, setExportVendorId] = useState('');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportStatus, setExportStatus] = useState('all');
  const [downloading, setDownloading] = useState(false);

  // Get date range for API calls
  const { startDate, endDate } = getDateRange(dateRange);

  // Fetch commissions with filters
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-vendor-commissions', statusFilter, dateRange, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        type: 'vendor',
      });
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await api.get(`/admin/commissions?${params}`);
      return response.data.data;
    },
  });

  // Fetch summary stats with date range
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['vendor-commission-stats', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({ type: 'vendor' });
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const response = await api.get(`/admin/commissions/stats?${params}`);
      return response.data.data;
    },
  });

  // Fetch vendor list for export dropdown
  const { data: vendorsData } = useQuery({
    queryKey: ['admin-vendors-list'],
    queryFn: async () => {
      const response = await api.get('/admin/vendors?limit=200');
      return response.data.data;
    },
    enabled: showExport,
  });

  // Approve commission mutation
  const approveCommissionMutation = useMutation({
    mutationFn: async (commissionId) => {
      const response = await api.put(`/admin/commissions/${commissionId}/approve`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vendor-commissions'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-commission-stats'] });
      toast.success('Commission approved!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to approve commission');
    },
  });

  // Pay commission mutation
  const payCommissionMutation = useMutation({
    mutationFn: async (commissionId) => {
      const response = await api.put(`/admin/commissions/${commissionId}/pay`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vendor-commissions'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-commission-stats'] });
      toast.success('Commission paid via Razorpay!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to pay commission');
    },
  });

  // Reject commission mutation
  const rejectCommissionMutation = useMutation({
    mutationFn: async (commissionId) => {
      const response = await api.put(`/admin/commissions/${commissionId}/reject`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vendor-commissions'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-commission-stats'] });
      toast.success('Commission rejected');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to reject commission');
    },
  });

  // Bulk approve commissions mutation
  const bulkApproveMutation = useMutation({
    mutationFn: async (commissionIds) => {
      const response = await api.post('/admin/commissions/bulk-approve', {
        commissionIds,
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-vendor-commissions'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-commission-stats'] });
      toast.success(`${data.data.count} commissions approved!`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to approve commissions');
    },
  });

  // Bulk pay commissions mutation (batch payout)
  const bulkPayMutation = useMutation({
    mutationFn: async (commissionIds) => {
      const response = await api.post('/admin/commissions/bulk-pay', {
        commissionIds,
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-vendor-commissions'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-commission-stats'] });
      toast.success(`Batch payout processed! ${data.data?.success?.length || 0} payouts successful`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to process batch payout');
    },
  });

  // Quick export current page to CSV
  const handleExportCSV = () => {
    const csvData = [
      ['Vendor', 'Order ID', 'Product', 'Amount', 'Rate', 'Status', 'Date', 'Paid Date'].join(','),
      ...(data?.commissions || []).map(comm => [
        comm.subjectId?.storeName || 'N/A',
        comm.orderId?.orderId || 'N/A',
        comm.productId?.title || 'N/A',
        comm.amount.toFixed(2),
        comm.percentage + '%',
        comm.status,
        new Date(comm.createdAt).toLocaleDateString(),
        comm.paidAt ? new Date(comm.paidAt).toLocaleDateString() : 'N/A',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vendor-commissions-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully!');
  };

  // Download vendor-specific report from backend
  const handleDownloadReport = async () => {
    setDownloading(true);
    try {
      const params = new URLSearchParams();
      if (exportVendorId) params.set('vendorId', exportVendorId);
      if (exportStartDate) params.set('startDate', exportStartDate);
      if (exportEndDate) params.set('endDate', exportEndDate);
      if (exportStatus !== 'all') params.set('status', exportStatus);

      const response = await api.get(`/admin/commissions/export?${params.toString()}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      const selectedVendor = vendorsList.find(v => v._id === exportVendorId);
      const vendorLabel = selectedVendor ? (selectedVendor.storeName || 'vendor').replace(/\s+/g, '-') : 'all-vendors';
      link.setAttribute('download', `commissions_${vendorLabel}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Report downloaded!');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download report. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  // Approve all pending commissions
  const handleApproveAllPending = () => {
    if (window.confirm('Are you sure you want to approve all pending commissions?')) {
      const pendingIds = data?.commissions
        ?.filter(c => c.status === 'pending')
        ?.map(c => c._id) || [];

      if (pendingIds.length > 0) {
        bulkApproveMutation.mutate(pendingIds);
      } else {
        toast.info('No pending commissions to approve');
      }
    }
  };

  // Pay all approved commissions (batch payout)
  const handlePayAllApproved = () => {
    const approvedIds = data?.commissions
      ?.filter(c => c.status === 'approved')
      ?.map(c => c._id) || [];

    if (approvedIds.length === 0) {
      toast.info('No approved commissions to pay');
      return;
    }

    if (window.confirm(`Process batch payout for ${approvedIds.length} approved commissions via Razorpay?`)) {
      bulkPayMutation.mutate(approvedIds);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-blue-100 text-gray-900 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'approved': return <Check className="w-4 h-4" />;
      case 'paid': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <AlertCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const vendorsList = vendorsData?.vendors || vendorsData || [];

  // Calculate max for progress bars
  const maxVendorAmount = Math.max(...(stats?.topVendors?.map(v => v.totalAmount) || [1]));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-700">Loading commissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Vendor Commissions</h1>
          <p className="text-gray-700">Manage vendor commissions and payouts</p>
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExport(!showExport)}
          >
            <Download className="w-4 h-4 mr-2" />
            {showExport ? 'Close Report' : 'Download Report'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleApproveAllPending}
            disabled={bulkApproveMutation.isPending}
          >
            <Check className="w-4 h-4 mr-2" />
            Approve All Pending
          </Button>
        </div>
      </div>

      {/* Export Panel */}
      {showExport && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-800 text-lg">Download Vendor Commission Report</h3>
          </div>

          {/* Vendor Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Vendor</label>
            <select
              value={exportVendorId}
              onChange={(e) => setExportVendorId(e.target.value)}
              className="w-full sm:w-80 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Vendors</option>
              {vendorsList.map((vendor) => (
                <option key={vendor._id} value={vendor._id}>
                  {vendor.storeName || vendor.userId?.name || 'Unknown Vendor'}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Date Range + Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
              <input
                type="date"
                value={exportStartDate}
                onChange={(e) => setExportStartDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
              <input
                type="date"
                value={exportEndDate}
                onChange={(e) => setExportEndDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select
                value={exportStatus}
                onChange={(e) => setExportStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {exportVendorId
                ? `Vendor: ${vendorsList.find(v => v._id === exportVendorId)?.storeName || 'Selected'}`
                : 'All vendors'}
              {' | '}
              {!exportStartDate && !exportEndDate
                ? 'All time'
                : `${exportStartDate || 'Start'} to ${exportEndDate || 'Present'}`}
            </p>
            <button
              onClick={handleDownloadReport}
              disabled={downloading}
              className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              {downloading ? 'Downloading...' : 'Download CSV'}
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards Row 1 - Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-gray-700 text-sm font-medium mb-1">Total Commissions</h3>
          <p className="text-3xl font-bold text-gray-900">
            {formatCurrency(stats?.totalAmount || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {dateRange === 'all' ? 'All time' : `Last ${dateRange} days`}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <h3 className="text-gray-700 text-sm font-medium mb-1">Pending Approval</h3>
          <p className="text-3xl font-bold text-yellow-600">
            {formatCurrency(stats?.pendingAmount || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-2">{stats?.pendingCount || 0} commissions</p>
        </div>

        {/* Ready to Pay (Approved) - Reserve System */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl shadow-sm p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            {(stats?.approvedCount || 0) > 0 && (
              <Button
                variant="outline"
                size="xs"
                onClick={handlePayAllApproved}
                disabled={bulkPayMutation.isPending}
                className="border-white/50 text-white hover:bg-white/20 text-xs"
              >
                <Banknote className="w-3 h-3 mr-1" />
                Pay All
              </Button>
            )}
          </div>
          <h3 className="text-blue-100 text-sm font-medium mb-1">Ready to Pay</h3>
          <p className="text-3xl font-bold">
            {formatCurrency(stats?.approvedAmount || 0)}
          </p>
          <p className="text-xs text-blue-200 mt-2">{stats?.approvedCount || 0} approved, awaiting payout</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-gray-700 text-sm font-medium mb-1">Paid Out</h3>
          <p className="text-3xl font-bold text-green-600">
            {formatCurrency(stats?.paidAmount || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-2">{stats?.paidCount || 0} commissions</p>
        </div>
      </div>

      {/* Commission Breakdown by Vendor */}
      {stats?.topVendors && stats.topVendors.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-800">Top Vendors by Commission</h3>
            </div>
            <span className="text-xs text-gray-500">
              {dateRange === 'all' ? 'All time' : `Last ${dateRange} days`}
            </span>
          </div>
          <div className="space-y-3">
            {stats.topVendors.map((vendor, idx) => (
              <div key={vendor._id} className="flex items-center gap-4">
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {vendor.storeName || 'Unknown Vendor'}
                    </span>
                    <span className="text-sm font-bold text-gray-900">
                      {formatCurrency(vendor.totalAmount)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${(vendor.totalAmount / maxVendorAmount) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{vendor.count} commissions</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters Row */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Date Range Filter */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <CustomSelect
              value={dateRange}
              onChange={(value) => {
                setDateRange(value);
                setPage(1);
              }}
              options={DATE_RANGE_OPTIONS}
              placeholder="Select period"
              className="w-40"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <div className="flex gap-2 flex-wrap">
              {['all', 'pending', 'approved', 'paid', 'cancelled'].map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setStatusFilter(status);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === status
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Commissions Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider w-[200px]">
                  Vendor
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider w-[120px]">
                  Order
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider w-[100px]">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider w-[60px]">
                  Rate
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider w-[100px]">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider w-[100px]">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider w-[180px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data?.commissions?.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                    No commissions found for the selected period
                  </td>
                </tr>
              ) : (
                data?.commissions?.map((commission) => (
                  <tr key={commission._id} className={`transition-colors hover:bg-gray-50 ${getPendingItemClasses(commission.status)}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 truncate text-sm">
                              {commission.subjectId?.storeName || commission.subjectId?.userId?.name || 'Unknown'}
                            </p>
                          </div>
                          <p className="text-xs text-gray-500 truncate">ID: {commission._id.slice(-8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-gray-700">
                        {commission.orderId?.orderId || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900 truncate max-w-[150px]" title={commission.productId?.title}>
                        {commission.productId?.title || 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-green-600 text-sm">
                        {formatCurrency(commission.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700">
                        {commission.percentage}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(commission.status)}`}>
                        {getStatusIcon(commission.status)}
                        {commission.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-gray-700">
                        {new Date(commission.createdAt).toLocaleDateString()}
                      </div>
                      {commission.paidAt && (
                        <p className="text-xs text-green-600">
                          Paid: {new Date(commission.paidAt).toLocaleDateString()}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        {commission.status === 'pending' && (
                          <>
                            <Button
                              variant="success"
                              size="xs"
                              onClick={() => approveCommissionMutation.mutate(commission._id)}
                              disabled={approveCommissionMutation.isPending}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="danger"
                              size="xs"
                              onClick={() => {
                                if (window.confirm('Are you sure you want to reject this commission?')) {
                                  rejectCommissionMutation.mutate(commission._id);
                                }
                              }}
                              disabled={rejectCommissionMutation.isPending}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {commission.status === 'approved' && (
                          <Button
                            variant="primary"
                            size="xs"
                            onClick={() => payCommissionMutation.mutate(commission._id)}
                            disabled={payCommissionMutation.isPending}
                          >
                            <DollarSign className="w-3 h-3 mr-1" />
                            Pay
                          </Button>
                        )}
                        {commission.status === 'paid' && (
                          <span className="text-green-600 text-xs font-medium flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" /> Paid
                          </span>
                        )}
                        {commission.status === 'cancelled' && (
                          <span className="text-red-600 text-xs font-medium flex items-center gap-1">
                            <X className="w-4 h-4" /> Cancelled
                          </span>
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
        {data?.meta?.pages > 1 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-700">
                Showing page {data.meta.page} of {data.meta.pages} ({data.meta.total} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= data.meta.pages}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorCommissions;
