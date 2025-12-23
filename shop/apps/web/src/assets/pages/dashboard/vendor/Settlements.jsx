// FILE: apps/web/src/pages/dashboard/vendor/Settlements.jsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Info, HelpCircle, DollarSign, CheckCircle } from 'lucide-react';
import api from '@/utils/api';
import Pagination from '@/components/common/Pagination';
import Spinner from '@/components/common/Spinner';
import { formatCurrency, formatDate } from '@/utils/format';

const Settlements = () => {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['settlements', page],
    queryFn: async () => {
      const response = await api.get(`/vendors/settlements?page=${page}&limit=20`);
      return response.data;
    },
  });

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
        <Link
          to="/page/vendor-guide#commission"
          className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-blue-700 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors text-sm font-medium"
        >
          <HelpCircle className="w-4 h-4" />
          How Commissions Work
        </Link>
      </div>

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
              <th className="text-left py-3 px-4 font-semibold text-sm">Amount</th>
              <th className="text-left py-3 px-4 font-semibold text-sm">Commission %</th>
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
                <td className="py-3 px-4 font-semibold">{formatCurrency(settlement.amount)}</td>
                <td className="py-3 px-4 text-sm">{settlement.percentage}%</td>
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