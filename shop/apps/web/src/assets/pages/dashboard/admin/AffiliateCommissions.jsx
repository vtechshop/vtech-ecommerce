// FILE: apps/web/src/pages/dashboard/admin/AffiliateCommissions.jsx
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import { formatCurrency } from '@/utils/format';
import Button from '@/components/common/Button';
import CustomSelect from '@/components/common/CustomSelect';
import {
  DollarSign, User, ShoppingCart, Calendar,
  Check, Clock, Filter, Download, RefreshCw,
  Users, CheckCircle, AlertCircle, Wallet,
  Banknote, PieChart, Award, Target,
  Building2, Smartphone, Upload, Copy, X,
  CreditCard, IndianRupee, ExternalLink
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

const PAYMENT_METHODS = [
  { value: 'upi', label: 'UPI', icon: Smartphone, color: 'purple' },
  { value: 'neft', label: 'NEFT', icon: Building2, color: 'blue' },
  { value: 'imps', label: 'IMPS', icon: CreditCard, color: 'green' },
  { value: 'rtgs', label: 'RTGS', icon: IndianRupee, color: 'orange' },
  { value: 'cash', label: 'Cash', icon: IndianRupee, color: 'gray' },
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

const CopyButton = ({ text, label }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  };
  return (
    <button onClick={handleCopy} className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors" title={`Copy ${label}`}>
      {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
};

const UpiQrCode = ({ upiId, amount, name }) => {
  if (!upiId) return null;
  const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name || 'Affiliate')}&am=${amount}&cu=INR`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUrl)}`;
  return (
    <div className="flex flex-col items-center gap-2">
      <img src={qrUrl} alt="UPI QR Code" className="w-40 h-40 rounded-lg border border-gray-200" />
      <p className="text-xs text-gray-500">Scan with any UPI app</p>
      <a href={upiUrl} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors">
        <ExternalLink className="w-3 h-3" /> Open UPI App
      </a>
    </div>
  );
};

// Performance tier based on conversions
const getPerformanceTier = (conversions) => {
  if (conversions >= 100) return { tier: 'Platinum', color: 'bg-purple-100 text-purple-800', icon: '💎' };
  if (conversions >= 50) return { tier: 'Gold', color: 'bg-yellow-100 text-yellow-800', icon: '🥇' };
  if (conversions >= 20) return { tier: 'Silver', color: 'bg-gray-200 text-gray-800', icon: '🥈' };
  return { tier: 'Bronze', color: 'bg-orange-100 text-orange-800', icon: '🥉' };
};

const AffiliateCommissions = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('30');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const toast = useToast();

  // Payout modal state
  const [selectedAffiliatePayout, setSelectedAffiliatePayout] = useState(null);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [paymentStep, setPaymentStep] = useState('method');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentProof, setPaymentProof] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const { startDate, endDate } = getDateRange(dateRange);

  // Fetch commissions with filters
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-affiliate-commissions', statusFilter, dateRange, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        type: 'affiliate',
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
    queryKey: ['affiliate-commission-stats', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({ type: 'affiliate' });
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const response = await api.get(`/admin/commissions/stats?${params}`);
      return response.data.data;
    },
  });

  // Fetch affiliates list (for bank details in payout modal)
  const { data: affiliatesData } = useQuery({
    queryKey: ['admin-affiliates-list'],
    queryFn: async () => {
      const response = await api.get('/admin/affiliates');
      return response.data.data;
    },
  });

  // Record affiliate payout mutation
  const markPaidMutation = useMutation({
    mutationFn: async ({ affiliateId, amount, reference, paymentMethod: method, paymentProof: proof }) => {
      const response = await api.post(`/admin/affiliates/${affiliateId}/payout`, {
        amount, reference, paymentMethod: method, paymentProof: proof,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-affiliate-commissions'] });
      queryClient.invalidateQueries({ queryKey: ['affiliate-commission-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-affiliates-list'] });
      toast.success('Payout recorded successfully!');
      closePayoutModal();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to record payout');
    },
  });

  // Export commissions to CSV
  const handleExportCSV = () => {
    const csvData = [
      ['Affiliate', 'Code', 'Order ID', 'Amount', 'Rate', 'Status', 'Date', 'Paid Date'].join(','),
      ...(data?.commissions || []).map(comm => [
        comm.subjectId?.userId?.name || 'N/A',
        comm.subjectId?.code || 'N/A',
        comm.orderId?.orderId || 'N/A',
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
    link.download = `affiliate-commissions-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully!');
  };

  // Payout modal helpers
  const openPayoutModal = (affiliateId) => {
    const affiliates = affiliatesData || [];
    const affiliate = affiliates.find(a => a._id === affiliateId);
    if (!affiliate) {
      toast.error('Affiliate details not found');
      return;
    }
    if (!affiliate.pendingEarnings || affiliate.pendingEarnings <= 0) {
      toast.error('No pending earnings for this affiliate');
      return;
    }
    setSelectedAffiliatePayout(affiliate);
    setPayoutAmount(affiliate.pendingEarnings?.toFixed(2) || '0');
    setShowPayoutModal(true);
    setPaymentStep('method');
    setPaymentMethod('');
    setPaymentRef('');
    setPaymentProof(null);
  };

  const closePayoutModal = () => {
    setShowPayoutModal(false);
    setSelectedAffiliatePayout(null);
    setPayoutAmount('');
    setPaymentStep('method');
    setPaymentMethod('');
    setPaymentRef('');
    setPaymentProof(null);
  };

  const handleSubmitPayout = () => {
    if (!paymentRef.trim()) {
      toast.error('Please enter the UTR / Transaction ID');
      return;
    }
    if (!paymentMethod) {
      toast.error('Please select a payment method');
      return;
    }
    if (!payoutAmount || parseFloat(payoutAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    markPaidMutation.mutate({
      affiliateId: selectedAffiliatePayout._id,
      amount: parseFloat(payoutAmount),
      reference: paymentRef.trim(),
      paymentMethod,
      paymentProof,
    });
  };

  const handleUploadProof = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/upload/single', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setPaymentProof(res.data.data?.url || res.data.data?.path || res.data.url);
      toast.success('Payment proof uploaded');
    } catch {
      toast.error('Failed to upload proof');
    } finally {
      setUploading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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

  // Calculate max for progress bars
  const maxAffiliateAmount = Math.max(...(stats?.topVendors?.map(v => v.totalAmount) || [1]));

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
          <h1 className="text-3xl font-bold mb-2">Affiliate Commissions</h1>
          <p className="text-gray-700">Manage affiliate commissions and payouts</p>
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
            onClick={handleExportCSV}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
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

        {/* Ready to Pay (Approved) */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl shadow-sm p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            {(stats?.approvedCount || 0) > 0 && (
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                {stats.approvedCount} awaiting
              </span>
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

      {/* Top Affiliates Breakdown */}
      {stats?.topVendors && stats.topVendors.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-800">Top Affiliates by Commission</h3>
            </div>
            <span className="text-xs text-gray-500">
              {dateRange === 'all' ? 'All time' : `Last ${dateRange} days`}
            </span>
          </div>
          <div className="space-y-3">
            {stats.topVendors.map((affiliate, idx) => (
              <div key={affiliate._id} className="flex items-center gap-4">
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {affiliate.storeName || 'Unknown Affiliate'}
                    </span>
                    <span className="text-sm font-bold text-gray-900">
                      {formatCurrency(affiliate.totalAmount)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-500"
                      style={{ width: `${(affiliate.totalAmount / maxAffiliateAmount) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{affiliate.count} commissions</p>
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
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                  Affiliate
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                  Order
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                  Rate
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data?.commissions?.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                    No commissions found for the selected period
                  </td>
                </tr>
              ) : (
                data?.commissions?.map((commission) => {
                  const affiliate = commission.subjectId;
                  const perfTier = getPerformanceTier(affiliate?.totalConversions || 0);

                  return (
                    <tr key={commission._id} className={`transition-colors hover:bg-gray-50 ${getPendingItemClasses(commission.status)}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            commission.status === 'pending' ? 'bg-yellow-100' : 'bg-purple-100'
                          }`}>
                            <span className={`text-xs font-bold ${
                              commission.status === 'pending' ? 'text-yellow-700' : 'text-purple-700'
                            }`}>
                              {affiliate?.userId?.name?.charAt(0)?.toUpperCase() || 'A'}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 text-sm">
                                {affiliate?.userId?.name || 'Unknown'}
                              </p>
                              {affiliate?.totalConversions > 0 && (
                                <span className={`text-xs px-1.5 py-0.5 rounded ${perfTier.color}`}>
                                  {perfTier.icon}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 font-mono">
                              {affiliate?.code || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ShoppingCart className="w-4 h-4 text-gray-400" />
                          <span className="text-xs font-mono text-gray-700">
                            {commission.orderId?.orderId || 'N/A'}
                          </span>
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
                        {commission.status === 'approved' && (
                          <Button
                            variant="primary"
                            size="xs"
                            onClick={() => openPayoutModal(commission.subjectId?._id)}
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
                        {commission.status === 'pending' && (
                          <span className="text-yellow-600 text-xs font-medium flex items-center gap-1">
                            <Clock className="w-4 h-4" /> Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
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

      {/* ============ PAYOUT MODAL ============ */}
      {showPayoutModal && selectedAffiliatePayout && (() => {
        const bank = selectedAffiliatePayout.paymentDetails || selectedAffiliatePayout.bankDetails;
        const netAmount = parseFloat(payoutAmount || 0) * 0.98;
        const copyAllBankDetails = () => {
          const lines = [];
          if (bank?.accountHolderName) lines.push(`Name: ${bank.accountHolderName}`);
          if (bank?.bankName) lines.push(`Bank: ${bank.bankName}`);
          if (bank?.accountNumber) lines.push(`A/C: ${bank.accountNumber}`);
          if (bank?.ifscCode) lines.push(`IFSC: ${bank.ifscCode}`);
          lines.push(`Amount: ${netAmount.toFixed(2)}`);
          navigator.clipboard.writeText(lines.join('\n'));
          toast.success('Bank details copied!');
        };
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl z-10">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {paymentStep === 'method' ? 'Pay Affiliate' : paymentStep === 'pay' ? 'Make Payment' : 'Confirm Payment'}
                  </h2>
                  <p className="text-sm text-gray-500">{selectedAffiliatePayout.userId?.name} ({selectedAffiliatePayout.code})</p>
                </div>
                <button onClick={closePayoutModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Step Indicator */}
              <div className="px-6 pt-4">
                <div className="flex items-center gap-2 mb-6">
                  {['method', 'pay', 'record'].map((step, i) => (
                    <div key={step} className="flex items-center gap-2 flex-1">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        paymentStep === step ? 'bg-blue-600 text-white' :
                        ['method', 'pay', 'record'].indexOf(paymentStep) > i ? 'bg-green-500 text-white' :
                        'bg-gray-200 text-gray-500'
                      }`}>{['method', 'pay', 'record'].indexOf(paymentStep) > i ? '✓' : i + 1}</div>
                      <span className={`text-xs font-medium hidden sm:block ${paymentStep === step ? 'text-blue-600' : 'text-gray-400'}`}>
                        {step === 'method' ? 'Method' : step === 'pay' ? 'Pay' : 'Confirm'}
                      </span>
                      {i < 2 && <div className="flex-1 h-0.5 bg-gray-200 rounded" />}
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-6 pb-6">
                {/* ====== STEP 1: Choose Payment Method ====== */}
                {paymentStep === 'method' && (
                  <>
                    {/* Payout Amount */}
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Payout Amount</label>
                      <input type="number" step="0.01" value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Enter amount" />
                      {parseFloat(payoutAmount || 0) > 0 && (
                        <p className="text-xs text-gray-500 mt-1">TDS 2%: {formatCurrency(parseFloat(payoutAmount) * 0.02)} | Net: <span className="font-bold text-green-700">{formatCurrency(parseFloat(payoutAmount) * 0.98)}</span></p>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 mb-3">How do you want to pay?</p>
                    <div className="grid grid-cols-1 gap-3 mb-6">
                      {bank?.upiId && (
                        <button onClick={() => { setPaymentMethod('upi'); setPaymentStep('pay'); }}
                          disabled={!payoutAmount || parseFloat(payoutAmount) <= 0}
                          className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed">
                          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                            <Smartphone className="w-6 h-6 text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">UPI</p>
                            <p className="text-xs text-gray-500">Scan QR or open UPI app — {bank.upiId}</p>
                          </div>
                          <span className="text-purple-600 font-bold text-lg">&rarr;</span>
                        </button>
                      )}
                      {bank?.accountNumber && (
                        <>
                          <button onClick={() => { setPaymentMethod('neft'); setPaymentStep('pay'); }}
                            disabled={!payoutAmount || parseFloat(payoutAmount) <= 0}
                            className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                              <Building2 className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">NEFT</p>
                              <p className="text-xs text-gray-500">{bank.bankName || 'Bank Transfer'} — ****{bank.accountNumber.slice(-4)}</p>
                            </div>
                            <span className="text-blue-600 font-bold text-lg">&rarr;</span>
                          </button>
                          <button onClick={() => { setPaymentMethod('imps'); setPaymentStep('pay'); }}
                            disabled={!payoutAmount || parseFloat(payoutAmount) <= 0}
                            className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed">
                            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
                              <CreditCard className="w-6 h-6 text-green-600" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">IMPS</p>
                              <p className="text-xs text-gray-500">Instant transfer — {bank.bankName || 'Bank'}</p>
                            </div>
                            <span className="text-green-600 font-bold text-lg">&rarr;</span>
                          </button>
                        </>
                      )}
                      <button onClick={() => { setPaymentMethod('cash'); setPaymentStep('pay'); }}
                        disabled={!payoutAmount || parseFloat(payoutAmount) <= 0}
                        className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed">
                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                          <Banknote className="w-6 h-6 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">Cash</p>
                          <p className="text-xs text-gray-500">Hand cash or other method</p>
                        </div>
                        <span className="text-gray-600 font-bold text-lg">&rarr;</span>
                      </button>
                    </div>
                    {!bank?.upiId && !bank?.accountNumber && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                        <p className="text-sm text-red-700">No bank details found. Ask the affiliate to add bank/UPI details.</p>
                      </div>
                    )}
                    <Button onClick={closePayoutModal} variant="secondary" className="w-full">Cancel</Button>
                  </>
                )}

                {/* ====== STEP 2: Make Payment ====== */}
                {paymentStep === 'pay' && (
                  <>
                    {/* Amount Card */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-green-600 font-medium">Pay this amount (after 2% TDS)</p>
                          <p className="text-3xl font-bold text-green-700">{formatCurrency(netAmount)}</p>
                        </div>
                        <span className={`px-3 py-1.5 rounded-lg text-sm font-bold uppercase ${
                          paymentMethod === 'upi' ? 'bg-purple-100 text-purple-700' :
                          paymentMethod === 'neft' ? 'bg-blue-100 text-blue-700' :
                          paymentMethod === 'imps' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>{paymentMethod}</span>
                      </div>
                    </div>

                    {/* UPI Payment */}
                    {paymentMethod === 'upi' && bank?.upiId && (
                      <div className="space-y-4 mb-6">
                        <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 flex flex-col items-center gap-4">
                          <UpiQrCode upiId={bank.upiId} amount={netAmount} name={bank.accountHolderName || selectedAffiliatePayout.userId?.name} />
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                          <div>
                            <span className="text-xs text-gray-500">UPI ID</span>
                            <p className="text-sm font-mono font-semibold text-purple-700">{bank.upiId}</p>
                          </div>
                          <CopyButton text={bank.upiId} label="UPI ID" />
                        </div>
                      </div>
                    )}

                    {/* Bank Transfer (NEFT/IMPS) */}
                    {['neft', 'imps', 'rtgs'].includes(paymentMethod) && bank?.accountNumber && (
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                            <Building2 className="w-4 h-4" /> Transfer to this account
                          </h3>
                          <button onClick={copyAllBankDetails}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 transition-colors">
                            <Copy className="w-3 h-3" /> Copy All
                          </button>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                          {bank.accountHolderName && (
                            <div className="flex items-center justify-between">
                              <div><span className="text-xs text-gray-500">Account Holder</span><p className="text-sm font-medium text-gray-900">{bank.accountHolderName}</p></div>
                              <CopyButton text={bank.accountHolderName} label="Name" />
                            </div>
                          )}
                          {bank.bankName && (
                            <div className="flex items-center justify-between">
                              <div><span className="text-xs text-gray-500">Bank</span><p className="text-sm font-medium text-gray-900">{bank.bankName}</p></div>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <div><span className="text-xs text-gray-500">Account Number</span><p className="text-sm font-mono font-bold text-gray-900">{bank.accountNumber}</p></div>
                            <CopyButton text={bank.accountNumber} label="Account Number" />
                          </div>
                          {bank.ifscCode && (
                            <div className="flex items-center justify-between">
                              <div><span className="text-xs text-gray-500">IFSC Code</span><p className="text-sm font-mono font-bold text-gray-900">{bank.ifscCode}</p></div>
                              <CopyButton text={bank.ifscCode} label="IFSC" />
                            </div>
                          )}
                          <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                            <div><span className="text-xs text-gray-500">Amount</span><p className="text-sm font-bold text-green-700">{formatCurrency(netAmount)}</p></div>
                            <CopyButton text={String(netAmount.toFixed(2))} label="Amount" />
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-3 text-center">Open your bank app → {paymentMethod.toUpperCase()} Transfer → Paste these details → Send</p>
                      </div>
                    )}

                    {/* Cash */}
                    {paymentMethod === 'cash' && (
                      <div className="bg-gray-50 rounded-xl p-6 mb-6 text-center">
                        <Banknote className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-sm text-gray-700">Hand over <span className="font-bold text-green-700">{formatCurrency(netAmount)}</span> to the affiliate</p>
                        <p className="text-xs text-gray-500 mt-1">Take a photo of receipt if available</p>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button onClick={() => { setPaymentMethod(''); setPaymentStep('method'); }} variant="secondary" className="flex-1">Back</Button>
                      <Button onClick={() => setPaymentStep('record')} variant="primary" className="flex-1">
                        Done — Enter UTR
                      </Button>
                    </div>
                  </>
                )}

                {/* ====== STEP 3: Record Payment ====== */}
                {paymentStep === 'record' && (
                  <>
                    <p className="text-sm text-gray-600 mb-4">Enter the transaction reference from your {paymentMethod.toUpperCase()} payment</p>

                    <div className="mb-5">
                      <label className="block text-sm font-semibold text-gray-900 mb-2">UTR / Transaction ID *</label>
                      <input type="text" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)}
                        placeholder={paymentMethod === 'upi' ? 'e.g. 412345678901' : paymentMethod === 'cash' ? 'e.g. CASH-001 or receipt number' : 'e.g. NEFT1234567890'}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        autoFocus />
                      <p className="mt-1 text-xs text-gray-500">
                        {paymentMethod === 'upi' ? 'Find UTR in your UPI app → Transaction history' :
                         paymentMethod === 'cash' ? 'Enter receipt number or any reference' :
                         `Find UTR in your bank app → ${paymentMethod.toUpperCase()} transaction history`}
                      </p>
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Payment Screenshot (optional)</label>
                      <input type="file" ref={fileInputRef} onChange={handleUploadProof} accept="image/*,.pdf" className="hidden" />
                      {paymentProof ? (
                        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                          <Check className="w-5 h-5 text-green-600" />
                          <span className="text-sm text-green-700 flex-1">Screenshot uploaded</span>
                          <button onClick={() => { setPaymentProof(null); fileInputRef.current.value = ''; }} className="text-xs text-red-600 hover:underline">Remove</button>
                        </div>
                      ) : (
                        <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                          className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-colors text-sm text-gray-600">
                          <Upload className="w-4 h-4" />
                          {uploading ? 'Uploading...' : 'Upload payment screenshot'}
                        </button>
                      )}
                    </div>

                    {/* Summary */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between"><span className="text-blue-700">Affiliate:</span><span className="font-medium">{selectedAffiliatePayout.userId?.name}</span></div>
                        <div className="flex justify-between"><span className="text-blue-700">Gross:</span><span className="font-medium">{formatCurrency(parseFloat(payoutAmount || 0))}</span></div>
                        <div className="flex justify-between"><span className="text-blue-700">TDS (2%):</span><span className="font-medium">{formatCurrency(parseFloat(payoutAmount || 0) * 0.02)}</span></div>
                        <div className="flex justify-between"><span className="text-blue-700">Net Paid:</span><span className="font-bold text-green-700">{formatCurrency(netAmount)}</span></div>
                        <div className="flex justify-between"><span className="text-blue-700">Method:</span><span className="font-medium uppercase">{paymentMethod}</span></div>
                        <div className="flex justify-between"><span className="text-blue-700">UTR:</span><span className="font-mono">{paymentRef || '—'}</span></div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button onClick={() => setPaymentStep('pay')} variant="secondary" className="flex-1">Back</Button>
                      <Button onClick={handleSubmitPayout} variant="primary" className="flex-1"
                        disabled={markPaidMutation.isPending || !paymentRef.trim()}>
                        {markPaidMutation.isPending ? 'Recording...' : 'Confirm & Mark as Paid'}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default AffiliateCommissions;
