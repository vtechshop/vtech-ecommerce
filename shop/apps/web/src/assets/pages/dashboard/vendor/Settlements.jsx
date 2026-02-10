// FILE: apps/web/src/pages/dashboard/vendor/Settlements.jsx
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Info, HelpCircle, DollarSign, CheckCircle, Download, Calendar, LinkIcon, AlertCircle, Loader2, ExternalLink, Shield, Wallet, Clock, TrendingUp, ArrowUpRight, ArrowDownRight, Filter, Search, X, ChevronRight, CreditCard, Receipt, RefreshCcw, Banknote, RefreshCw } from 'lucide-react';
import api from '@/utils/api';
import Pagination from '@/components/common/Pagination';
import Spinner from '@/components/common/Spinner';
import { formatCurrency, formatDate } from '@/utils/format';

const DATE_PRESETS = [
  { label: 'Last 7 Days', days: 7 },
  { label: 'Last 30 Days', days: 30 },
  { label: 'Last 90 Days', days: 90 },
  { label: 'This Month', days: 'month' },
  { label: 'All Time', days: null },
];

const getPresetDates = (days) => {
  if (!days) return { startDate: '', endDate: '' };
  const end = new Date();
  const start = new Date();
  if (days === 'month') {
    start.setDate(1);
  } else {
    start.setDate(start.getDate() - days);
  }
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
};

const STATUS_BADGE = {
  not_connected: { bg: 'bg-gray-100 text-gray-700', label: 'Not Connected' },
  created: { bg: 'bg-yellow-100 text-yellow-800', label: 'Pending Verification' },
  under_review: { bg: 'bg-orange-100 text-orange-800', label: 'Under Review' },
  activated: { bg: 'bg-green-100 text-green-800', label: 'Active' },
  suspended: { bg: 'bg-red-100 text-red-800', label: 'Suspended' },
};

// Transaction type configs
const TRANSACTION_TYPES = {
  order: { label: 'Order Payment', icon: Receipt, color: 'text-green-600 bg-green-50' },
  refund: { label: 'Refund', icon: RefreshCcw, color: 'text-red-600 bg-red-50' },
  payout: { label: 'Bank Transfer', icon: Banknote, color: 'text-blue-600 bg-blue-50' },
  fee: { label: 'Platform Fee', icon: CreditCard, color: 'text-orange-600 bg-orange-50' },
};

