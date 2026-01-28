// FILE: apps/web/src/pages/dashboard/admin/OrderDetail.jsx
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import { formatCurrency, formatDate } from '@/utils/format';
import { useToast } from '@/components/common/ToastContainer';
import CustomSelect from '@/components/common/CustomSelect';
import TrackingTimeline from '@/components/common/TrackingTimeline';
import { PLACEHOLDER_IMAGE_SM, handleImageError } from '@/utils/placeholders';

const AdminOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [newStatus, setNewStatus] = useState('');
  const [awbNumber, setAwbNumber] = useState('');
  const [carrier, setCarrier] = useState('Shiprocket');
  const [showCarrierForm, setShowCarrierForm] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ['admin-order', id],
    queryFn: async () => {
      const response = await api.get(`/admin/orders/${id}`);
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
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });

  // Get recommended carrier
  const { data: recommendedCarrier } = useQuery({
    queryKey: ['recommended-carrier', id],
    queryFn: async () => {
      const response = await api.get(`/shipping/orders/${id}/recommended?priority=cost`);
      return response.data.data;
    },
    enabled: !order?.shipment?.awb && !!order,
  });

  // Mutation for assigning carrier and AWB
  const assignCarrierMutation = useMutation({
    mutationFn: async ({ awb, carrier }) => {
      const response = await api.post(`/shipping/orders/${order.orderId}/carrier`, {
        awb,
        carrier,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Carrier assigned successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
      queryClient.invalidateQueries({ queryKey: ['tracking', order?.orderId] });
      setAwbNumber('');
      setShowCarrierForm(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to assign carrier');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status) => {
      const response = await api.put(`/admin/orders/${id}/status`, { status });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Order status updated successfully');
      queryClient.setQueryData(['admin-order', id], data.data);
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
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

  const handleAssignCarrier = () => {
    if (!awbNumber.trim()) {
      toast.error('Please enter AWB/tracking number');
      return;
    }
    assignCarrierMutation.mutate({ awb: awbNumber.trim(), carrier });
  };

  const handleUseRecommended = () => {
    if (recommendedCarrier?.recommended) {
      setCarrier(recommendedCarrier.recommended.carrier);
      setShowCarrierForm(true);
    }
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
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Order not found</h2>
        <Button onClick={() => navigate('/admin-dashboard/orders')} className="mt-4">
          Back to Orders
        </Button>
      </div>
    );
  }

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'pending_payment', label: 'Pending Payment' },
    { value: 'placed', label: 'Placed' },
    { value: 'paid', label: 'Paid' },
    { value: 'packed', label: 'Packed' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'out_for_delivery', label: 'Out for Delivery' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'returned', label: 'Returned' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Order #{order?.orderId || 'N/A'}</h1>
          <p className="text-gray-600 mt-1">Placed on {order?.createdAt ? formatDate(order.createdAt) : 'N/A'}</p>
        </div>
        <Button onClick={() => navigate('/admin-dashboard/orders')} variant="outline">
          Back to Orders
        </Button>
      </div>

      {/* Order Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">Order Status</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2 capitalize">{order.status?.replace('_', ' ') || 'Unknown'}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Amount</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(order.totals?.total || 0)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">Payment Status</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2 capitalize">{order.payment?.status || 'Unknown'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Items */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold mb-4">Order Items</h2>
          <div className="space-y-4">
            {(order.items || []).map((item, index) => (
              <div key={index} className="flex gap-4 pb-4 border-b last:border-0">
                <img
                  src={item?.image || PLACEHOLDER_IMAGE_SM}
                  alt={item?.name || 'Product'}
                  className="w-20 h-20 object-cover rounded"
                  onError={(e) => handleImageError(e, PLACEHOLDER_IMAGE_SM)}
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{item?.name || 'Unknown Product'}</h3>
                  {item?.variantName && (
                    <p className="text-sm text-gray-600">{item.variantName}</p>
                  )}
                  <p className="text-sm text-gray-600">Quantity: {item?.qty || 0}</p>
                  <p className="font-semibold text-gray-900">{formatCurrency(item?.priceSnapshot || 0)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer & Shipping Info */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold mb-4">Customer Information</h2>
            {order?.userId ? (
              <div className="space-y-2">
                <p className="text-sm"><span className="font-medium">Name:</span> {order.userId?.name || order.userId?._id || 'N/A'}</p>
                <p className="text-sm"><span className="font-medium">Email:</span> {order.userId?.email || 'N/A'}</p>
                {order.userId?.phone && <p className="text-sm"><span className="font-medium">Phone:</span> {order.userId.phone}</p>}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm"><span className="font-medium">Guest Order</span></p>
                <p className="text-sm"><span className="font-medium">Email:</span> {order?.guestEmail || 'N/A'}</p>
              </div>
            )}
          </div>

          {/* Shipping Address */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold mb-4">Shipping Address</h2>
            {order.shipTo ? (
              <div className="text-sm text-gray-700">
                <p className="font-semibold text-gray-900">{order.shipTo.fullName || 'N/A'}</p>
                <p>{order.shipTo.addressLine1 || ''}</p>
                {order.shipTo.addressLine2 && <p>{order.shipTo.addressLine2}</p>}
                <p>{order.shipTo.city || ''}, {order.shipTo.state || ''} {order.shipTo.zipCode || ''}</p>
                <p>{order.shipTo.country || ''}</p>
                <p className="mt-2">Phone: {order.shipTo.phone || 'N/A'}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No shipping address provided</p>
            )}
          </div>
        </div>
      </div>

      {/* Carrier Assignment Section - ADMIN ONLY */}
      {!order.shipment?.awb && order.status !== 'cancelled' && order.payment?.status === 'paid' && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">🚚 Assign Delivery Carrier</h2>

          {/* Recommended Carrier */}
          {recommendedCarrier?.recommended && !showCarrierForm && (
            <div className="mb-6 p-4 bg-white rounded-lg border-2 border-green-300">
              <h3 className="font-semibold text-gray-900 mb-3">Recommended Carrier (Best Cost)</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold text-gray-900">{recommendedCarrier.recommended?.carrier || 'N/A'}</p>
                  <p className="text-sm text-gray-600">
                    Rate: {formatCurrency(recommendedCarrier.recommended?.rate || 0)} |
                    Delivery: {recommendedCarrier.recommended?.estimatedDays || 'N/A'} days
                  </p>
                </div>
                <Button onClick={handleUseRecommended} variant="primary">
                  Use This Carrier
                </Button>
              </div>
            </div>
          )}

          {/* Manual Carrier Selection */}
          {!showCarrierForm && (
            <div className="text-center">
              <p className="text-gray-700 mb-4">or</p>
              <Button onClick={() => setShowCarrierForm(true)} variant="outline">
                Assign Carrier Manually
              </Button>
            </div>
          )}

          {/* Carrier Assignment Form */}
          {showCarrierForm && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Carrier *
                </label>
                <select
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Shiprocket">Shiprocket</option>
                  <option value="Delhivery">Delhivery</option>
                  <option value="BlueDart">BlueDart</option>
                  <option value="DTDC">DTDC</option>
                  <option value="FedEx">FedEx</option>
                  <option value="DHL">DHL</option>
                  <option value="India Post">India Post</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AWB / Tracking Number *
                </label>
                <input
                  type="text"
                  value={awbNumber}
                  onChange={(e) => setAwbNumber(e.target.value)}
                  placeholder="Enter tracking number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowCarrierForm(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAssignCarrier}
                  variant="primary"
                  fullWidth
                  loading={assignCarrierMutation.isPending}
                >
                  Assign Carrier
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Show Assigned Carrier Info */}
      {order.shipment?.awb && (
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900">Carrier Assigned</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-gray-700">Carrier:</span>
              <p className="text-lg font-semibold text-gray-900">{order.shipment?.carrier || 'N/A'}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">AWB Number:</span>
              <p className="text-lg font-mono font-semibold text-gray-900">{order.shipment?.awb || 'N/A'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Shipment Tracking */}
      {order.shipment?.awb && trackingData?.data && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold mb-4">Shipment Tracking</h2>
          <TrackingTimeline events={trackingData?.data?.events || []} />
        </div>
      )}

      {/* Update Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold mb-4">Update Order Status</h2>
        <div className="flex gap-4">
          <div className="flex-1">
            <CustomSelect
              value={newStatus}
              onChange={(value) => setNewStatus(value)}
              options={statusOptions}
              placeholder="Select new status"
            />
          </div>
          <Button
            onClick={handleUpdateStatus}
            variant="primary"
            loading={updateStatusMutation.isPending}
          >
            Update Status
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminOrderDetail;
