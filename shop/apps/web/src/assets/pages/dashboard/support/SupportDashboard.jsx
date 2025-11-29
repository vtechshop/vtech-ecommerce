// FILE: apps/web/src/pages/dashboard/support/SupportDashboard.jsx
import { useState } from 'react';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import { formatDate } from '@/utils/format';
import { useToast } from '@/components/common/ToastContainer';

const SupportDashboard = () => {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [orderResult, setOrderResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!search.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    try {
      const response = await api.get(`/admin/orders?search=${encodeURIComponent(search.trim())}`);
      const orders = response.data?.data || [];
      if (orders.length > 0) {
        setOrderResult(orders[0]);
      } else {
        setOrderResult(null);
        setSearchError('No orders found matching your search.');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to search orders';
      setSearchError(errorMessage);
      setOrderResult(null);
      toast.error(errorMessage);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl md:text-4xl font-bold mb-8">Support Dashboard</h1>

      {/* Quick Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-xl md:text-2xl font-semibold mb-4">Quick Order Search</h2>
        <form onSubmit={handleSearch} className="flex gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Enter Order ID or Email"
            className="flex-1"
          />
          <Button type="submit" variant="primary" disabled={isSearching}>
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
        </form>

        {searchError && (
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-amber-800">{searchError}</p>
          </div>
        )}

        {orderResult && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Order: {orderResult.orderId || 'N/A'}</h3>
            <p className="text-sm text-gray-700">Status: {orderResult.status || 'Unknown'}</p>
            <p className="text-sm text-gray-700">Customer: {orderResult.userId?.email || orderResult.guestEmail || 'N/A'}</p>
            <p className="text-sm text-gray-700">Date: {orderResult.createdAt ? formatDate(orderResult.createdAt) : 'N/A'}</p>
          </div>
        )}
      </div>

      {/* Common Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="font-semibold text-lg mb-2">Process Refunds</h3>
          <p className="text-sm text-gray-700 mb-4">Handle customer refund requests</p>
          <Button variant="outline" size="sm">View Requests</Button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="font-semibold text-lg mb-2">Manage Returns</h3>
          <p className="text-sm text-gray-700 mb-4">Approve or reject return requests</p>
          <Button variant="outline" size="sm">View Returns</Button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="font-semibold text-lg mb-2">Update Shipping</h3>
          <p className="text-sm text-gray-700 mb-4">Update tracking information</p>
          <Button variant="outline" size="sm">Update Info</Button>
        </div>
      </div>
    </div>
  );
};

export default SupportDashboard;