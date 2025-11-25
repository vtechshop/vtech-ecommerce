// FILE: apps/web/src/pages/dashboard/admin/Payments.jsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import Spinner from '@/components/common/Spinner';
import Pagination from '@/components/common/Pagination';
import { formatCurrency } from '@/utils/format';
import { formatRelativeTime } from '@/utils/dateHelpers';
import {
  DollarSign,
  CreditCard,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Search,
  Download
} from 'lucide-react';

const Payments = () => {
  const [page, setPage] = useState(1);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch payment statistics
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-payment-stats'],
    queryFn: async () => {
      const response = await api.get('/admin/payments/stats');
      return response.data;
    },
  });

  // Fetch payment transactions
  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ['admin-payments', page, paymentMethodFilter, statusFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', '20');
      if (paymentMethodFilter) params.append('paymentMethod', paymentMethodFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await api.get(`/admin/payments?${params}`);
      return response.data;
    },
  });

  const handleExportCSV = () => {
    const transactions = transactionsData?.data || [];

    // CSV Headers
    const headers = ['Order ID', 'Customer', 'Payment Method', 'Amount', 'Status', 'Date'];

    // CSV Rows
    const rows = transactions.map(tx => [
      tx.orderId || '',
      tx.customerName || 'Guest',
      tx.paymentMethod || '',
      tx.amount || 0,
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
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'paid':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <AlertCircle className="w-4 h-4" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
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
        <h1 className="text-3xl font-bold text-gray-900">Payment Dashboard</h1>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Total Revenue</h3>
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {formatCurrency(stats.totalRevenue || 0)}
          </p>
          <p className="text-sm text-gray-600 mt-2">
            From {stats.totalTransactions || 0} transactions
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Successful Payments</h3>
            <div className="p-2 bg-blue-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {stats.successfulPayments || 0}
          </p>
          <p className="text-sm text-gray-600 mt-2">
            {formatCurrency(stats.successfulAmount || 0)}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Pending Payments</h3>
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {stats.pendingPayments || 0}
          </p>
          <p className="text-sm text-gray-600 mt-2">
            {formatCurrency(stats.pendingAmount || 0)}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Failed Payments</h3>
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {stats.failedPayments || 0}
          </p>
          <p className="text-sm text-gray-600 mt-2">
            {formatCurrency(stats.failedAmount || 0)}
          </p>
        </div>
      </div>

      {/* Payment Method Breakdown */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.paymentMethods?.map((method) => (
            <div key={method._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900 capitalize">
                    {method._id || 'Unknown'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {method.count} transaction{method.count !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <p className="font-semibold text-gray-900">
                {formatCurrency(method.total || 0)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
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

          <select
            value={paymentMethodFilter}
            onChange={(e) => {
              setPaymentMethodFilter(e.target.value);
              setPage(1);
            }}
            className="input w-full"
          >
            <option value="">All Payment Methods</option>
            <option value="stripe">Stripe</option>
            <option value="razorpay">Razorpay</option>
            <option value="cod">Cash on Delivery</option>
            <option value="bank_transfer">Bank Transfer</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="input w-full"
          >
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>

          <button
            onClick={() => {
              setSearchTerm('');
              setPaymentMethodFilter('');
              setStatusFilter('');
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Clear Filters
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
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Order ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Customer</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Payment Method</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Amount</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Date</th>
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
                      <p className="text-xs text-gray-600">{transaction._id.slice(-8)}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900">{transaction.customerName || 'Guest'}</p>
                      <p className="text-xs text-gray-600">{transaction.customerEmail || ''}</p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-gray-600" />
                        <span className="capitalize">{transaction.paymentMethod || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(transaction.amount || 0)}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          transaction.status
                        )}`}
                      >
                        {getStatusIcon(transaction.status)}
                        {transaction.status?.charAt(0).toUpperCase() + transaction.status?.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      <p>{new Date(transaction.createdAt).toLocaleDateString()}</p>
                      <p className="text-xs text-gray-600">{formatRelativeTime(transaction.createdAt)}</p>
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
