// FILE: apps/web/src/pages/dashboard/admin/Orders.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Pagination from '@/components/common/Pagination';
import Spinner from '@/components/common/Spinner';
import CustomSelect from '@/components/common/CustomSelect';
import NewBadge from '@/components/common/NewBadge';
import { formatCurrency } from '@/utils/format';
import { getNewItemClasses, formatRelativeTime } from '@/utils/dateHelpers';
import { Eye, Search, Filter, Package, Truck, CheckCircle, XCircle } from 'lucide-react';

const Orders = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingOrder, setViewingOrder] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', page, statusFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', '20');
      if (statusFilter) params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await api.get(`/admin/orders?${params}`);
      return response.data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, description }) => {
      await api.put(`/admin/orders/${id}/status`, { status, description });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      alert('Order status updated successfully');
    },
  });

  const handleView = (order) => {
    setViewingOrder(order);
  };

  const handleStatusUpdate = (id, status, description) => {
    updateStatusMutation.mutate({ id, status, description });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'placed':
        return 'bg-primary-100 text-primary-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'shipped':
        return 'bg-secondary-100 text-secondary-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-gray-100 text-gray-900';
      default:
        return 'bg-gray-100 text-gray-900';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'placed':
        return <Package className="w-4 h-4" />;
      case 'paid':
        return <CheckCircle className="w-4 h-4" />;
      case 'processing':
        return <Package className="w-4 h-4" />;
      case 'shipped':
        return <Truck className="w-4 h-4" />;
      case 'delivered':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const orders = data?.data || [];
  const totalPages = Math.ceil((data?.meta?.total || 0) / 20);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Order Management</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="input pl-10 w-full"
            />
          </div>
          <CustomSelect
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All Orders' },
              { value: 'placed', label: 'Placed' },
              { value: 'paid', label: 'Paid' },
              { value: 'processing', label: 'Processing' },
              { value: 'shipped', label: 'Shipped' },
              { value: 'delivered', label: 'Delivered' },
              { value: 'cancelled', label: 'Cancelled' },
              { value: 'refunded', label: 'Refunded' },
            ]}
            placeholder="All Orders"
            className="w-full"
          />
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('');
              setPage(1);
            }}
            className="flex items-center gap-2"
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-sm">Order</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Customer</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Items</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Total</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Date</th>
                <th className="text-right py-3 px-4 font-semibold text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id} className={`border-b last:border-b-0 transition-colors ${getNewItemClasses(order.createdAt)}`}>
                  <td className="py-3 px-3 sm:px-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">#{order.orderId}</p>
                        <NewBadge createdAt={order.createdAt} />
                      </div>
                      <p className="text-xs text-gray-700">
                        ID: {order._id.slice(-8)} • {formatRelativeTime(order.createdAt)}
                      </p>
                    </div>
                  </td>
                  <td className="py-3 px-3 sm:px-4">
                    <div>
                      <p className="font-medium">{order.userId?.name || 'Guest'}</p>
                      <p className="text-xs text-gray-700">{order.userId?.email || order.email}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <div>
                      <p className="font-medium">{order.items?.length || 0} items</p>
                      <p className="text-xs text-gray-700">
                        {order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0} units
                      </p>
                    </div>
                  </td>
                  <td className="py-3 px-3 sm:px-4">
                    <div>
                      <p className="font-semibold">{formatCurrency(order.totals?.total || 0)}</p>
                      <p className="text-xs text-gray-700">
                        Tax: {formatCurrency(order.totals?.tax || 0)}
                      </p>
                    </div>
                  </td>
                  <td className="py-3 px-3 sm:px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {getStatusIcon(order.status)}
                      {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleView(order)}
                        className="text-blue-600 hover:text-blue-700 p-1"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {/* Order Details Modal */}
      {viewingOrder && (
        <OrderDetailsModal
          order={viewingOrder}
          onClose={() => setViewingOrder(null)}
          onStatusUpdate={handleStatusUpdate}
          isLoading={updateStatusMutation.isPending}
        />
      )}
    </div>
  );
};

