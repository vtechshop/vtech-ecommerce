// FILE: apps/web/src/pages/dashboard/admin/Payments.jsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import Spinner from '@/components/common/Spinner';
import Pagination from '@/components/common/Pagination';
import CustomSelect from '@/components/common/CustomSelect';
import { formatCurrency } from '@/utils/format';
import { formatRelativeTime } from '@/utils/dateHelpers';
import {
  DollarSign,
  CreditCard,
  Wallet,
  Banknote,
  Smartphone,
  Building,
  AlertCircle,
  CheckCircle,
  XCircle,
  Search,
  Download,
  Calendar,
  TrendingUp,
  RefreshCw,
  ArrowRight,
  Clock,
  IndianRupee
} from 'lucide-react';

const Payments = () => {
  const [page, setPage] = useState(1);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('30'); // days

  // Fetch payment statistics
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['admin-payment-stats', dateRange],
    queryFn: async () => {
      const response = await api.get(`/admin/payments/stats?days=${dateRange}`);
      return response.data;
    },
  });

  // Fetch payment transactions
  const { data: transactionsData, isLoading: transactionsLoading, refetch: refetchTransactions } = useQuery({
    queryKey: ['admin-payments', page, paymentMethodFilter, statusFilter, searchTerm, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', '20');
      params.append('days', dateRange);
      if (paymentMethodFilter) params.append('paymentMethod', paymentMethodFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await api.get(`/admin/payments?${params}`);
      return response.data;
    },
  });

  const handleRefresh = () => {
    refetchStats();
    refetchTransactions();
  };

  const handleExportCSV = () => {
    const transactions = transactionsData?.data || [];

    // CSV Headers
    const headers = ['Order ID', 'Customer', 'Email', 'Payment Method', 'Amount', 'Platform Fee', 'Net Amount', 'Status', 'Date'];

    // CSV Rows
    const rows = transactions.map(tx => [
      tx.orderId || '',
      tx.customerName || 'Guest',
      tx.customerEmail || '',
      tx.paymentMethod || '',
      tx.amount || 0,
      tx.platformFee || 0,
      (tx.amount || 0) - (tx.platformFee || 0),
      tx.status || '',
      new Date(tx.createdAt).toLocaleString()
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const stats = statsData?.data || {};
  const transactions = transactionsData?.data || [];
  const totalPages = Math.ceil((transactionsData?.meta?.total || 0) / 20);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'paid':
      case 'captured':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'created':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'paid':
      case 'captured':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
      case 'created':
        return <Clock className="w-4 h-4" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      case 'refunded':
        return <RefreshCw className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  const getPaymentMethodIcon = (method) => {
    const m = method?.toLowerCase();
    if (m === 'cod' || m === 'cash') return <Banknote className="w-4 h-4 text-green-600" />;
    if (m === 'upi') return <Smartphone className="w-4 h-4 text-purple-600" />;
    if (m === 'card' || m === 'credit_card' || m === 'debit_card') return <CreditCard className="w-4 h-4 text-blue-600" />;
    if (m === 'netbanking' || m === 'bank_transfer') return <Building className="w-4 h-4 text-gray-600" />;
    if (m === 'wallet') return <Wallet className="w-4 h-4 text-orange-600" />;
    return <IndianRupee className="w-4 h-4 text-gray-600" />;
  };

  if (statsLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payment Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">Monitor all payment transactions and settlements</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Account Balance Summary - Amazon Style */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Account Balance</h2>
          <div className="flex items-center gap-2 text-sm bg-white/10 px-3 py-1 rounded-full">
            <Calendar className="w-4 h-4" />
            Last {dateRange} days
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <p className="text-gray-400 text-sm mb-1">Available Balance</p>
            <p className="text-3xl font-bold text-green-400">
              {formatCurrency(stats.availableBalance || stats.successfulAmount || 0)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Ready for withdrawal</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm mb-1">Pending Balance</p>
            <p className="text-3xl font-bold text-yellow-400">
              {formatCurrency(stats.pendingAmount || 0)}
            </p>
            <p className="text-xs text-gray-400 mt-1">{stats.pendingPayments || 0} transactions processing</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm mb-1">Reserved (Refunds)</p>
            <p className="text-3xl font-bold text-orange-400">
              {formatCurrency(stats.reservedAmount || 0)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Held for potential claims</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-gray-400 text-sm mb-1">Next Payout</p>
            <p className="text-2xl font-bold">
              {formatCurrency(stats.nextPayoutAmount || stats.availableBalance || 0)}
            </p>
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-300">
              <Clock className="w-4 h-4" />
              <span>{stats.nextPayoutDate || 'Weekly settlement'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-600">Total Revenue</h3>
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(stats.totalRevenue || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            From {stats.totalTransactions || 0} orders
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-600">Successful</h3>
            <div className="p-2 bg-blue-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-green-600">
            {stats.successfulPayments || 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {formatCurrency(stats.successfulAmount || 0)}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-600">Pending</h3>
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-yellow-600">
            {stats.pendingPayments || 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {formatCurrency(stats.pendingAmount || 0)}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-600">Refunded</h3>
            <div className="p-2 bg-purple-100 rounded-lg">
              <RefreshCw className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-purple-600">
            {stats.refundedPayments || 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {formatCurrency(stats.refundedAmount || 0)}
          </p>
        </div>
      </div>

      {/* Payment Method Breakdown */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {stats.paymentMethods?.map((method) => (
            <div key={method._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 hover:border-blue-300 transition-colors">
              <div className="flex items-center gap-3">
                {getPaymentMethodIcon(method._id)}
                <div>
                  <p className="font-medium text-gray-900 capitalize">
                    {method._id || 'Other'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {method.count} transaction{method.count !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <p className="font-semibold text-gray-900 text-sm">
                {formatCurrency(method.total || 0)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by Order ID or Customer..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="input pl-10 w-full"
            />
          </div>

          <CustomSelect
            value={dateRange}
            onChange={(value) => {
              setDateRange(value);
              setPage(1);
            }}
            options={[
              { value: '1', label: 'Today' },
              { value: '7', label: 'Last 7 Days' },
              { value: '30', label: 'Last 30 Days' },
              { value: '90', label: 'Last 90 Days' },
              { value: '365', label: 'This Year' },
            ]}
            placeholder="Date Range"
            className="w-full"
          />

          <CustomSelect
            value={paymentMethodFilter}
            onChange={(value) => {
              setPaymentMethodFilter(value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All Payment Methods' },
              { value: 'cod', label: 'Cash on Delivery' },
              { value: 'upi', label: 'UPI' },
              { value: 'card', label: 'Card' },
              { value: 'netbanking', label: 'Net Banking' },
              { value: 'razorpay', label: 'Razorpay' },
              { value: 'wallet', label: 'Wallet' },
            ]}
            placeholder="Payment Method"
            className="w-full"
          />

          <CustomSelect
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'captured', label: 'Captured' },
              { value: 'pending', label: 'Pending' },
              { value: 'failed', label: 'Failed' },
              { value: 'refunded', label: 'Refunded' },
            ]}
            placeholder="Status"
            className="w-full"
          />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold">{transactions.length}</span> of{' '}
            <span className="font-semibold">{transactionsData?.meta?.total || 0}</span> transactions
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setPaymentMethodFilter('');
              setStatusFilter('');
              setDateRange('30');
              setPage(1);
            }}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear All Filters
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          {transactionsLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No payment transactions found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Order ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Customer</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Payment Method</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Amount</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr
                    key={transaction._id}
                    className="border-b last:border-b-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900">#{transaction.orderId}</p>
                      <p className="text-xs text-gray-500 font-mono">{transaction._id.slice(-8)}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900">{transaction.customerName || 'Guest'}</p>
                      <p className="text-xs text-gray-500">{transaction.customerEmail || ''}</p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getPaymentMethodIcon(transaction.paymentMethod)}
                        <span className="capitalize text-sm">{transaction.paymentMethod || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(transaction.amount || 0)}
                      </p>
                      {transaction.platformFee > 0 && (
                        <p className="text-xs text-gray-500">
                          Fee: {formatCurrency(transaction.platformFee)}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          transaction.status
                        )}`}
                      >
                        {getStatusIcon(transaction.status)}
                        {transaction.status?.charAt(0).toUpperCase() + transaction.status?.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <p className="text-gray-900">{new Date(transaction.createdAt).toLocaleDateString()}</p>
                      <p className="text-xs text-gray-500">{formatRelativeTime(transaction.createdAt)}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
};

export default Payments;
