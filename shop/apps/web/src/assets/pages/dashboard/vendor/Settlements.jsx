// FILE: apps/web/src/pages/dashboard/vendor/Settlements.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Info, HelpCircle, DollarSign, CheckCircle, Download, Calendar, LinkIcon, AlertCircle, Loader2, ExternalLink, Shield } from 'lucide-react';
import api from '@/utils/api';
import Pagination from '@/components/common/Pagination';
import Spinner from '@/components/common/Spinner';
import { formatCurrency, formatDate } from '@/utils/format';

const DATE_PRESETS = [
  { label: 'Last 1 Month', months: 1 },
  { label: 'Last 3 Months', months: 3 },
  { label: 'Last 6 Months', months: 6 },
  { label: 'Last 1 Year', months: 12 },
  { label: 'All Time', months: null },
];

const getPresetDates = (months) => {
  if (!months) return { startDate: '', endDate: '' };
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - months);
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          <span className="text-gray-500">Loading Razorpay status...</span>
        </div>
      </div>
    );
  }

  const isConnected = statusData?.connected;
  const status = statusData?.accountStatus || 'not_connected';
  const badge = STATUS_BADGE[status] || STATUS_BADGE.not_connected;

  // Already connected and activated
  if (isConnected && status === 'activated') {
    return (
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-5 mb-6">
        <div className="flex items-start gap-3">
          <Shield className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-bold text-green-900">Razorpay Route Connected</h3>
              <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full ${badge.bg}`}>
                {badge.label}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Account ID:</span>{' '}
                <span className="font-mono text-gray-800">{statusData.accountId}</span>
              </div>
              <div>
                <span className="text-gray-600">Settlement Rate:</span>{' '}
                <span className="font-semibold text-green-700">{statusData.settlementPercentage || 85}%</span>
              </div>
              <div>
                <span className="text-gray-600">Total Earnings:</span>{' '}
                <span className="font-semibold">{formatCurrency(statusData.totalEarnings || 0)}</span>
              </div>
            </div>
            <p className="text-sm text-green-700 mt-2">
              Payments are automatically split and transferred to your bank account after delivery.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Connected but pending verification
  if (isConnected && status !== 'activated') {
    return (
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-5 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-bold text-yellow-900">Razorpay Account Pending</h3>
              <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full ${badge.bg}`}>
                {badge.label}
              </span>
            </div>
            <p className="text-sm text-yellow-800 mb-3">
              Your Razorpay linked account has been created but is pending verification.
              {status === 'suspended' && ' Your account has been suspended. Please contact support.'}
            </p>
            {status !== 'suspended' && (
              <div className="bg-white border border-yellow-300 rounded p-3 text-sm">
                <p className="font-semibold text-yellow-900 mb-1">Next Steps:</p>
                <ol className="list-decimal list-inside text-yellow-800 space-y-1">
                  <li>Razorpay will verify your business details</li>
                  <li>You may receive an email from Razorpay for additional documents</li>
                  <li>Once verified, payments will be automatically routed to your account</li>
                </ol>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">Account ID: {statusData.accountId}</p>
          </div>
        </div>
      </div>
    );
  }

  // Not connected - show connect form
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5 mb-6">
      <div className="flex items-start gap-3">
        <LinkIcon className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-bold text-blue-900 mb-2">Connect Razorpay Route</h3>
          <p className="text-sm text-blue-800 mb-4">
            Connect your Razorpay account to receive automatic payment splits directly to your bank.
            No more waiting for manual payouts!
          </p>

          <div className="bg-white rounded-lg border border-blue-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
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
              <div className="bg-red-50 border border-red-200 rounded p-3 mb-3 text-sm text-red-700">
                {connectMutation.error?.response?.data?.error?.message || 'Failed to connect account'}
              </div>
            )}

            <button
              onClick={() => connectMutation.mutate(connectForm)}
              disabled={connectMutation.isPending || !connectForm.email || !connectForm.phone || !connectForm.contactName}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {connectMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</>
              ) : (
                <><LinkIcon className="w-4 h-4" /> Connect Razorpay Account</>
              )}
            </button>
          </div>

          <div className="mt-3 text-xs text-blue-700">
            <strong>Note:</strong> Your KYC must be approved before connecting. Razorpay will verify your business details after connection.
          </div>
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

  const { data, isLoading } = useQuery({
    queryKey: ['settlements', page],
    queryFn: async () => {
      const response = await api.get(`/vendors/settlements?page=${page}&limit=20`);
      return response.data;
    },
  });

  const handlePreset = (months) => {
    const { startDate, endDate } = getPresetDates(months);
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

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const settlements = data?.data || [];
  const totalPages = Math.ceil((data?.meta?.total || 0) / 20);

  // Calculate totals
  const totalPending = settlements.filter(s => s.status === 'pending').reduce((sum, s) => sum + s.amount, 0);
  const totalApproved = settlements.filter(s => s.status === 'approved').reduce((sum, s) => sum + s.amount, 0);
  const totalPaid = settlements.filter(s => s.status === 'paid').reduce((sum, s) => sum + s.amount, 0);

  const getTransferBadge = (transfer) => {
    if (!transfer?.transferId) return null;
    const badges = {
      processed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      created: 'bg-blue-100 text-blue-800',
      failed: 'bg-red-100 text-red-800',
      reversed: 'bg-gray-100 text-gray-800',
    };
    return badges[transfer.status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Settlements & Commissions</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowExport(!showExport)}
            className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Download Report
          </button>
          <Link
            to="/page/vendor-guide#commission"
            className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-blue-700 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors text-sm font-medium"
          >
            <HelpCircle className="w-4 h-4" />
            How Commissions Work
          </Link>
        </div>
      </div>

      {/* Razorpay Onboarding Section */}
      <RazorpayOnboarding />

      {/* Export Panel */}
      {showExport && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-800">Download Settlement Report</h3>
          </div>

          {/* Presets */}
          <div className="flex flex-wrap gap-2 mb-4">
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handlePreset(preset.months)}
                className="px-3 py-1.5 text-xs font-medium rounded-full border border-gray-300 bg-gray-50 hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700 transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range */}
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
              {!exportStartDate && !exportEndDate
                ? 'All records will be exported'
                : `${exportStartDate || 'Start'} to ${exportEndDate || 'Present'}`}
            </p>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              {downloading ? 'Downloading...' : 'Download CSV'}
            </button>
          </div>
        </div>
      )}

      {/* Commission Info Card */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-5 mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Understanding Your Commissions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-blue-800 mb-3">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p><strong>Default Rate:</strong> You earn 85%, Platform takes 15%</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p><strong>Created:</strong> When customer places order</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p><strong>Approved:</strong> After successful delivery</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p><strong>Paid:</strong> Transferred to your bank account</p>
              </div>
            </div>
            <div className="bg-white border border-blue-300 rounded p-3">
              <p className="text-sm text-blue-900 font-semibold mb-1">Example Calculation:</p>
              <p className="text-sm text-blue-800">
                Product Price: ₹5,000 × Qty: 2 = ₹10,000 →
                <span className="text-red-600 font-semibold"> Commission (15%): -₹1,500</span> →
                <span className="text-green-600 font-bold"> Your Earnings: ₹8,500</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="text-gray-700 text-sm font-medium mb-2">Pending</h3>
          <p className="text-3xl font-bold text-yellow-600">{formatCurrency(totalPending)}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="text-gray-700 text-sm font-medium mb-2">Approved</h3>
          <p className="text-3xl font-bold text-green-600">{formatCurrency(totalApproved)}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="text-gray-700 text-sm font-medium mb-2">Paid</h3>
          <p className="text-3xl font-bold text-blue-600">{formatCurrency(totalPaid)}</p>
        </div>
      </div>

      {/* Settlements Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-blue-100 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-sm">Order ID</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Date</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Your Earnings</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Platform Fee</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Transfer</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Paid Date</th>
              </tr>
            </thead>
            <tbody>
              {settlements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    No settlement records yet. Commissions will appear here after your first sale.
                  </td>
                </tr>
              ) : (
                settlements.map((settlement) => (
                  <tr key={settlement._id} className="border-b last:border-b-0 hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono text-sm">
                      {settlement.orderId?.orderId || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-sm">{formatDate(settlement.createdAt)}</td>
                    <td className="py-3 px-4 font-semibold text-green-700">{formatCurrency(settlement.amount)}</td>
                    <td className="py-3 px-4 text-sm text-red-600">{settlement.percentage}%</td>
                    <td className="py-3 px-3 sm:px-4">
                      <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                        settlement.status === 'paid' ? 'bg-green-100 text-green-800' :
                        settlement.status === 'approved' ? 'bg-primary-100 text-primary-800' :
                        settlement.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {settlement.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {settlement.transfer?.transferId ? (
                        <div className="flex flex-col gap-1">
                          <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${getTransferBadge(settlement.transfer)}`}>
                            {settlement.transfer.status}
                          </span>
                          <span className="text-xs text-gray-400 font-mono">
                            {settlement.transfer.transferId.slice(0, 12)}...
                          </span>
                          {settlement.transfer.failureReason && (
                            <span className="text-xs text-red-500">{settlement.transfer.failureReason}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Manual</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {settlement.paidAt ? formatDate(settlement.paidAt) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
};

export default Settlements;
