// FILE: apps/web/src/pages/dashboard/vendor/VendorOrders.jsx
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '@/utils/api';
import Pagination from '@/components/common/Pagination';
import Spinner from '@/components/common/Spinner';
import CustomSelect from '@/components/common/CustomSelect';
import { formatCurrency, formatDate } from '@/utils/format';

const VendorOrders = () => {
  // Restore page and filter from sessionStorage on component mount
  const [page, setPage] = useState(() => {
    const savedPage = sessionStorage.getItem('vendor-orders-page');
    return savedPage ? parseInt(savedPage) : 1;
  });

  const [statusFilter, setStatusFilter] = useState(() => {
    return sessionStorage.getItem('vendor-orders-filter') || '';
  });

  const { data, isLoading } = useQuery({
    queryKey: ['vendor-orders', page, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', '10');
      if (statusFilter) params.append('status', statusFilter);

      const response = await api.get(`/vendors/orders?${params}`);
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes (orders update frequently)
    cacheTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    keepPreviousData: true, // Keep previous page data while fetching new page
  });

  // Save page to sessionStorage when it changes
  useEffect(() => {
    sessionStorage.setItem('vendor-orders-page', page.toString());
  }, [page]);

  // Save filter to sessionStorage when it changes
  useEffect(() => {
    sessionStorage.setItem('vendor-orders-filter', statusFilter);
  }, [statusFilter]);

  // Restore scroll position on mount
  useEffect(() => {
    const savedScroll = sessionStorage.getItem('vendor-orders-scroll');
    if (savedScroll) {
      window.scrollTo(0, parseInt(savedScroll));
    }
  }, []);

  // Save scroll position when user scrolls
  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem('vendor-orders-scroll', window.scrollY.toString());
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const orders = data?.data || [];
  const totalPages = Math.ceil((data?.meta?.total || 0) / 10);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Orders to Fulfill</h1>
        <CustomSelect
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
          options={[
            { value: '', label: 'All Orders' },
            { value: 'paid', label: 'Paid' },
            { value: 'packed', label: 'Packed' },
            { value: 'shipped', label: 'Shipped' },
            { value: 'delivered', label: 'Delivered' },
          ]}
          placeholder="All Orders"
          className="w-48"
        />
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-700">No orders to fulfill</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">Order {order.orderId}</h3>
                    <p className="text-sm text-gray-700">Placed on {formatDate(order.createdAt)}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                    order.status === 'shipped' ? 'bg-primary-100 text-primary-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-gray-700">Qty: {item.qty}</p>
                      </div>
                      <p className="font-semibold">{formatCurrency(item.priceSnapshot * item.qty)}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <p className="text-sm text-gray-700">Total Amount</p>
                    <p className="text-xl font-bold">{formatCurrency(order.totals.total)}</p>
                  </div>
                  <Link to={`/vendor-dashboard/orders/${order._id}`}>
                    <button className="btn btn-primary">View Details</button>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VendorOrders;