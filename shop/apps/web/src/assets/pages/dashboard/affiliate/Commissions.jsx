// FILE: apps/web/src/pages/dashboard/affiliate/Commissions.jsx
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Info, HelpCircle, DollarSign, CheckCircle, TrendingUp } from 'lucide-react';
import api from '@/utils/api';
import Pagination from '@/components/common/Pagination';
import Spinner from '@/components/common/Spinner';
import CustomSelect from '@/components/common/CustomSelect';
import { formatCurrency, formatDate } from '@/utils/format';

const Commissions = () => {
  // Restore page and filter from sessionStorage on component mount
  const [page, setPage] = useState(() => {
    const savedPage = sessionStorage.getItem('affiliate-commissions-page');
    return savedPage ? parseInt(savedPage) : 1;
  });

  const [statusFilter, setStatusFilter] = useState(() => {
    return sessionStorage.getItem('affiliate-commissions-filter') || '';
  });

  const { data, isLoading } = useQuery({
    queryKey: ['affiliate-commissions', page, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', '20');
      if (statusFilter) params.append('status', statusFilter);

      const response = await api.get(`/affiliates/commissions?${params}`);
      return response.data;
    },
    staleTime: 3 * 60 * 1000, // Cache for 3 minutes (commissions update periodically)
    cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    keepPreviousData: true, // Keep previous page data while fetching new page
  });

  // Save page to sessionStorage when it changes
  useEffect(() => {
    sessionStorage.setItem('affiliate-commissions-page', page.toString());
  }, [page]);

  // Save filter to sessionStorage when it changes
  useEffect(() => {
    sessionStorage.setItem('affiliate-commissions-filter', statusFilter);
  }, [statusFilter]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const commissions = data?.data || [];
  const totalPages = Math.ceil((data?.meta?.total || 0) / 20);

  // Calculate totals
  const pending = commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0);
  const approved = commissions.filter(c => c.status === 'approved').reduce((sum, c) => sum + c.amount, 0);
  const paid = commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Commissions</h1>
        <Link
          to="/page/affiliate-terms#commission"
          className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
        >
          <HelpCircle className="w-4 h-4" />
          How Commissions Work
        </Link>
      </div>

      {/* Commission Info Card */}
      <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-5 mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-green-900 mb-2 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Understanding Your Affiliate Commissions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-green-800 mb-3">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <p><strong>Standard Rate:</strong> 5% on all sales</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <p><strong>Created:</strong> When customer completes purchase</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <p><strong>Approved:</strong> After successful delivery</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <p><strong>Paid:</strong> Monthly (within 15 days)</p>
              </div>
            </div>
            <div className="bg-white border border-green-300 rounded p-3 mb-3">
              <p className="text-sm text-green-900 font-semibold mb-1">Example Calculation:</p>
              <p className="text-sm text-green-800">
                Customer buys ₹10,000 worth of products →
                <span className="text-green-600 font-bold"> Your Commission (5%): ₹500</span>
              </p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded p-3">
              <p className="text-sm text-purple-900 font-semibold mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Tier System - Earn More!
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs text-purple-800">
                <p>• Bronze (₹10K+/mo): <strong>5%</strong></p>
                <p>• Silver (₹25K+/mo): <strong>6%</strong></p>
                <p>• Gold (₹50K+/mo): <strong>7%</strong></p>
                <p>• Platinum (₹100K+/mo): <strong>8%</strong></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="text-gray-700 text-sm font-medium mb-2">Pending</h3>
          <p className="text-3xl font-bold text-yellow-600">{formatCurrency(pending)}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="text-gray-700 text-sm font-medium mb-2">Approved</h3>
          <p className="text-3xl font-bold text-green-600">{formatCurrency(approved)}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="text-gray-700 text-sm font-medium mb-2">Paid</h3>
          <p className="text-3xl font-bold text-blue-600">{formatCurrency(paid)}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Commission History</h2>
        <CustomSelect
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
          options={[
            { value: '', label: 'All Status' },
            { value: 'pending', label: 'Pending' },
            { value: 'approved', label: 'Approved' },
            { value: 'paid', label: 'Paid' },
          ]}
          placeholder="All Status"
          className="w-48"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left py-3 px-4 font-semibold text-sm">Order ID</th>
              <th className="text-left py-3 px-4 font-semibold text-sm">Date</th>
              <th className="text-left py-3 px-4 font-semibold text-sm">Amount</th>
              <th className="text-left py-3 px-4 font-semibold text-sm">Rate</th>
              <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
              <th className="text-left py-3 px-4 font-semibold text-sm">Paid Date</th>
            </tr>
          </thead>
          <tbody>
            {commissions.map((commission) => (
              <tr key={commission._id} className="border-b last:border-b-0">
                <td className="py-3 px-4 font-mono text-sm">
                  {commission.orderId?.orderId || 'N/A'}
                </td>
                <td className="py-3 px-4 text-sm">{formatDate(commission.createdAt)}</td>
                <td className="py-3 px-4 font-semibold">{formatCurrency(commission.amount)}</td>
                <td className="py-3 px-4 text-sm">{commission.percentage}%</td>
                <td className="py-3 px-3 sm:px-4">
                  <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                    commission.status === 'paid' ? 'bg-green-100 text-green-800' :
                    commission.status === 'approved' ? 'bg-primary-100 text-primary-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {commission.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm">
                  {commission.paidAt ? formatDate(commission.paidAt) : '-'}
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

export default Commissions;