// Order Details Modal Component
const OrderDetailsModal = ({ order, onClose, onStatusUpdate, isLoading }) => {
  const queryClient = useQueryClient();
  const [newStatus, setNewStatus] = useState(order.status);
  const [statusDescription, setStatusDescription] = useState('');
  const [selectedCarrier, setSelectedCarrier] = useState(null);

  // Assign carrier mutation
  const assignCarrierMutation = useMutation({
    mutationFn: async ({ carrier }) => {
      await api.post(`/shipping/orders/${order._id}/assign-carrier`, { carrier });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      alert('Shipping carrier assigned successfully!');
      setShowCarrierQuotes(false);
      onClose();
    },
    onError: (error) => {
      alert(error.response?.data?.message || 'Failed to assign carrier');
    },
  });

  const handleStatusUpdate = (e) => {
    e.preventDefault();
    onStatusUpdate(order._id, newStatus, statusDescription);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'placed':
        return 'bg-primary-100 text-primary-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'shipped':
        return 'bg-secondary-100 text-secondary-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-gray-100 text-gray-900';
      default:
        return 'bg-gray-100 text-gray-900';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">Order #{order.orderId}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Order Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Order Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Order ID</label>
                  <p className="text-sm font-mono">#{order.orderId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <p className="text-sm">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Total Amount</label>
                  <p className="text-sm font-semibold">{formatCurrency(order.totals?.total || 0)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Payment Method</label>
                  <p className="text-sm">{order.payment?.method || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Order Date</label>
                  <p className="text-sm">{new Date(order.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Customer Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Customer Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Name</label>
                  <p className="text-sm">{order.shipTo?.fullName || order.userId?.name || order.guestEmail || 'Guest'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <p className="text-sm">{order.userId?.email || order.guestEmail || order.email || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Phone</label>
                  <p className="text-sm">{order.shipTo?.phone || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Address</label>
                  {order.shipTo ? (
                    <p className="text-sm">
                      {order.shipTo.addressLine1}
                      {order.shipTo.addressLine2 && `, ${order.shipTo.addressLine2}`}
                      <br />
                      {order.shipTo.city}, {order.shipTo.state} {order.shipTo.zipCode}
                      <br />
                      {order.shipTo.country}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500">No address available</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Order Items</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-3">
                {order.items?.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div className="flex items-center gap-3">
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-700">Qty: {item.qty}</p>
                        {item.vendor && (
                          <p className="text-xs text-blue-600 font-medium mt-1 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                            Sold by: {item.vendor.storeName}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(item.priceSnapshot)}</p>
                      <p className="text-sm text-gray-700">
                        Total: {formatCurrency(item.priceSnapshot * item.qty)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Shipping Carrier Selection */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Shipping Carrier</h3>

            {/* Current Shipment Info */}
            {order.shipment?.carrier && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="w-5 h-5 text-blue-600" />
                  <p className="font-semibold text-blue-900">Assigned Carrier</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-700">Carrier:</span>{' '}
                    <span className="font-medium capitalize">{order.shipment.carrier}</span>
                  </div>
                  {order.shipment.awb && (
                    <div>
                      <span className="text-gray-700">AWB Number:</span>{' '}
                      <span className="font-mono font-medium">{order.shipment.awb}</span>
                    </div>
                  )}
                  {order.shipment.trackingUrl && (
                    <div>
                      <a
                        href={order.shipment.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 underline"
                      >
                        Track Shipment →
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Assign Carrier Section */}
            {!order.shipment?.carrier && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="carrier-select" className="block text-sm font-medium text-gray-900 mb-2">
                    Select Shipping Carrier
                  </label>
                  <select
                    id="carrier-select"
                    value={selectedCarrier || ''}
                    onChange={(e) => setSelectedCarrier(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Select Carrier --</option>
                    <option value="delhivery">Delhivery</option>
                    <option value="shiprocket">Shiprocket</option>
                    <option value="bluedart">BlueDart</option>
                  </select>
                </div>

                <Button
                  type="button"
                  onClick={() => assignCarrierMutation.mutate({ carrier: selectedCarrier })}
                  disabled={!selectedCarrier || assignCarrierMutation.isPending}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Truck className="w-4 h-4" />
                  {assignCarrierMutation.isPending ? 'Assigning Carrier...' : 'Assign Carrier'}
                </Button>
              </div>
            )}
          </div>

          {/* Status Update */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Update Status</h3>
            <form onSubmit={handleStatusUpdate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="input w-full"
                  >
                    <option value="placed">Placed</option>
                    <option value="paid">Paid</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                  <input
                    type="text"
                    value={statusDescription}
                    onChange={(e) => setStatusDescription(e.target.value)}
                    placeholder="Status update description..."
                    className="input w-full"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-4">
                <Button type="button" variant="outline" onClick={onClose}>
                  Close
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Updating...' : 'Update Status'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Orders;