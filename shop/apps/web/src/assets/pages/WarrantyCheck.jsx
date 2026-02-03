// FILE: apps/web/src/pages/WarrantyCheck.jsx
// Amazon-style warranty display - Only shows delivered orders with support options
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '@/utils/api';
import useAuth from '@/hooks/useAuth';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import { formatCurrency } from '@/utils/format';
import { ShieldCheck, Search, ChevronDown, ChevronUp, Package, User, LogIn, Clock, AlertTriangle, CheckCircle, XCircle, MessageCircle, Phone, HelpCircle, Truck } from 'lucide-react';

const WarrantyCheck = () => {
  const { user, isAuthenticated } = useAuth();
  const [orderId, setOrderId] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // If logged in, auto-fetch user's warranties (only delivered orders)
  const { data: myWarranties, isLoading: loadingMy } = useQuery({
    queryKey: ['my-warranties'],
    queryFn: async () => {
      const res = await api.get('/warranties/check?phone=my-account');
      return res.data?.data || [];
    },
    enabled: isAuthenticated,
  });

  // Search by Order ID
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

  // Get status info based on warranty state (uses backend-calculated values)
  const getWarrantyStatus = (warranty) => {
    const daysLeft = warranty.daysRemaining;

    // Check backend status first
    if (warranty.status === 'pending_activation') {
      return { label: 'Pending Activation', color: 'yellow', icon: Clock, daysLeft: daysLeft, canClaim: true, isPending: true };
    }

    if (warranty.status === 'expired') {
      return { label: 'Warranty Expired', color: 'red', icon: XCircle, daysLeft: 0, canClaim: false };
    }

    // Active warranty
    if (warranty.durationType === 'lifetime' || daysLeft === null) {
      return { label: 'Lifetime Warranty', color: 'green', icon: ShieldCheck, daysLeft: null, canClaim: true };
    }

    if (daysLeft <= 0) {
      return { label: 'Warranty Expired', color: 'red', icon: XCircle, daysLeft: 0, canClaim: false };
    }

    if (daysLeft <= 30) {
      return { label: 'Expiring Soon', color: 'orange', icon: AlertTriangle, daysLeft, canClaim: true };
    }

    return { label: 'Under Warranty', color: 'green', icon: CheckCircle, daysLeft, canClaim: true };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero - Compact */}
      <div className="bg-gradient-to-r from-primary-700 to-primary-900 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <ShieldCheck className="w-10 h-10 mx-auto mb-2 opacity-90" />
          <h1 className="text-2xl font-bold">Product Warranty</h1>
          <p className="text-primary-200 text-sm">View warranty status & get product support</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Logged In - Show My Warranties */}
        {isAuthenticated ? (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 rounded-full">
                  <User className="w-5 h-5 text-primary-700" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">My Warranties</h2>
                  <p className="text-sm text-gray-500">{myWarranties?.length || 0} delivered product(s) with warranty</p>
                </div>
              </div>
              <Link to="/dashboard/orders" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
                <Truck className="w-4 h-4" />
                View Orders
              </Link>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                Warranty is available only for <strong>delivered orders</strong>. If your order is still in transit, warranty will appear here once delivered.
              </p>
            </div>

            {loadingMy ? (
              <div className="text-center py-12"><Spinner /></div>
            ) : myWarranties?.length > 0 ? (
              <div className="space-y-3">
                {myWarranties.map((item, idx) => (
                  <WarrantyCard key={idx} item={item} getWarrantyStatus={getWarrantyStatus} />
                ))}
              </div>
            ) : (
              <EmptyState isLoggedIn={true} />
            )}

            {/* Order ID Search */}
            <div className="border-t pt-6 mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Check another order</h3>
              <SearchForm orderId={orderId} setOrderId={setOrderId} setSubmitted={setSubmitted} handleSubmit={handleSubmit} />

              {loadingSearch && <div className="text-center py-6"><Spinner /></div>}
              {submitted && !loadingSearch && searchResults?.length === 0 && (
                <div className="text-center py-6 text-gray-500 text-sm">
                  <p>No warranty found for this order.</p>
                  <p className="text-xs mt-1">Only delivered orders with warranty products will appear here.</p>
                </div>
              )}
              {searchResults?.length > 0 && (
                <div className="space-y-3 mt-4">
                  {searchResults.map((item, idx) => (
                    <WarrantyCard key={idx} item={item} getWarrantyStatus={getWarrantyStatus} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Guest View */
          <div className="space-y-6">
            <LoginPrompt />
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Check Warranty by Order ID</h2>
              <SearchForm orderId={orderId} setOrderId={setOrderId} setSubmitted={setSubmitted} handleSubmit={handleSubmit} />
              <p className="text-xs text-gray-500 mt-3">Find your Order ID in your receipt or order confirmation SMS/email</p>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                Warranty is available only for <strong>delivered orders</strong>. Pending, cancelled, or returned orders will not show warranty.
              </p>
            </div>

            {loadingSearch && <div className="text-center py-12"><Spinner /></div>}
            {submitted && !loadingSearch && searchResults?.length === 0 && <EmptyState isLoggedIn={false} />}
            {searchResults?.length > 0 && (
              <div className="space-y-3">
                {searchResults.map((item, idx) => (
                  <WarrantyCard key={idx} item={item} getWarrantyStatus={getWarrantyStatus} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Amazon-style Warranty Card with expandable details and support options
const WarrantyCard = ({ item, getWarrantyStatus }) => {
  const [expanded, setExpanded] = useState(false);
  const status = getWarrantyStatus(item.warranty);
  const StatusIcon = status.icon;

  const statusColors = {
    green: 'bg-green-100 text-green-700 border-green-200',
    yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    orange: 'bg-orange-100 text-orange-700 border-orange-200',
    red: 'bg-red-100 text-red-700 border-red-200',
  };

  const daysColors = {
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    orange: 'text-orange-600',
    red: 'text-red-600',
  };

  // Generate WhatsApp support message
  const getWhatsAppLink = () => {
    const message = `Hi, I need warranty support for my order.\n\nOrder ID: ${item.orderId}\nProduct: ${item.productName}\n${item.warranty.warrantyCode ? `Serial/Code: ${item.warranty.warrantyCode}\n` : ''}Warranty Status: ${status.label}`;
    return `https://wa.me/919876543210?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Main Row - Always Visible */}
      <div className="p-4">
        <div className="flex items-center gap-4">
          {/* Product Image */}
          {item.productImage ? (
            <img src={item.productImage} alt={item.productName} className="w-16 h-16 rounded-lg object-cover border flex-shrink-0" />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Package className="w-6 h-6 text-gray-400" />
            </div>
          )}

          {/* Product Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate">{item.productName}</h3>
            <p className="text-xs text-gray-500 mt-0.5">Order: {item.orderId}</p>
            {item.warranty.warrantyCode && (
              <p className="text-xs text-gray-400 mt-0.5">S/N: {item.warranty.warrantyCode}</p>
            )}
          </div>

          {/* Days Remaining - Prominent */}
          <div className="text-right flex-shrink-0">
            {item.warranty.durationType === 'lifetime' ? (
              // Lifetime warranty
              <>
                <div className="text-2xl font-bold text-green-600">∞</div>
                <div className="text-xs text-gray-500">lifetime</div>
              </>
            ) : status.daysLeft !== null && status.daysLeft !== undefined && status.daysLeft > 0 ? (
              // Has days remaining
              <>
                <div className={`text-2xl font-bold ${daysColors[status.color]}`}>
                  {status.daysLeft}
                </div>
                <div className="text-xs text-gray-500">days left</div>
              </>
            ) : status.daysLeft === 0 ? (
              // Expired
              <>
                <div className="text-2xl font-bold text-red-600">0</div>
                <div className="text-xs text-gray-500">expired</div>
              </>
            ) : (
              <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${statusColors[status.color]}`}>
                <StatusIcon className="w-3 h-3" />
                {status.label}
              </span>
            )}
          </div>

          {/* Expand Button */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          >
            {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>
        </div>

        {/* Status Badge & Date */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${statusColors[status.color]}`}>
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </span>
          <span className="text-xs text-gray-500">
            Delivered: {new Date(item.orderDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-4 pt-0">
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            {/* Warranty Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-xs text-gray-500 uppercase font-medium">Duration</div>
                <div className="font-medium text-gray-900">
                  {item.warranty.durationType === 'lifetime' ? 'Lifetime' : `${item.warranty.duration} ${item.warranty.durationType}`}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase font-medium">Delivered</div>
                <div className="font-medium text-gray-900">
                  {new Date(item.orderDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>
              {item.warranty.expiresAt && (
                <div>
                  <div className="text-xs text-gray-500 uppercase font-medium">Expires On</div>
                  <div className="font-medium text-gray-900">
                    {new Date(item.warranty.expiresAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              )}
              {item.warranty.provider && (
                <div>
                  <div className="text-xs text-gray-500 uppercase font-medium">Provider</div>
                  <div className="font-medium text-gray-900 capitalize">{item.warranty.provider}</div>
                </div>
              )}
            </div>

            {/* Additional Info */}
            <div className="pt-3 border-t border-gray-200 flex flex-wrap gap-4 text-xs text-gray-500">
              {item.sku && <span>SKU: {item.sku}</span>}
              <span>Price: {formatCurrency(item.price)}</span>
            </div>

            {/* Description */}
            {item.warranty.description && (
              <p className="text-sm text-gray-600 pt-2 border-t border-gray-200">
                {item.warranty.description}
              </p>
            )}

            {/* Support Actions - Amazon style "Get product support" */}
            <div className="pt-3 border-t border-gray-200">
              <h4 className="text-xs text-gray-500 uppercase font-medium mb-3">Get Product Support</h4>
              {status.isPending ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Your warranty is pending activation. It will be automatically activated or you can contact support to activate it manually.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <a
                      href={getWhatsAppLink()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Activate via WhatsApp
                    </a>
                    <a
                      href="tel:+919876543210"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                      Call Support
                    </a>
                  </div>
                </div>
              ) : status.canClaim ? (
                <div className="flex flex-wrap gap-2">
                  <a
                    href={getWhatsAppLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp Support
                  </a>
                  <a
                    href="tel:+919876543210"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    Call Support
                  </a>
                  <Link
                    to="/page/contact"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <HelpCircle className="w-4 h-4" />
                    Help Center
                  </Link>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">
                    <XCircle className="w-4 h-4 inline mr-1" />
                    Warranty has expired. For out-of-warranty support, please <Link to="/page/contact" className="underline">contact us</Link>.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Search Form Component
const SearchForm = ({ orderId, setOrderId, setSubmitted, handleSubmit }) => (
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
);

// Login Prompt Component
const LoginPrompt = () => (
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
);

// Empty State Component
const EmptyState = ({ isLoggedIn }) => (
  <div className="text-center py-12 bg-white rounded-xl shadow-sm">
    <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
    <p className="text-gray-500 text-lg">No warranty products found</p>
    {isLoggedIn ? (
      <>
        <p className="text-gray-400 text-sm mt-1">Warranties appear here once your order is delivered</p>
        <Link to="/dashboard/orders" className="inline-flex items-center gap-2 mt-4 text-primary-600 hover:text-primary-700 text-sm font-medium">
          <Truck className="w-4 h-4" />
          Track your orders
        </Link>
      </>
    ) : (
      <p className="text-gray-400 text-sm mt-1">Make sure the order has been delivered and has warranty products</p>
    )}
  </div>
);

export default WarrantyCheck;