const RazorpayOnboarding = () => {
  const queryClient = useQueryClient();
  const [connectForm, setConnectForm] = useState({ email: '', phone: '', contactName: '' });

  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ['razorpay-status'],
    queryFn: async () => {
      const res = await api.get('/vendors/razorpay/status');
      return res.data.data;
    },
  });

  const connectMutation = useMutation({
    mutationFn: async (formData) => {
      const res = await api.post('/vendors/razorpay/connect', formData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['razorpay-status'] });
    },
  });

  if (statusLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          <span className="text-gray-500 text-sm">Loading Razorpay status...</span>
        </div>
      </div>
    );
  }

  const isConnected = statusData?.connected;
  const status = statusData?.accountStatus || 'not_connected';
  const badge = STATUS_BADGE[status] || STATUS_BADGE.not_connected;

  // Already connected and activated - compact view
  if (isConnected && status === 'activated') {
    return (
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-green-900">Razorpay Connected</span>
            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${badge.bg}`}>
              {badge.label}
            </span>
          </div>
          <div className="flex-1 flex flex-wrap items-center gap-3 text-sm text-green-800">
            <span className="font-mono bg-green-100 px-2 py-0.5 rounded">{statusData.accountId}</span>
            <span>Settlement: <strong>{statusData.settlementPercentage || 85}%</strong></span>
          </div>
        </div>
      </div>
    );
  }

  // Connected but pending verification - compact
  if (isConnected && status !== 'activated') {
    return (
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 mb-4 sm:mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-yellow-900">Razorpay Pending</span>
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${badge.bg}`}>
                {badge.label}
              </span>
            </div>
            <p className="text-sm text-yellow-800">
              {status === 'suspended' ? 'Account suspended. Contact support.' : 'Verification in progress. Check email for updates.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Not connected - show connect form
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 sm:p-5 mb-4 sm:mb-6">
      <div className="flex items-start gap-3">
        <LinkIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-blue-900 mb-1">Connect Razorpay Route</h3>
          <p className="text-sm text-blue-800 mb-3">
            Connect your Razorpay account to receive automatic payment splits directly to your bank. No more waiting for manual payouts!
          </p>

          <div className="bg-white rounded-lg border border-blue-200 p-3 sm:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={connectForm.email}
                  onChange={(e) => setConnectForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Phone *</label>
                <input
                  type="tel"
                  value={connectForm.phone}
                  onChange={(e) => setConnectForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="9876543210"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Contact Name *</label>
                <input
                  type="text"
                  value={connectForm.contactName}
                  onChange={(e) => setConnectForm(f => ({ ...f, contactName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="Full Name"
                />
              </div>
            </div>

            {connectMutation.isError && (
              <div className="bg-red-50 border border-red-200 rounded p-2 mb-3 text-sm text-red-700">
                {connectMutation.error?.response?.data?.error?.message || 'Failed to connect account'}
              </div>
            )}

            <button
              onClick={() => connectMutation.mutate(connectForm)}
              disabled={connectMutation.isPending || !connectForm.email || !connectForm.phone || !connectForm.contactName}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {connectMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</>
              ) : (
                <><LinkIcon className="w-4 h-4" /> Connect Razorpay Account</>
              )}
            </button>
          </div>

          <p className="mt-2 text-xs text-blue-700">
            <strong>Note:</strong> Your KYC must be approved before connecting. Razorpay will verify your business details after connection.
          </p>
        </div>
      </div>
    </div>
  );
};

const Settlements = () => {
  const [page, setPage] = useState(1);
  const [showExport, setShowExport] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportStatus, setExportStatus] = useState('all');
  const [downloading, setDownloading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  // Fetch stats from backend
  const { data: statsData } = useQuery({
    queryKey: ['settlement-stats'],
    queryFn: async () => {
      const response = await api.get('/vendors/settlements/stats');
      return response.data.data;
    },
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['settlements', page],
    queryFn: async () => {
      const response = await api.get(`/vendors/settlements?page=${page}&limit=20`);
      return response.data;
    },
  });

  const handlePreset = (days) => {
    const { startDate, endDate } = getPresetDates(days);
    setExportStartDate(startDate);
    setExportEndDate(endDate);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const params = new URLSearchParams();
      if (exportStartDate) params.set('startDate', exportStartDate);
      if (exportEndDate) params.set('endDate', exportEndDate);
      if (exportStatus !== 'all') params.set('status', exportStatus);

      const response = await api.get(`/vendors/settlements/export?${params.toString()}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `settlements_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download report. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  // Use backend stats and filter current page data
  const stats = useMemo(() => ({
    pending: statsData?.pending?.total || 0,
    approved: statsData?.approved?.total || 0,
    paid: statsData?.paid?.total || 0,
    pendingCount: statsData?.pending?.count || 0,
    approvedCount: statsData?.approved?.count || 0,
    paidCount: statsData?.paid?.count || 0,
    total: statsData?.lifetime?.totalEarnings || 0,
    availableBalance: statsData?.availableBalance || 0,
  }), [statsData]);

  // Filter settlements on current page
  const { settlements, filteredSettlements } = useMemo(() => {
    const allSettlements = data?.data || [];
    let filtered = [...allSettlements];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.orderId?.orderId?.toLowerCase().includes(query) ||
        s._id?.toLowerCase().includes(query)
      );
    }

    return { settlements: allSettlements, filteredSettlements: filtered };
  }, [data, statusFilter, searchQuery]);

  const totalPages = Math.ceil((data?.meta?.total || 0) / 20);

  const getTransferBadge = (transfer) => {
    if (!transfer?.transferId) return null;
    const badges = {
      processed: 'bg-green-100 text-green-800 border-green-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      created: 'bg-blue-100 text-blue-800 border-blue-200',
      failed: 'bg-red-100 text-red-800 border-red-200',
      reversed: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return badges[transfer.status] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getStatusBadge = (status) => {
    const badges = {
      paid: { bg: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
      approved: { bg: 'bg-blue-100 text-blue-800 border-blue-200', icon: TrendingUp },
      pending: { bg: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
      cancelled: { bg: 'bg-red-100 text-red-800 border-red-200', icon: X },
    };
    return badges[status] || badges.pending;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Payments & Settlements</h1>
        <div className="flex items-center gap-2">
          <button onClick={refetch} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowExport(!showExport)}
            className="flex items-center gap-1.5 px-3 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download Report</span>
          </button>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">How Commissions Work</span>
          </button>
        </div>
      </div>

      {/* Razorpay Onboarding Section */}
      <RazorpayOnboarding />

      {/* Commission Help Panel */}
      {showHelp && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 sm:p-5 mb-4 sm:mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Understanding Your Commissions
                </h3>
                <button onClick={() => setShowHelp(false)} className="text-blue-600 hover:text-blue-800">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm text-blue-800 mb-3">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                  <span><strong>85%</strong> You earn</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-yellow-600" />
                  <span>Created on order</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                  <span>Approved on delivery</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5 text-blue-600" />
                  <span>Paid to bank</span>
                </div>
              </div>
              <div className="bg-white border border-blue-200 rounded p-2.5 text-sm">
                <span className="text-blue-900">Example:</span>{' '}
                ₹5,000 × 2 = ₹10,000 →
                <span className="text-red-600 font-medium"> -₹1,500 (15%)</span> →
                <span className="text-green-600 font-bold"> ₹8,500 earned</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Panel */}
      {showExport && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 sm:p-5 mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-600" />
              Download Report
            </h3>
            <button onClick={() => setShowExport(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap gap-2 mb-3">
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handlePreset(preset.days)}
                className="px-3 py-1.5 text-xs font-medium rounded-full border border-gray-300 bg-gray-50 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
              <input
                type="date"
                value={exportStartDate}
                onChange={(e) => setExportStartDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
              <input
                type="date"
                value={exportEndDate}
                onChange={(e) => setExportEndDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select
                value={exportStatus}
                onChange={(e) => setExportStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {downloading ? 'Downloading...' : 'Download'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Balance Cards - Amazon Style */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
        {/* Available Balance */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-3 sm:p-4 text-white col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-green-100 text-xs sm:text-sm">Available Balance</span>
            <Wallet className="w-5 h-5 text-green-200" />
          </div>
          <p className="text-xl sm:text-2xl font-bold">{formatCurrency(stats.approved)}</p>
          <p className="text-xs text-green-200 mt-1">Ready for transfer</p>
        </div>

        {/* Pending */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
          className={`bg-white rounded-lg border p-3 sm:p-4 cursor-pointer transition-all hover:shadow-md ${
            statusFilter === 'pending' ? 'border-yellow-400 ring-1 ring-yellow-400' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs sm:text-sm text-gray-500">Pending</span>
            <Clock className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-yellow-600">{formatCurrency(stats.pending)}</p>
          <p className="text-xs text-gray-400 mt-1">{stats.pendingCount} transactions</p>
        </div>

        {/* Approved */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'approved' ? 'all' : 'approved')}
          className={`bg-white rounded-lg border p-3 sm:p-4 cursor-pointer transition-all hover:shadow-md ${
            statusFilter === 'approved' ? 'border-blue-400 ring-1 ring-blue-400' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs sm:text-sm text-gray-500">Approved</span>
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-blue-600">{formatCurrency(stats.approved)}</p>
          <p className="text-xs text-gray-400 mt-1">{stats.approvedCount} transactions</p>
        </div>

        {/* Paid */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'paid' ? 'all' : 'paid')}
          className={`bg-white rounded-lg border p-3 sm:p-4 cursor-pointer transition-all hover:shadow-md ${
            statusFilter === 'paid' ? 'border-green-400 ring-1 ring-green-400' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs sm:text-sm text-gray-500">Paid Out</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-green-600">{formatCurrency(stats.paid)}</p>
          <p className="text-xs text-gray-400 mt-1">{stats.paidCount} transactions</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Order ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10 w-full text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status Filter Tabs */}
          <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
            {[
              { value: 'all', label: 'All' },
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'paid', label: 'Paid' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  statusFilter === tab.value ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {(searchQuery || statusFilter !== 'all') && (
          <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs sm:text-sm text-gray-500">
              Showing {filteredSettlements.length} of {settlements.length} transactions
            </p>
            <button
              onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
              className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 font-medium"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="block lg:hidden space-y-3">
        {filteredSettlements.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <Receipt className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="font-medium text-gray-500">No transactions found</p>
            <p className="text-sm text-gray-400 mt-1">
              {searchQuery || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Commissions will appear here after your first sale'}
            </p>
          </div>
        ) : (
          filteredSettlements.map((settlement) => {
            const statusBadge = getStatusBadge(settlement.status);
            const StatusIcon = statusBadge.icon;

            return (
              <div key={settlement._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-mono text-sm text-gray-700">{settlement.orderId?.orderId || 'N/A'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{formatDate(settlement.createdAt)}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border ${statusBadge.bg}`}>
                    <StatusIcon className="w-3 h-3" />
                    {settlement.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center border-t border-gray-100 pt-3">
                  <div>
                    <p className="text-xs text-gray-500">Earnings</p>
                    <p className="font-bold text-green-600">{formatCurrency(settlement.amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Platform Fee</p>
                    <p className="font-medium text-red-600">{settlement.percentage}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Transfer</p>
                    {settlement.transfer?.transferId ? (
                      <span className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded border ${getTransferBadge(settlement.transfer)}`}>
                        {settlement.transfer.status}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Manual</span>
                    )}
                  </div>
                </div>

                {settlement.paidAt && (
                  <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
                    Paid: {formatDate(settlement.paidAt)}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-blue-100 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-sm">Order ID</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Date</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Your Earnings</th>
                <th className="text-center py-3 px-4 font-semibold text-sm">Platform Fee</th>
                <th className="text-center py-3 px-4 font-semibold text-sm">Status</th>
                <th className="text-center py-3 px-4 font-semibold text-sm">Transfer</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Paid Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredSettlements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    <Receipt className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="font-medium">No transactions found</p>
                    <p className="text-sm mt-1">
                      {searchQuery || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Commissions will appear here after your first sale'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSettlements.map((settlement) => {
                  const statusBadge = getStatusBadge(settlement.status);
                  const StatusIcon = statusBadge.icon;

                  return (
                    <tr key={settlement._id} className="border-b last:border-b-0 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-mono text-sm text-gray-700">
                        {settlement.orderId?.orderId || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{formatDate(settlement.createdAt)}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-green-700">{formatCurrency(settlement.amount)}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-sm text-red-600 font-medium">{settlement.percentage}%</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full border ${statusBadge.bg}`}>
                          <StatusIcon className="w-3 h-3" />
                          {settlement.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {settlement.transfer?.transferId ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full border ${getTransferBadge(settlement.transfer)}`}>
                              {settlement.transfer.status}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {settlement.transfer.transferId.slice(0, 12)}...
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Manual</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {settlement.paidAt ? formatDate(settlement.paidAt) : '-'}
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
        <div className="mt-4 sm:mt-6">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
};

export default Settlements;
