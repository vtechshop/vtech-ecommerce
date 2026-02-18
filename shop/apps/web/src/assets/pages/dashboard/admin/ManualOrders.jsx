// FILE: apps/web/src/pages/dashboard/admin/ManualOrders.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import { useToast } from '@/components/common/ToastContainer';
import { formatCurrency } from '@/utils/format';
import { Plus, Search, Store, Phone, X, Trash2, ShieldCheck, ChevronDown, ChevronUp, Send, Package, Hash, Receipt, Pencil, Ban, AlertTriangle, RefreshCw } from 'lucide-react';

const ManualOrders = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [expandedOrder, setExpandedOrder] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['manual-orders', page, search, sourceFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.append('search', search);
      if (sourceFilter !== 'all') params.append('source', sourceFilter);
      const res = await api.get(`/admin/manual-orders?${params}`);
      return res.data;
    },
  });

  const orders = data?.data || [];
  const pagination = data?.pagination;

  // Stats
  const totalOrders = pagination?.total || orders.length;
  const inStoreCount = orders.filter(o => o.source === 'in-store').length;
  const phoneCount = orders.filter(o => o.source === 'phone').length;
  const warrantyCount = orders.filter(o => o.items?.some(i => i.warranty?.hasWarranty)).length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.totals?.total || 0), 0);

  const sendWhatsAppReceipt = (order) => {
    const phone = order.customerPhone?.replace(/\D/g, '');
    const itemsList = order.items?.map(i => `- ${i.name} x${i.qty}: ${formatCurrency(i.priceSnapshot * i.qty)}`).join('\n') || '';
    const warrantyItems = order.items?.filter(i => i.warranty?.hasWarranty) || [];
    const warrantyInfo = warrantyItems.length > 0
      ? `\n\n*Warranty Info:*\n${warrantyItems.map(i => `- ${i.name}: ${i.warranty.duration} ${i.warranty.durationType}${i.warranty.expiresAt ? ` (expires ${new Date(i.warranty.expiresAt).toLocaleDateString('en-IN')})` : ''}`).join('\n')}`
      : '';
    const message = encodeURIComponent(
      `*V-Tech Kitchen - Purchase Receipt*\n\nOrder: ${order.orderId}\nDate: ${new Date(order.createdAt).toLocaleDateString('en-IN')}\nCustomer: ${order.shipTo?.fullName}\n\n*Items:*\n${itemsList}\n\n*Total: ${formatCurrency(order.totals?.total)}*\nPayment: ${order.payment?.method}${warrantyInfo}\n\nThank you for your purchase! Check warranty anytime at: ${window.location.origin}/warranty-check`
    );
    window.open(`https://wa.me/91${phone}?text=${message}`, '_blank');
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['manual-orders'] });

  const isCancelled = (order) => order.status === 'cancelled';

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Manual Orders</h1>
          <p className="text-sm text-gray-500 mt-1">In-store and phone sales with warranty tracking</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button onClick={refetch} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <Button onClick={() => setShowModal(true)} className="flex-1 sm:flex-none">
            <Plus className="w-4 h-4 mr-2" /> Create Manual Order
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg"><Package className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" /></div>
            <div>
              <div className="text-lg sm:text-2xl font-bold text-gray-900">{totalOrders}</div>
              <div className="text-xs text-gray-500">Total Orders</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg"><Store className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" /></div>
            <div>
              <div className="text-lg sm:text-2xl font-bold text-gray-900">{inStoreCount}</div>
              <div className="text-xs text-gray-500">In-Store</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-sky-100 rounded-lg"><Phone className="w-4 h-4 sm:w-5 sm:h-5 text-sky-600" /></div>
            <div>
              <div className="text-lg sm:text-2xl font-bold text-gray-900">{phoneCount}</div>
              <div className="text-xs text-gray-500">Phone Orders</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg"><ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" /></div>
            <div>
              <div className="text-lg sm:text-2xl font-bold text-gray-900">{warrantyCount}</div>
              <div className="text-xs text-gray-500">With Warranty</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-emerald-100 rounded-lg"><Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" /></div>
            <div>
              <div className="text-lg sm:text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</div>
              <div className="text-xs text-gray-500">Revenue</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by order ID, phone, or name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input w-full pl-10"
          />
        </div>
        <select
          value={sourceFilter}
          onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
          className="input"
        >
          <option value="all">All Sources</option>
          <option value="in-store">In-Store</option>
          <option value="phone">Phone</option>
        </select>
      </div>

      {/* Desktop Table (hidden on mobile) */}
      {isLoading ? <Spinner /> : (
        <>
          <div className="hidden lg:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-blue-100 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-8"></th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warranty</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                      No manual orders yet. Click "Create Manual Order" to add one.
                    </td>
                  </tr>
                ) : orders.map((order) => {
                  const warrantyItems = order.items?.filter(i => i.warranty?.hasWarranty) || [];
                  const isExpanded = expandedOrder === order._id;
                  const cancelled = isCancelled(order);
                  return (
                    <React.Fragment key={order._id}>
                      <tr className={cancelled ? 'bg-red-50/50 opacity-60' : 'hover:bg-blue-50'}>
                        <td className="px-4 py-4">
                          <button onClick={() => setExpandedOrder(isExpanded ? null : order._id)} className="text-gray-400 hover:text-gray-600">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono bg-blue-50 px-2 py-1 rounded">{order.orderId}</code>
                            {cancelled && <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded">CANCELLED</span>}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm font-medium text-gray-900">{order.shipTo?.fullName}</div>
                          <div className="text-xs text-gray-500">{order.customerPhone}</div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700">
                          {order.items?.map((item, i) => (
                            <div key={i} className="flex items-center gap-2">
                              {item.image && <img src={item.image} alt="" className="w-6 h-6 rounded object-cover" />}
                              <span className="truncate max-w-[180px]">{item.name}</span>
                              <span className="text-gray-400">x{item.qty}</span>
                            </div>
                          ))}
                        </td>
                        <td className="px-4 py-4 text-sm font-semibold">{formatCurrency(order.totals?.total)}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${
                            order.source === 'in-store' ? 'bg-purple-100 text-purple-700' : 'bg-sky-100 text-sky-700'
                          }`}>
                            {order.source === 'in-store' ? <Store className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                            {order.source === 'in-store' ? 'In-Store' : 'Phone'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700 capitalize">{order.payment?.method}</td>
                        <td className="px-4 py-4">
                          {warrantyItems.length > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                              <ShieldCheck className="w-3 h-3" /> {warrantyItems.length} item(s)
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">None</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1">
                            {!cancelled && (
                              <>
                                <button
                                  onClick={() => setEditingOrder(order)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Edit Order"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setCancellingOrder(order)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Cancel Order"
                                >
                                  <Ban className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => sendWhatsAppReceipt(order)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Send WhatsApp Receipt"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {/* Expanded Detail Row */}
                      {isExpanded && (
                        <tr className="bg-gray-50">
                          <td colSpan={10} className="px-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Order Items Detail */}
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-2">Order Items</h4>
                                <div className="space-y-2">
                                  {order.items?.map((item, i) => (
                                    <div key={i} className="flex items-center gap-3 bg-white p-3 rounded-lg border">
                                      {item.image && <img src={item.image} alt="" className="w-12 h-12 rounded object-cover" />}
                                      <div className="flex-1">
                                        <div className="font-medium text-sm">{item.name}</div>
                                        <div className="text-xs text-gray-500 flex items-center gap-2">
                                          {item.sku && <span>SKU: {item.sku}</span>}
                                          <span>Qty: {item.qty}</span>
                                          <span>{formatCurrency(item.priceSnapshot)} each</span>
                                        </div>
                                        {item.warranty?.hasWarranty && (
                                          <div className="flex items-center gap-1 mt-1 text-xs text-green-600">
                                            <ShieldCheck className="w-3 h-3" />
                                            {item.warranty.duration} {item.warranty.durationType} warranty
                                            {item.warranty.isActivated && <span className="text-green-700 font-medium"> (Active)</span>}
                                            {item.warranty.expiresAt && <span> - Expires: {new Date(item.warranty.expiresAt).toLocaleDateString('en-IN')}</span>}
                                          </div>
                                        )}
                                        {item.warranty?.warrantyCode && (
                                          <div className="text-xs mt-0.5">Code: <code className="bg-green-50 text-green-700 px-1 rounded">{item.warranty.warrantyCode}</code></div>
                                        )}
                                      </div>
                                      <div className="text-sm font-semibold">{formatCurrency(item.priceSnapshot * item.qty)}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              {/* Order Info */}
                              <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-gray-700 mb-2">Order Details</h4>
                                <div className="bg-white p-4 rounded-lg border space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Order ID</span>
                                    <code className="font-mono">{order.orderId}</code>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Customer</span>
                                    <span className="font-medium">{order.shipTo?.fullName}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Phone</span>
                                    <span>{order.customerPhone || order.shipTo?.phone}</span>
                                  </div>
                                  {order.guestEmail && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Email</span>
                                      <span>{order.guestEmail}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Payment</span>
                                    <span className="capitalize">{order.payment?.method} - {formatCurrency(order.payment?.amount)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Status</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                                      cancelled ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                    }`}>{order.status}</span>
                                  </div>
                                  {order.customerNotes && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Notes</span>
                                      <span className="text-gray-700">{order.customerNotes}</span>
                                    </div>
                                  )}
                                  {cancelled && order.cancellation?.reason && (
                                    <div className="pt-2 border-t">
                                      <div className="flex justify-between text-red-600">
                                        <span className="font-medium">Cancel Reason</span>
                                        <span>{order.cancellation.reason}</span>
                                      </div>
                                      {order.cancellation.cancelledAt && (
                                        <div className="flex justify-between text-xs text-red-500 mt-1">
                                          <span>Cancelled At</span>
                                          <span>{new Date(order.cancellation.cancelledAt).toLocaleString('en-IN')}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  <div className="flex justify-between pt-2 border-t font-semibold">
                                    <span>Total</span>
                                    <span className="text-primary-700">{formatCurrency(order.totals?.total)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout (visible on mobile/tablet, hidden on desktop) */}
          <div className="lg:hidden space-y-3">
            {orders.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
                No manual orders yet. Tap "Create Manual Order" to add one.
              </div>
            ) : orders.map((order) => {
              const warrantyItems = order.items?.filter(i => i.warranty?.hasWarranty) || [];
              const isExpanded = expandedOrder === order._id;
              const cancelled = isCancelled(order);
              return (
                <div key={order._id} className={`bg-white rounded-lg border shadow-sm overflow-hidden ${cancelled ? 'border-red-200 opacity-70' : 'border-gray-200'}`}>
                  {/* Card Header */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-xs font-mono bg-blue-50 px-2 py-0.5 rounded">{order.orderId}</code>
                        {cancelled && <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded">CANCELLED</span>}
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
                          order.source === 'in-store' ? 'bg-purple-100 text-purple-700' : 'bg-sky-100 text-sky-700'
                        }`}>
                          {order.source === 'in-store' ? <Store className="w-2.5 h-2.5" /> : <Phone className="w-2.5 h-2.5" />}
                          {order.source === 'in-store' ? 'Store' : 'Phone'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                        {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{order.shipTo?.fullName}</div>
                        <div className="text-xs text-gray-500">{order.customerPhone}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-900">{formatCurrency(order.totals?.total)}</div>
                        <div className="text-xs text-gray-500 capitalize">{order.payment?.method}</div>
                      </div>
                    </div>

                    {/* Items summary */}
                    <div className="text-xs text-gray-600 mb-2">
                      {order.items?.map((item, i) => (
                        <span key={i}>{i > 0 && ', '}{item.name} x{item.qty}</span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {warrantyItems.length > 0 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-green-100 text-green-700">
                            <ShieldCheck className="w-2.5 h-2.5" /> {warrantyItems.length} warranty
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {!cancelled && (
                          <>
                            <button
                              onClick={() => setEditingOrder(order)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setCancellingOrder(order)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Cancel"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => sendWhatsAppReceipt(order)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                          title="WhatsApp"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setExpandedOrder(isExpanded ? null : order._id)}
                          className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t bg-gray-50 p-4 space-y-3">
                      {order.items?.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 bg-white p-2.5 rounded-lg border text-sm">
                          {item.image && <img src={item.image} alt="" className="w-10 h-10 rounded object-cover" />}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{item.name}</div>
                            <div className="text-xs text-gray-500">Qty: {item.qty} | {formatCurrency(item.priceSnapshot)} each</div>
                            {item.warranty?.hasWarranty && (
                              <div className="flex items-center gap-1 text-xs text-green-600 mt-0.5">
                                <ShieldCheck className="w-3 h-3" />
                                {item.warranty.duration} {item.warranty.durationType}
                                {item.warranty.isActivated && <span className="font-medium"> (Active)</span>}
                              </div>
                            )}
                          </div>
                          <div className="text-sm font-semibold">{formatCurrency(item.priceSnapshot * item.qty)}</div>
                        </div>
                      ))}
                      {order.guestEmail && (
                        <div className="text-xs text-gray-500">Email: {order.guestEmail}</div>
                      )}
                      {order.customerNotes && (
                        <div className="text-xs text-gray-500">Notes: {order.customerNotes}</div>
                      )}
                      {cancelled && order.cancellation?.reason && (
                        <div className="bg-red-50 rounded-lg p-2.5 text-xs text-red-700">
                          <span className="font-medium">Cancel Reason:</span> {order.cancellation.reason}
                          {order.cancellation.cancelledAt && (
                            <div className="text-red-500 mt-0.5">{new Date(order.cancellation.cancelledAt).toLocaleString('en-IN')}</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: pagination.totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-1 rounded text-sm ${page === i + 1 ? 'bg-primary-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <CreateManualOrderModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); invalidate(); }}
        />
      )}

      {/* Edit Modal */}
      {editingOrder && (
        <EditManualOrderModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSuccess={() => { setEditingOrder(null); invalidate(); }}
        />
      )}

      {/* Cancel Dialog */}
      {cancellingOrder && (
        <CancelManualOrderDialog
          order={cancellingOrder}
          onClose={() => setCancellingOrder(null)}
          onSuccess={() => { setCancellingOrder(null); invalidate(); }}
        />
      )}
    </div>
  );
};

// ─── Edit Manual Order Modal ────────────────────────────────────────────────
const EditManualOrderModal = ({ order, onClose, onSuccess }) => {
  const toast = useToast();
  const [form, setForm] = useState({
    customerName: order.shipTo?.fullName || '',
    customerPhone: order.customerPhone || order.shipTo?.phone || '',
    customerEmail: order.guestEmail || '',
    source: order.source || 'in-store',
    paymentMethod: order.payment?.method || 'cash',
    customerNotes: order.customerNotes || '',
    internalNotes: order.internalNotes || '',
  });

  const updateMutation = useMutation({
    mutationFn: (data) => api.put(`/admin/manual-orders/${order._id}`, data),
    onSuccess: () => {
      toast.success('Order updated successfully');
      onSuccess();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to update order');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(form);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Edit Order</h2>
            <code className="text-xs text-gray-500">{order.orderId}</code>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-5 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Customer Name</label>
                <input type="text" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} className="input w-full" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
                <input type="text" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} className="input w-full" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
              <input type="email" value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} className="input w-full" placeholder="Optional" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Source</label>
                <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="input w-full">
                  <option value="in-store">In-Store</option>
                  <option value="phone">Phone Order</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Payment Method</label>
                <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="input w-full">
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Customer Notes</label>
              <textarea value={form.customerNotes} onChange={(e) => setForm({ ...form, customerNotes: e.target.value })} className="input w-full" rows={2} placeholder="Notes visible to customer..." />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Internal Notes</label>
              <textarea value={form.internalNotes} onChange={(e) => setForm({ ...form, internalNotes: e.target.value })} className="input w-full" rows={2} placeholder="Admin-only notes..." />
            </div>

            {/* Read-only items summary */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Items (read-only)</label>
              <div className="bg-gray-50 rounded-lg border p-3 space-y-1.5">
                {order.items?.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 truncate mr-2">{item.name} x{item.qty}</span>
                    <span className="font-medium whitespace-nowrap">{formatCurrency(item.priceSnapshot * item.qty)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t font-semibold text-sm">
                  <span>Total</span>
                  <span>{formatCurrency(order.totals?.total)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-5 sm:px-6 py-4 border-t bg-gray-50">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Cancel Manual Order Dialog ─────────────────────────────────────────────
const CancelManualOrderDialog = ({ order, onClose, onSuccess }) => {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const warrantyItems = order.items?.filter(i => i.warranty?.hasWarranty) || [];

  const cancelMutation = useMutation({
    mutationFn: (data) => api.put(`/admin/manual-orders/${order._id}/cancel`, data),
    onSuccess: (res) => {
      const voided = res.data?.warrantiesVoided || 0;
      toast.success(`Order cancelled${voided > 0 ? ` and ${voided} warranty(s) voided` : ''}`);
      onSuccess();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to cancel order');
    },
  });

  const handleCancel = () => {
    if (!reason.trim()) return toast.error('Please enter a cancellation reason');
    cancelMutation.mutate({ reason: reason.trim() });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="px-5 sm:px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-full">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Cancel Order</h2>
              <code className="text-xs text-gray-500">{order.orderId}</code>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          <div className="bg-red-50 rounded-lg p-3 text-sm text-red-700">
            <p className="font-medium mb-1">This action cannot be undone.</p>
            <ul className="text-xs space-y-0.5 text-red-600">
              <li>- Order status will be set to "Cancelled"</li>
              <li>- Payment ({formatCurrency(order.totals?.total)}) will be marked as refunded</li>
              {warrantyItems.length > 0 && (
                <li>- {warrantyItems.length} warranty(s) will be voided</li>
              )}
            </ul>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <div className="font-medium text-gray-700">{order.shipTo?.fullName}</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {order.items?.map(i => i.name).join(', ')} | {formatCurrency(order.totals?.total)}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Cancellation Reason <span className="text-red-500">*</span></label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="input w-full"
              rows={3}
              placeholder="Why is this order being cancelled?"
              required
              autoFocus
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 sm:px-6 py-4 border-t bg-gray-50 rounded-b-xl">
          <Button type="button" variant="outline" onClick={onClose}>Keep Order</Button>
          <button
            onClick={handleCancel}
            disabled={cancelMutation.isPending || !reason.trim()}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Order'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Create Manual Order Modal ──────────────────────────────────────────────
const CreateManualOrderModal = ({ onClose, onSuccess }) => {
  const toast = useToast();
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    source: 'in-store',
    paymentMethod: 'cash',
    notes: '',
    discount: 0,
  });
  const [items, setItems] = useState([]);
  const [productSearch, setProductSearch] = useState('');

  // Product search
  const { data: searchResults } = useQuery({
    queryKey: ['product-search', productSearch],
    queryFn: async () => {
      if (!productSearch || productSearch.length < 2) return [];
      const res = await api.get(`/admin/products?search=${encodeURIComponent(productSearch)}&limit=10`);
      return res.data?.data || [];
    },
    enabled: productSearch.length >= 2,
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/admin/manual-orders', data),
    onSuccess: (res) => {
      toast.success(`Order ${res.data?.data?.orderId} created successfully!`);
      onSuccess();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to create order');
    },
  });

  const addProduct = (product) => {
    if (items.find(i => i.productId === product._id)) return;
    setItems([...items, {
      productId: product._id,
      name: product.name,
      image: product.images?.[0] || '',
      price: product.price,
      qty: 1,
      hasWarranty: product.hasWarranty,
      serialNumber: '',
    }]);
    setProductSearch('');
  };

  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  const updateItem = (idx, field, value) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    setItems(updated);
  };

  const subtotal = items.reduce((sum, i) => sum + (i.price * i.qty), 0);
  const discount = parseFloat(form.discount) || 0;
  const total = Math.max(0, subtotal - discount);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!items.length) return toast.error('Add at least one product');
    createMutation.mutate({
      ...form,
      items: items.map(i => ({ productId: i.productId, qty: i.qty, price: i.price, serialNumber: i.serialNumber })),
      amountPaid: total,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">Create Manual Order</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-5 sm:p-6 space-y-5">
            {/* Customer Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Customer Name <span className="text-red-500">*</span></label>
                <input type="text" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} className="input w-full" required placeholder="Full name" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Phone <span className="text-red-500">*</span></label>
                <input type="text" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} className="input w-full" required placeholder="e.g. 9944556683" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email (optional)</label>
                <input type="email" value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} className="input w-full" placeholder="customer@email.com" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Source</label>
                <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="input w-full">
                  <option value="in-store">In-Store</option>
                  <option value="phone">Phone Order</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Payment Method</label>
                <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="input w-full">
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
            </div>

            {/* Product Search */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Add Products <span className="text-red-500">*</span></label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="input w-full pl-10"
                  placeholder="Search products by name or SKU..."
                />
                {searchResults?.length > 0 && productSearch.length >= 2 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {searchResults.map((p) => (
                      <button
                        key={p._id}
                        type="button"
                        onClick={() => addProduct(p)}
                        className="w-full px-4 py-2 text-left hover:bg-blue-50 flex items-center gap-3 text-sm"
                      >
                        {p.images?.[0] && <img src={p.images[0]} alt="" className="w-8 h-8 rounded object-cover" />}
                        <div className="flex-1 truncate">
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-gray-500">
                            SKU: {p.sku} | {formatCurrency(p.price)}
                            {p.hasWarranty && <span className="text-green-600 ml-1">| Warranty</span>}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Items List */}
            {items.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                {/* Desktop items table */}
                <table className="hidden sm:table w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs text-gray-500">Product</th>
                      <th className="px-4 py-2 text-left text-xs text-gray-500 w-20">Qty</th>
                      <th className="px-4 py-2 text-left text-xs text-gray-500 w-28">Price</th>
                      <th className="px-4 py-2 text-left text-xs text-gray-500 w-24">Subtotal</th>
                      <th className="px-4 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.map((item, idx) => (
                      <React.Fragment key={idx}>
                        <tr>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              {item.image && <img src={item.image} alt="" className="w-8 h-8 rounded object-cover" />}
                              <div>
                                <div className="font-medium truncate max-w-[200px]">{item.name}</div>
                                {item.hasWarranty && (
                                  <span className="text-xs text-green-600 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Warranty</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <input type="number" min={1} value={item.qty} onChange={(e) => updateItem(idx, 'qty', parseInt(e.target.value) || 1)} className="input w-16 text-center" />
                          </td>
                          <td className="px-4 py-2">
                            <input type="number" min={0} value={item.price} onChange={(e) => updateItem(idx, 'price', parseFloat(e.target.value) || 0)} className="input w-24" />
                          </td>
                          <td className="px-4 py-2 font-medium">{formatCurrency(item.price * item.qty)}</td>
                          <td className="px-4 py-2">
                            <button type="button" onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                        {/* Serial Number row for warranty products */}
                        {item.hasWarranty && (
                          <tr className="bg-green-50/50">
                            <td colSpan={5} className="px-4 py-1.5">
                              <div className="flex items-center gap-2">
                                <Hash className="w-3.5 h-3.5 text-green-600" />
                                <label className="text-xs font-medium text-green-700">Serial No:</label>
                                <input
                                  type="text"
                                  value={item.serialNumber}
                                  onChange={(e) => updateItem(idx, 'serialNumber', e.target.value)}
                                  className="input text-xs py-1 px-2 w-48"
                                  placeholder="Enter product serial number"
                                />
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={3} className="px-4 py-2 text-right text-sm text-gray-500">Subtotal:</td>
                      <td className="px-4 py-2 font-medium">{formatCurrency(subtotal)}</td>
                      <td></td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="px-4 py-1 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-sm text-gray-500">Discount:</span>
                          <input
                            type="number"
                            min={0}
                            value={form.discount}
                            onChange={(e) => setForm({ ...form, discount: e.target.value })}
                            className="input w-24 text-sm py-1"
                            placeholder="0"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-1 font-medium text-red-600">{discount > 0 ? `-${formatCurrency(discount)}` : '-'}</td>
                      <td></td>
                    </tr>
                    <tr className="border-t">
                      <td colSpan={3} className="px-4 py-2 text-right font-semibold">Total:</td>
                      <td className="px-4 py-2 font-bold text-primary-700 text-lg">{formatCurrency(total)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>

                {/* Mobile items list */}
                <div className="sm:hidden divide-y">
                  {items.map((item, idx) => (
                    <div key={idx} className="p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        {item.image && <img src={item.image} alt="" className="w-10 h-10 rounded object-cover" />}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{item.name}</div>
                          {item.hasWarranty && (
                            <span className="text-xs text-green-600 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Warranty</span>
                          )}
                        </div>
                        <button type="button" onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="text-xs text-gray-500">Qty</label>
                          <input type="number" min={1} value={item.qty} onChange={(e) => updateItem(idx, 'qty', parseInt(e.target.value) || 1)} className="input w-full text-center text-sm" />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-gray-500">Price</label>
                          <input type="number" min={0} value={item.price} onChange={(e) => updateItem(idx, 'price', parseFloat(e.target.value) || 0)} className="input w-full text-sm" />
                        </div>
                        <div className="text-right">
                          <label className="text-xs text-gray-500">Total</label>
                          <div className="text-sm font-semibold">{formatCurrency(item.price * item.qty)}</div>
                        </div>
                      </div>
                      {item.hasWarranty && (
                        <div className="flex items-center gap-2 bg-green-50/50 rounded p-2">
                          <Hash className="w-3.5 h-3.5 text-green-600" />
                          <input
                            type="text"
                            value={item.serialNumber}
                            onChange={(e) => updateItem(idx, 'serialNumber', e.target.value)}
                            className="input text-xs py-1 px-2 flex-1"
                            placeholder="Serial number"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="bg-gray-50 p-3 space-y-1.5">
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Subtotal</span><span className="font-medium">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-sm text-gray-500">
                      <span>Discount</span>
                      <input type="number" min={0} value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} className="input w-20 text-xs py-1 text-right" placeholder="0" />
                    </div>
                    <div className="flex justify-between text-sm font-bold border-t pt-1.5">
                      <span>Total</span><span className="text-primary-700">{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Notes (optional)</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="input w-full"
                rows={2}
                placeholder="Internal notes about this order..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 sm:px-6 py-4 border-t bg-gray-50">
            <div className="text-sm text-gray-500">
              {items.length} item(s) | Total: <span className="font-semibold text-gray-900">{formatCurrency(total)}</span>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1 sm:flex-none">Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || items.length === 0} className="flex-1 sm:flex-none">
                {createMutation.isPending ? 'Creating...' : 'Create Order'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManualOrders;
