// FILE: apps/web/src/pages/WarrantyCheck.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '@/utils/api';
import useAuth from '@/hooks/useAuth';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import { formatCurrency } from '@/utils/format';
import { ShieldCheck, Search, CheckCircle, XCircle, Clock, Package, User, LogIn } from 'lucide-react';

const WarrantyCheck = () => {
  const { user, isAuthenticated } = useAuth();
  const [orderId, setOrderId] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // If logged in, auto-fetch user's warranties
  const { data: myWarranties, isLoading: loadingMy } = useQuery({
    queryKey: ['my-warranties'],
    queryFn: async () => {
      const res = await api.get('/warranties/check?phone=my-account');
      return res.data?.data || [];
    },
    enabled: isAuthenticated,
  });

  // Search by Order ID (for guests or specific order lookup)
  const { data: searchResults, isLoading: loadingSearch } = useQuery({
    queryKey: ['warranty-search', orderId],
    queryFn: async () => {
      const res = await api.get(`/warranties/check?orderId=${encodeURIComponent(orderId)}`);
      return res.data?.data || [];
    },
    enabled: submitted && orderId.length >= 3,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-700"><CheckCircle className="w-4 h-4" /> Active</span>;
      case 'expired':
        return <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-semibold rounded-full bg-red-100 text-red-700"><XCircle className="w-4 h-4" /> Expired</span>;
      case 'pending_activation':
        return <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-semibold rounded-full bg-yellow-100 text-yellow-700"><Clock className="w-4 h-4" /> Pending</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-semibold rounded-full bg-gray-100 text-gray-600">{status}</span>;
    }
  };

  const WarrantyCard = ({ item }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-start gap-4">
        {item.productImage && (
          <img src={item.productImage} alt={item.productName} className="w-20 h-20 rounded-lg object-cover border" />
        )}
        <div className="flex-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">{item.productName}</h3>
              <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500">
                <span>Order: <code className="bg-gray-100 px-1.5 py-0.5 rounded">{item.orderId}</code></span>
                {item.sku && <span>SKU: {item.sku}</span>}
                <span>{formatCurrency(item.price)}</span>
              </div>
            </div>
            {getStatusBadge(item.warranty.status)}
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="text-xs text-gray-500 uppercase">Duration</div>
              <div className="text-sm font-medium">
                {item.warranty.durationType === 'lifetime' ? 'Lifetime' : `${item.warranty.duration} ${item.warranty.durationType}`}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase">Purchase Date</div>
              <div className="text-sm font-medium">
                {new Date(item.orderDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>
            {item.warranty.expiresAt && (
              <div>
                <div className="text-xs text-gray-500 uppercase">Expires On</div>
                <div className="text-sm font-medium">
                  {new Date(item.warranty.expiresAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>
            )}
            {item.warranty.provider && (
              <div>
                <div className="text-xs text-gray-500 uppercase">Provider</div>
                <div className="text-sm font-medium capitalize">{item.warranty.provider}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-primary-700 to-primary-900 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <ShieldCheck className="w-14 h-14 mx-auto mb-3 opacity-90" />
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Warranty Check</h1>
          <p className="text-primary-200 text-lg">Check your product warranty status</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Logged In - Show My Warranties */}
        {isAuthenticated ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 rounded-full">
                  <User className="w-5 h-5 text-primary-700" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">My Warranties</h2>
                  <p className="text-sm text-gray-500">Showing warranties from your orders</p>
                </div>
              </div>
            </div>

            {loadingMy ? (
              <div className="text-center py-12"><Spinner /></div>
            ) : myWarranties?.length > 0 ? (
              <div className="space-y-4">
                {myWarranties.map((item, idx) => (
                  <WarrantyCard key={idx} item={item} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 text-lg">No warranty products found</p>
                <p className="text-gray-400 text-sm mt-1">Products with warranty will appear here after purchase</p>
              </div>
            )}

            {/* Also allow Order ID search */}
            <div className="border-t pt-6 mt-8">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Check another order</h3>
              <form onSubmit={handleSubmit} className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={orderId}
                    onChange={(e) => { setOrderId(e.target.value); setSubmitted(false); }}
                    className="input w-full pl-11"
                    placeholder="Enter Order ID (e.g. ORD-...)"
                  />
                </div>
                <Button type="submit">Check</Button>
              </form>

              {loadingSearch && <div className="text-center py-6"><Spinner /></div>}

              {submitted && !loadingSearch && searchResults?.length === 0 && (
                <p className="text-gray-500 text-sm mt-4">No warranty found for this order ID</p>
              )}

              {searchResults?.length > 0 && (
                <div className="space-y-4 mt-4">
                  {searchResults.map((item, idx) => (
                    <WarrantyCard key={idx} item={item} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Not Logged In - Order ID Search Only */
          <div className="space-y-6">
            {/* Login prompt */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <LogIn className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Have an account?</p>
                  <p className="text-xs text-blue-700">Login to see all your warranties automatically</p>
                </div>
              </div>
              <Link to="/login" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
                Login
              </Link>
            </div>

            {/* Order ID Search */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Check Warranty by Order ID</h2>
              <form onSubmit={handleSubmit} className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={orderId}
                    onChange={(e) => { setOrderId(e.target.value); setSubmitted(false); }}
                    className="input w-full pl-11 py-3 text-lg"
                    placeholder="Enter your Order ID (e.g. ORD-...)"
                    required
                  />
                </div>
                <Button type="submit" className="px-6">Check</Button>
              </form>
              <p className="text-xs text-gray-500 mt-3">You can find your Order ID in your receipt or order confirmation email/SMS</p>
            </div>

            {/* Results */}
            {loadingSearch && <div className="text-center py-12"><Spinner /></div>}

            {submitted && !loadingSearch && searchResults?.length === 0 && (
              <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 text-lg">No warranty records found</p>
                <p className="text-gray-400 text-sm mt-1">Please check your Order ID and try again</p>
              </div>
            )}

            {searchResults?.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  Found {searchResults.length} warranty record{searchResults.length > 1 ? 's' : ''}
                </h2>
                {searchResults.map((item, idx) => (
                  <WarrantyCard key={idx} item={item} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WarrantyCheck;
