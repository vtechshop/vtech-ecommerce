// FILE: apps/web/src/pages/dashboard/vendor/VendorOrderDetail.jsx
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { FileDown } from 'lucide-react';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import { formatCurrency, formatDate } from '@/utils/format';
import { useToast } from '@/components/common/ToastContainer';
import CustomSelect from '@/components/common/CustomSelect';
import TrackingTimeline from '@/components/common/TrackingTimeline';
import { PLACEHOLDER_IMAGE_SM, handleImageError } from '@/utils/placeholders';

const VendorOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [newStatus, setNewStatus] = useState('');

  const downloadInvoice = async () => {
    try {
      const res = await api.get(`/vendors/orders/${id}/invoice`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download invoice');
    }
  };
  const [carrierName, setCarrierName] = useState('');
  const [awbNumber, setAwbNumber] = useState('');
  const [assignMode, setAssignMode] = useState('manual'); // 'manual' or 'auto'

  const { data: order, isLoading } = useQuery({
    queryKey: ['vendor-order', id],
    queryFn: async () => {
      const response = await api.get(`/orders/${id}`);
      return response.data.data;
    },
  });

  // Fetch tracking information if order has AWB
  const { data: trackingData } = useQuery({
    queryKey: ['tracking', order?.orderId],
    queryFn: async () => {
      const response = await api.get(`/shipping/tracking?orderId=${order.orderId}`);
      return response.data;
    },
    enabled: !!order?.orderId && !!order?.shipment?.awb,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    staleTime: 3 * 60 * 1000, // Consider data stale after 3 minutes
  });

  // Manual carrier assignment (vendor enters carrier + AWB)
  const manualCarrierMutation = useMutation({
    mutationFn: async ({ carrier, awb }) => {
      const response = await api.post(`/shipping/orders/${id}/carrier`, { carrier, awb });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Carrier and AWB assigned successfully');
      queryClient.invalidateQueries({ queryKey: ['vendor-order', id] });
      setCarrierName('');
      setAwbNumber('');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to assign carrier');
    },
  });

  // Auto carrier assignment (via Delhivery/Shiprocket API)
  const autoCarrierMutation = useMutation({
    mutationFn: async (carrier) => {
      const response = await api.post(`/shipping/orders/${id}/assign-carrier`, { carrier });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Shipment created! AWB: ${data.data?.awb || 'assigned'}`);
      queryClient.invalidateQueries({ queryKey: ['vendor-order', id] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create shipment. Try manual assignment.');
    },
  });

  // Fetch available carriers for auto-assign
  const { data: carriers } = useQuery({
    queryKey: ['carriers'],
    queryFn: async () => {
      const response = await api.get('/shipping/carriers');
      return response.data.data?.carriers || response.data.data || [];
    },
    enabled: !!order && !order.shipment?.awb,
  });

  const handleManualAssign = () => {
    if (!carrierName.trim()) return toast.error('Enter courier/carrier name');
    if (!awbNumber.trim()) return toast.error('Enter AWB/tracking number');
    manualCarrierMutation.mutate({ carrier: carrierName.trim(), awb: awbNumber.trim() });
  };

  const handleAutoAssign = (carrier) => {
    autoCarrierMutation.mutate(carrier);
  };

  const updateStatusMutation = useMutation({
    mutationFn: async (status) => {
      const response = await api.put(`/vendors/orders/${id}/status`, { status });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Order status updated successfully');
      // Update the cache with the new data
      queryClient.setQueryData(['vendor-order', id], data.data);
      queryClient.invalidateQueries({ queryKey: ['vendor-orders'] });
      setNewStatus('');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update status');
    },
  });

  const handleUpdateStatus = () => {
    if (!newStatus) {
      toast.error('Please select a status');
      return;
    }
    updateStatusMutation.mutate(newStatus);
  };


  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <h3 className="text-xl font-semibold mb-2">Order not found</h3>
        <Link to="/vendor-dashboard/orders">
          <Button variant="primary">Back to Orders</Button>
        </Link>
      </div>
    );
  }

  // Sequential order flow - vendor can only move forward
  const statusFlow = ['placed', 'paid', 'packed', 'shipped', 'delivered'];
  const currentIndex = statusFlow.indexOf(order?.status);

  const statusOptions = [
    { value: 'packed', label: 'Packed' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/vendor-dashboard/orders')}
          className="flex items-center text-gray-700 hover:text-gray-900 mb-4 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Orders
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Order {order.orderId}</h1>
            <p className="text-gray-700">Placed on {formatDate(order.createdAt)}</p>
            <button
              onClick={downloadInvoice}
              className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <FileDown className="w-4 h-4" />
              Download Invoice
            </button>
          </div>
          <span
            className={`px-4 py-2 rounded-full text-sm font-semibold ${
              order.status === 'delivered'
                ? 'bg-green-100 text-green-800'
                : order.status === 'cancelled'
                ? 'bg-red-100 text-red-800'
                : order.status === 'shipped'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {String(order.status || '')
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (c) => c.toUpperCase())}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold mb-4">Order Items</h2>
            <div className="space-y-4">
              {(order.items || []).map((item, index) => (
                <div key={index} className="flex gap-4 pb-4 border-b last:border-b-0">
                  <img
                    src={item.image || PLACEHOLDER_IMAGE_SM}
                    alt={item.name}
                    className="w-20 h-20 object-cover rounded"
                    onError={(e) => handleImageError(e, PLACEHOLDER_IMAGE_SM)}
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{item.name}</h3>
                    {item.variantName && (
                      <p className="text-sm text-gray-700">Variant: {item.variantName}</p>
                    )}
                    {item.sku && (
                      <p className="text-sm text-gray-700">SKU: {item.sku}</p>
                    )}
                    <p className="text-sm text-gray-700">Quantity: {item.qty}</p>
                    <p className="text-sm text-gray-700">
                      Price: {formatCurrency(item.priceSnapshot)}
                    </p>

                    {/* Warranty Badge */}
                    {item.warranty?.hasWarranty && (
                      <div className="mt-2 inline-flex items-center gap-2 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs">
                        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span className="text-blue-700 font-medium">
                          {item.warranty.duration} {item.warranty.durationType} Warranty
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      {formatCurrency((item.priceSnapshot || 0) * (item.qty || 0))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold mb-4">Shipping Address</h2>
            {order.shipTo ? (
              <div className="text-gray-700 space-y-1">
                <p className="font-semibold text-lg">{order.shipTo.fullName}</p>
                <p className="text-gray-700">
                  <svg className="w-4 h-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {order.shipTo.phone}
                </p>
                <div className="mt-3 pt-3 border-t">
                  <p>{order.shipTo.addressLine1}</p>
                  {order.shipTo.addressLine2 && <p>{order.shipTo.addressLine2}</p>}
                  <p>
                    {order.shipTo.city}, {order.shipTo.state} {order.shipTo.zipCode}
                  </p>
                  <p className="font-medium">{order.shipTo.country}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No shipping address available</p>
            )}
          </div>

          {/* Carrier Assignment - Vendor can assign */}
          {!order.shipment?.awb && order.status !== 'cancelled' && order.status !== 'pending' && (
            <div className="bg-white rounded-lg shadow-sm border-2 border-amber-200 p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-900">Assign Courier</h2>

              {/* Toggle: Manual vs Auto */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setAssignMode('manual')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    assignMode === 'manual'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Manual Entry
                </button>
                <button
                  onClick={() => setAssignMode('auto')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    assignMode === 'auto'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Auto (API)
                </button>
              </div>

              {assignMode === 'manual' ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">Select the courier and enter the tracking number.</p>
                  <select
                    value={carrierName}
                    onChange={(e) => setCarrierName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select Courier</option>
                    <option value="Delhivery">Delhivery</option>
                    <option value="Shiprocket">Shiprocket</option>
                    <option value="BlueDart">BlueDart</option>
                    <option value="DTDC">DTDC</option>
                    <option value="FedEx">FedEx</option>
                    <option value="DHL">DHL</option>
                    <option value="India Post">India Post</option>
                    <option value="Other">Other</option>
                  </select>
                  <input
                    type="text"
                    value={awbNumber}
                    onChange={(e) => setAwbNumber(e.target.value)}
                    placeholder="AWB / Tracking Number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={handleManualAssign}
                    loading={manualCarrierMutation.isPending}
                    disabled={!carrierName.trim() || !awbNumber.trim()}
                  >
                    Assign Courier
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Auto-create shipment via carrier API. AWB will be generated automatically.
                  </p>
                  {carriers && carriers.length > 0 ? (
                    <div className="space-y-2">
                      {carriers.map((c) => (
                        <button
                          key={c.name || c}
                          onClick={() => handleAutoAssign(c.name || c)}
                          disabled={autoCarrierMutation.isPending}
                          className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left"
                        >
                          <div>
                            <span className="font-semibold text-sm capitalize">{c.name || c}</span>
                            {c.description && (
                              <p className="text-xs text-gray-500">{c.description}</p>
                            )}
                          </div>
                          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-lg text-center">
                      <p className="text-sm text-gray-600">No carrier APIs configured.</p>
                      <p className="text-xs text-gray-500 mt-1">Use manual entry or ask admin to configure Delhivery/Shiprocket API keys.</p>
                    </div>
                  )}
                  {autoCarrierMutation.isPending && (
                    <div className="flex items-center gap-2 text-sm text-primary-600">
                      <Spinner size="sm" /> Creating shipment...
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Show Tracking Info if AWB exists */}
          {order.shipment?.awb && (
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-900">✅ Carrier Assigned</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Carrier:</span>
                  <span className="text-sm font-semibold text-gray-900">{order.shipment.carrier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">AWB Number:</span>
                  <span className="text-sm font-mono font-semibold text-gray-900">{order.shipment.awb}</span>
                </div>
              </div>
            </div>
          )}

          {/* Shipment Tracking */}
          {order.shipment?.awb && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold mb-4">Shipment Tracking</h2>
              <TrackingTimeline
                tracking={trackingData?.tracking}
                order={trackingData?.order || order}
              />
            </div>
          )}

          {/* Order Timeline/Events */}
          {order.events && order.events.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold mb-4">Order Timeline</h2>
              <div className="space-y-4">
                {order.events.slice().reverse().map((event, index) => {
                  const isLatest = index === 0;
                  return (
                    <div key={index} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${
                          isLatest ? 'bg-primary-600' : 'bg-green-500'
                        }`}></div>
                        {index < order.events.length - 1 && (
                          <div className="w-px h-full bg-gray-200 my-1"></div>
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="font-semibold capitalize">{event.status?.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-gray-700">{event.description}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(event.timestamp)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Update Order Status */}
          {order.status !== 'cancelled' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold mb-4">Update Status</h2>

              {/* Show hint if no carrier assigned */}
              {!order.shipment?.awb && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Assign a courier above before marking as "Shipped".
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <CustomSelect
                  value={newStatus}
                  onChange={setNewStatus}
                  options={statusOptions.filter(opt => {
                    if (opt.value === order.status) return false;
                    // Only show forward statuses
                    if (opt.value === 'cancelled') return true;
                    const optIndex = statusFlow.indexOf(opt.value);
                    if (optIndex <= currentIndex) return false;
                    // Block "shipped" if no carrier assigned
                    if (!order.shipment?.awb && opt.value === 'shipped') return false;
                    return true;
                  })}
                  placeholder="Select new status"
                />
                <Button
                  variant="primary"
                  fullWidth
                  onClick={handleUpdateStatus}
                  loading={updateStatusMutation.isPending}
                  disabled={!newStatus}
                >
                  Update Status
                </Button>
              </div>
            </div>
          )}

          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold mb-4">Order Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal:</span>
                <span>{formatCurrency(order.totals?.subtotal || 0)}</span>
              </div>
              {order.totals?.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span>-{formatCurrency(order.totals.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-700">
                <span>Shipping:</span>
                <span>{formatCurrency(order.totals?.shipping || 0)}</span>
              </div>
              {order.totals?.tax > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Tax:</span>
                  <span>{formatCurrency(order.totals.tax)}</span>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>{formatCurrency(order.totals?.total || 0)}</span>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold mb-4">Payment Information</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-700">Method:</span>
                <span className="font-semibold capitalize">
                  {order.payment?.method || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Status:</span>
                <span
                  className={`font-semibold ${
                    order.payment?.status === 'paid' || order.payment?.status === 'captured'
                      ? 'text-green-600'
                      : 'text-gray-700'
                  }`}
                >
                  {String(order.payment?.status || 'pending')
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
              </div>
              {order.payment?.transactionId && (
                <div>
                  <span className="text-gray-700 text-sm">Transaction ID:</span>
                  <p className="text-sm font-mono bg-blue-100 p-2 rounded mt-1 break-all">
                    {order.payment.transactionId}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Customer Info */}
          {order.isGuest ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-semibold text-blue-900">Guest Order</p>
                  <p className="text-sm text-blue-700">{order.guestEmail}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold mb-2">Customer</h2>
              <p className="text-gray-700">Registered Customer</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorOrderDetail;
