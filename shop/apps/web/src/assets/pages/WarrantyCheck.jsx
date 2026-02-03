// FILE: apps/web/src/pages/WarrantyCheck.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import { formatCurrency } from '@/utils/format';
import { ShieldCheck, Search, Phone, Hash, CheckCircle, XCircle, Clock, Package } from 'lucide-react';

const WarrantyCheck = () => {
  const [searchType, setSearchType] = useState('phone');
  const [searchValue, setSearchValue] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['warranty-check', searchType, searchValue],
    queryFn: async () => {
      const params = searchType === 'phone' ? `phone=${encodeURIComponent(searchValue)}` : `orderId=${encodeURIComponent(searchValue)}`;
      const res = await api.get(`/warranties/check?${params}`);
      return res.data?.data || [];
    },
    enabled: submitted && searchValue.length >= 3,
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
        return <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-semibold rounded-full bg-yellow-100 text-yellow-700"><Clock className="w-4 h-4" /> Pending Activation</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-semibold rounded-full bg-gray-100 text-gray-600">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-primary-700 to-primary-900 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <ShieldCheck className="w-16 h-16 mx-auto mb-4 opacity-90" />
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Warranty Check</h1>
          <p className="text-primary-200 text-lg max-w-xl mx-auto">
            Check your product warranty status using your phone number or order ID. Works for both online and in-store purchases.
          </p>
        </div>
      </div>

      {/* Search Form */}
      <div className="container mx-auto px-4 -mt-8">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setSearchType('phone'); setSubmitted(false); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  searchType === 'phone' ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Phone className="w-4 h-4" /> Phone Number
              </button>
              <button
                type="button"
                onClick={() => { setSearchType('orderId'); setSubmitted(false); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  searchType === 'orderId' ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Hash className="w-4 h-4" /> Order ID
              </button>
            </div>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => { setSearchValue(e.target.value); setSubmitted(false); }}
                  className="input w-full pl-11 py-3 text-lg"
                  placeholder={searchType === 'phone' ? 'Enter your phone number...' : 'Enter your order ID (e.g. ORD-...)'}
                  required
                />
              </div>
              <Button type="submit" className="px-6">Check</Button>
            </div>
          </form>
        </div>
      </div>

      {/* Results */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {isLoading && <div className="text-center py-12"><Spinner /></div>}

        {submitted && !isLoading && data?.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-lg">No warranty records found</p>
            <p className="text-gray-400 text-sm mt-1">Please check your {searchType === 'phone' ? 'phone number' : 'order ID'} and try again</p>
          </div>
        )}

        {data?.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">
              Found {data.length} warranty record{data.length > 1 ? 's' : ''}
            </h2>
            {data.map((item, idx) => (
              <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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
                          <span>Price: {formatCurrency(item.price)}</span>
                          <span className={`capitalize px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.source === 'in-store' ? 'bg-purple-100 text-purple-700' : item.source === 'phone' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {item.source === 'in-store' ? 'In-Store' : item.source === 'phone' ? 'Phone' : 'Online'}
                          </span>
                        </div>
                      </div>
                      {getStatusBadge(item.warranty.status)}
                    </div>

                    {/* Warranty Details */}
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
                      {item.warranty.activatedAt && (
                        <div>
                          <div className="text-xs text-gray-500 uppercase">Activated On</div>
                          <div className="text-sm font-medium">
                            {new Date(item.warranty.activatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                      )}
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

                    {item.warranty.description && (
                      <p className="mt-3 text-sm text-gray-600">{item.warranty.description}</p>
                    )}
                    {item.warranty.warrantyCode && (
                      <div className="mt-2 text-sm">
                        <span className="text-gray-500">Warranty Code: </span>
                        <code className="bg-green-50 text-green-700 px-2 py-0.5 rounded font-mono">{item.warranty.warrantyCode}</code>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WarrantyCheck;
