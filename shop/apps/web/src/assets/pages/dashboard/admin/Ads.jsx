// FILE: apps/web/src/pages/dashboard/admin/Ads.jsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import Pagination from '@/components/common/Pagination';
import Spinner from '@/components/common/Spinner';
import CustomSelect from '@/components/common/CustomSelect';
import { formatCurrency, formatDate } from '@/utils/format';
import { RefreshCw } from 'lucide-react';

const Ads = () => {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-ads', page, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', '20');
      if (statusFilter) params.append('status', statusFilter);

      const response = await api.get(`/admin/ads/campaigns?${params}`);
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

  const campaigns = data?.data || [];
  const totalPages = Math.ceil((data?.meta?.total || 0) / 20);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Ad Campaigns</h1>
        <div className="flex items-center gap-2">
          <button onClick={refetch} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        <CustomSelect
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
          options={[
            { value: '', label: 'All Status' },
            { value: 'active', label: 'Active' },
            { value: 'paused', label: 'Paused' },
            { value: 'budget_exhausted', label: 'Budget Exhausted' },
            { value: 'draft', label: 'Draft' },
          ]}
          placeholder="All Status"
          className="w-48"
        />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-blue-100 border-b">
            <tr>
              <th className="text-left py-3 px-4 font-semibold text-sm">Campaign</th>
              <th className="text-left py-3 px-4 font-semibold text-sm">Vendor</th>
              <th className="text-left py-3 px-4 font-semibold text-sm">Type</th>
              <th className="text-left py-3 px-4 font-semibold text-sm">Spend</th>
              <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
              <th className="text-left py-3 px-4 font-semibold text-sm">Created</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign) => (
              <tr key={campaign._id} className="border-b last:border-b-0">
                <td className="py-3 px-3 sm:px-4">
                  <p className="font-medium">{campaign.name}</p>
                  <p className="text-sm text-gray-700">Bid: {formatCurrency(campaign.bid)}</p>
                </td>
                <td className="py-3 px-4 text-sm">
                  {campaign.vendorId?.storeName || 'Unknown'}
                </td>
                <td className="py-3 px-4 text-sm">{campaign.type}</td>
                <td className="py-3 px-4 font-semibold">
                  {formatCurrency(campaign.stats?.spend || 0)}
                </td>
                <td className="py-3 px-3 sm:px-4">
                  <span
                    className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                      campaign.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : campaign.status === 'paused'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-gray-900'
                    }`}
                  >
                    {campaign.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm">{formatDate(campaign.createdAt)}</td>
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

export default Ads;