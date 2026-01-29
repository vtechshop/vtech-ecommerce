// FILE: apps/web/src/pages/dashboard/vendor/Settlements.jsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Info, HelpCircle, DollarSign, CheckCircle, Download, Calendar } from 'lucide-react';
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
        <table className="w-full">
          <thead className="bg-blue-100 border-b">
            <tr>
              <th className="text-left py-3 px-4 font-semibold text-sm">Order ID</th>
              <th className="text-left py-3 px-4 font-semibold text-sm">Date</th>
              <th className="text-left py-3 px-4 font-semibold text-sm">Your Earnings</th>
              <th className="text-left py-3 px-4 font-semibold text-sm">Platform Fee</th>
              <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
              <th className="text-left py-3 px-4 font-semibold text-sm">Paid Date</th>
            </tr>
          </thead>
          <tbody>
            {settlements.map((settlement) => (
              <tr key={settlement._id} className="border-b last:border-b-0">
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
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {settlement.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm">
                  {settlement.paidAt ? formatDate(settlement.paidAt) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
