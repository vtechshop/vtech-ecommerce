import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import { useToast } from '@/components/common/ToastContainer';
import Button from '@/components/common/Button';
import { formatCurrency, formatDate } from '@/utils/format';
import { RefreshCw, Copy, Check, Upload, CreditCard, Building2, Smartphone, IndianRupee, X, FileText, ExternalLink } from 'lucide-react';

const PAYMENT_METHODS = [
  { value: 'upi', label: 'UPI', icon: Smartphone, color: 'purple' },
  { value: 'neft', label: 'NEFT', icon: Building2, color: 'blue' },
  { value: 'imps', label: 'IMPS', icon: CreditCard, color: 'green' },
  { value: 'rtgs', label: 'RTGS', icon: IndianRupee, color: 'orange' },
  { value: 'cash', label: 'Cash', icon: IndianRupee, color: 'gray' },
];

// Reusable copy button
const CopyButton = ({ text, label }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  };
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
      title={`Copy ${label}`}
    >
      {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
};

// UPI QR Code component (uses public API)
const UpiQrCode = ({ upiId, amount, name }) => {
  if (!upiId) return null;
  const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name || 'Vendor')}&am=${amount}&cu=INR`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUrl)}`;

  return (
    <div className="flex flex-col items-center gap-2">
      <img src={qrUrl} alt="UPI QR Code" className="w-40 h-40 rounded-lg border border-gray-200" />
      <p className="text-xs text-gray-500">Scan with any UPI app</p>
      <div className="flex gap-2">
        <a
          href={`upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name || 'Vendor')}&am=${amount}&cu=INR`}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
        >
          <ExternalLink className="w-3 h-3" /> Open UPI App
        </a>
      </div>
    </div>
  );
};

const VendorPayouts = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [paymentStep, setPaymentStep] = useState('details'); // 'details' | 'confirm'
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentProof, setPaymentProof] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch pending payouts (now includes bank details)
  const { data: pendingPayouts, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'payouts', 'pending'],
    queryFn: async () => {
      const response = await api.get('/admin/payouts/pending');
      return response.data.data;
    },
  });

  // Fetch held transfers
  const { data: heldTransfers } = useQuery({
    queryKey: ['admin', 'commissions', 'held'],
    queryFn: async () => {
      const response = await api.get('/admin/commissions', {
        params: { status: 'approved', hasTransfer: true },
      });
      return response.data.data?.commissions || [];
    },
  });

  // Fetch commission details for selected vendor
  const { data: vendorCommissions } = useQuery({
    queryKey: ['admin', 'commissions', selectedVendor?.vendorId],
    queryFn: async () => {
      const response = await api.get('/admin/commissions', {
        params: { type: 'vendor', status: 'approved', subjectId: selectedVendor?.vendorId },
      });
      return response.data.data;
    },
    enabled: !!selectedVendor,
  });

  // Process manual payout mutation
  const processPayoutMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/admin/payouts/process', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Payout recorded successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin', 'payouts', 'pending'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'commissions'] });
      closeModal();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to process payout');
    },
  });

  // Release held transfer mutation
  const releaseTransferMutation = useMutation({
    mutationFn: async (orderId) => {
      const response = await api.post(`/admin/payouts/release-transfers/${orderId}`);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.data.message || 'Transfer released!');
      queryClient.invalidateQueries({ queryKey: ['admin', 'commissions'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'payouts'] });
    },
    onError: (error) => {
      const errData = error.response?.data?.error;
      if (errData?.code === 'RETURN_WINDOW_ACTIVE') {
        toast.warning(`Return window still active. ${errData.daysRemaining} days remaining.`);
      } else {
        toast.error(errData?.message || 'Failed to release transfer');
      }
    },
  });

  // Upload payment proof
  const handleUploadProof = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/upload/single', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setPaymentProof(res.data.data?.url || res.data.data?.path || res.data.url);
      toast.success('Payment proof uploaded');
    } catch {
      toast.error('Failed to upload proof');
    } finally {
      setUploading(false);
    }
  };

  const openPayoutModal = (vendor) => {
    setSelectedVendor(vendor);
    setShowPayoutModal(true);
    setPaymentStep('details');
    setPaymentMethod('');
    setPaymentRef('');
    setPaymentProof(null);
  };

  const closeModal = () => {
    setShowPayoutModal(false);
    setSelectedVendor(null);
    setPaymentStep('details');
    setPaymentMethod('');
    setPaymentRef('');
    setPaymentProof(null);
  };

  const handleSubmitPayout = () => {
    if (!paymentRef.trim()) {
      toast.error('Please enter the UTR / Transaction ID');
      return;
    }
    if (!paymentMethod) {
      toast.error('Please select a payment method');
      return;
    }
    processPayoutMutation.mutate({
      vendorId: selectedVendor.vendorId,
      amount: selectedVendor.pendingAmount,
      paymentMethod,
      paymentRef: paymentRef.trim(),
      paymentProof,
    });
  };

  const handleReleaseTransfer = (orderId) => {
    if (confirm('Release held transfer for this order? Make sure the return window has passed.')) {
      releaseTransferMutation.mutate(orderId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Group held transfers by orderId
  const heldByOrder = {};
  if (heldTransfers) {
    for (const c of heldTransfers) {
      if (c.transfer?.transferId && ['created', 'pending'].includes(c.transfer?.status)) {
        const oid = c.orderId?._id || c.orderId;
        if (!heldByOrder[oid]) {
          heldByOrder[oid] = { orderId: oid, orderNumber: c.orderId?.orderId || 'N/A', orderDate: c.orderId?.createdAt, transfers: [], totalAmount: 0 };
        }
        heldByOrder[oid].transfers.push(c);
        heldByOrder[oid].totalAmount += c.amount;
      }
    }
  }
  const heldOrderList = Object.values(heldByOrder);

  const bank = selectedVendor?.bankDetails;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Payouts</h1>
          <p className="text-gray-700">Manage and process vendor commission payouts</p>
        </div>
        <button onClick={refetch} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-700">Vendors with Pending</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">{pendingPayouts?.length || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-700">Total Pending Amount</div>
          <div className="text-3xl font-bold text-green-600 mt-2">
            {formatCurrency(pendingPayouts?.reduce((sum, v) => sum + v.pendingAmount, 0) || 0)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-700">Held Transfers</div>
          <div className="text-3xl font-bold text-orange-600 mt-2">{heldOrderList.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-700">Held Amount</div>
          <div className="text-3xl font-bold text-orange-600 mt-2">
            {formatCurrency(heldOrderList.reduce((sum, o) => sum + o.totalAmount, 0))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button onClick={() => setActiveTab('pending')} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'pending' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          Pending Payouts ({pendingPayouts?.length || 0})
        </button>
        <button onClick={() => setActiveTab('held')} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'held' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          Held Transfers ({heldOrderList.length})
        </button>
      </div>

      {/* Pending Payouts Tab */}
      {activeTab === 'pending' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Pending Payouts</h2>
            <p className="text-sm text-gray-500">Approved commissions ready for payout via UPI, NEFT, or IMPS</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bank / UPI</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commissions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingPayouts && pendingPayouts.length > 0 ? (
                  pendingPayouts.map((vendor) => (
                    <tr key={vendor.vendorId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{vendor.vendorName}</div>
                        {vendor.bankDetails?.verified && (
                          <span className="text-xs text-green-600">Bank Verified</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-gray-600 space-y-0.5">
                          {vendor.bankDetails?.upiId && (
                            <div className="flex items-center gap-1">
                              <Smartphone className="w-3 h-3 text-purple-500" />
                              <span className="font-mono">{vendor.bankDetails.upiId}</span>
                            </div>
                          )}
                          {vendor.bankDetails?.bankName && (
                            <div className="flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-gray-400" />
                              <span>{vendor.bankDetails.bankName}</span>
                              {vendor.bankDetails?.lastFourDigits && (
                                <span className="font-mono">****{vendor.bankDetails.lastFourDigits}</span>
                              )}
                            </div>
                          )}
                          {!vendor.bankDetails?.upiId && !vendor.bankDetails?.bankName && (
                            <span className="text-red-500 italic">No bank details</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{vendor.commissionCount} orders</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-green-600">{formatCurrency(vendor.pendingAmount)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Button onClick={() => openPayoutModal(vendor)} variant="primary" size="sm">
                          Pay Now
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">No pending payouts</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Held Transfers Tab */}
      {activeTab === 'held' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Held Razorpay Transfers</h2>
            <p className="text-sm text-gray-500">Transfers held until the 7-day return window passes after delivery.</p>
          </div>
          <div className="p-4">
            {heldOrderList.length > 0 ? (
              <div className="space-y-3">
                {heldOrderList.map((orderGroup) => {
                  const deliveredInfo = orderGroup.transfers[0]?.orderId?.events?.find(e => e.status === 'delivered');
                  const daysSinceDelivery = deliveredInfo ? Math.floor((Date.now() - new Date(deliveredInfo.timestamp).getTime()) / (1000 * 60 * 60 * 24)) : null;
                  const canRelease = daysSinceDelivery !== null && daysSinceDelivery >= 7;
                  return (
                    <div key={orderGroup.orderId} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-semibold text-gray-900">Order #{orderGroup.orderNumber}</span>
                            <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-800">On Hold</span>
                            {daysSinceDelivery !== null && (
                              <span className={`text-xs ${canRelease ? 'text-green-600 font-semibold' : 'text-gray-500'}`}>
                                {canRelease ? 'Return window passed' : `${7 - daysSinceDelivery} days left`}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                            <span>{orderGroup.transfers.length} transfer(s)</span>
                            <span className="font-semibold text-green-700">{formatCurrency(orderGroup.totalAmount)}</span>
                            {orderGroup.orderDate && <span>Ordered: {formatDate(orderGroup.orderDate)}</span>}
                          </div>
                        </div>
                        <Button onClick={() => handleReleaseTransfer(orderGroup.orderId)} variant={canRelease ? 'primary' : 'secondary'} size="sm" disabled={releaseTransferMutation.isPending}>
                          {releaseTransferMutation.isPending ? 'Releasing...' : 'Release'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">No held transfers.</div>
            )}
          </div>
        </div>
      )}

      {/* ============ PAYOUT MODAL ============ */}
      {showPayoutModal && selectedVendor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {paymentStep === 'details' ? 'Pay Vendor' : 'Record Payment'}
                </h2>
                <p className="text-sm text-gray-500">{selectedVendor.vendorName}</p>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              {/* Amount Summary */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-700 font-medium">Payout Amount</p>
                    <p className="text-3xl font-bold text-green-700">{formatCurrency(selectedVendor.pendingAmount)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-green-700">{selectedVendor.commissionCount} commissions</p>
                  </div>
                </div>
              </div>

              {paymentStep === 'details' ? (
                <>
                  {/* Bank Details Section */}
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Building2 className="w-4 h-4" /> Bank Details
                    </h3>
                    {bank?.accountNumber || bank?.upiId ? (
                      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                        {/* Account Holder */}
                        {bank.accountHolderName && (
                          <div className="flex items-center justify-between">
                            <div><span className="text-xs text-gray-500">Account Holder</span><p className="text-sm font-medium text-gray-900">{bank.accountHolderName}</p></div>
                          </div>
                        )}
                        {/* Bank Name */}
                        {bank.bankName && (
                          <div className="flex items-center justify-between">
                            <div><span className="text-xs text-gray-500">Bank</span><p className="text-sm font-medium text-gray-900">{bank.bankName}</p></div>
                          </div>
                        )}
                        {/* Account Number */}
                        {bank.accountNumber && (
                          <div className="flex items-center justify-between">
                            <div><span className="text-xs text-gray-500">Account Number</span><p className="text-sm font-mono font-medium text-gray-900">{bank.accountNumber}</p></div>
                            <CopyButton text={bank.accountNumber} label="Account Number" />
                          </div>
                        )}
                        {/* IFSC */}
                        {bank.ifscCode && (
                          <div className="flex items-center justify-between">
                            <div><span className="text-xs text-gray-500">IFSC Code</span><p className="text-sm font-mono font-medium text-gray-900">{bank.ifscCode}</p></div>
                            <CopyButton text={bank.ifscCode} label="IFSC" />
                          </div>
                        )}
                        {/* UPI ID */}
                        {bank.upiId && (
                          <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                            <div>
                              <span className="text-xs text-gray-500">UPI ID</span>
                              <p className="text-sm font-mono font-medium text-purple-700">{bank.upiId}</p>
                            </div>
                            <CopyButton text={bank.upiId} label="UPI ID" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <p className="text-sm text-red-700 italic">No bank details found. Ask the vendor to add bank details in their settings.</p>
                      </div>
                    )}
                  </div>

                  {/* UPI QR Code */}
                  {bank?.upiId && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Smartphone className="w-4 h-4" /> UPI Quick Pay
                      </h3>
                      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex justify-center">
                        <UpiQrCode upiId={bank.upiId} amount={selectedVendor.pendingAmount} name={bank.accountHolderName || selectedVendor.vendorName} />
                      </div>
                    </div>
                  )}

                  {/* Commission Details */}
                  {vendorCommissions && vendorCommissions.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Commission Breakdown
                      </h3>
                      <div className="border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                        {vendorCommissions.map((c) => (
                          <div key={c._id} className="px-4 py-2.5 border-b border-gray-100 hover:bg-gray-50 flex justify-between items-center text-sm">
                            <div>
                              <span className="font-medium">Order #{c.orderId?.orderId || 'N/A'}</span>
                              <span className="ml-2 text-gray-500">{c.percentage}%</span>
                            </div>
                            <span className="font-semibold text-green-600">{formatCurrency(c.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Proceed Button */}
                  <div className="flex gap-3">
                    <Button onClick={closeModal} variant="secondary" className="flex-1">Cancel</Button>
                    <Button onClick={() => setPaymentStep('confirm')} variant="primary" className="flex-1">
                      I've Paid — Record Payment
                    </Button>
                  </div>
                </>
              ) : (
                /* ============ STEP 2: RECORD PAYMENT ============ */
                <>
                  {/* Payment Method Selection */}
                  <div className="mb-5">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Payment Method *</label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {PAYMENT_METHODS.map((method) => {
                        const Icon = method.icon;
                        const isSelected = paymentMethod === method.value;
                        return (
                          <button
                            key={method.value}
                            onClick={() => setPaymentMethod(method.value)}
                            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                              isSelected
                                ? `border-${method.color}-500 bg-${method.color}-50 text-${method.color}-700`
                                : 'border-gray-200 hover:border-gray-300 text-gray-600'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                            {method.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* UTR / Transaction ID */}
                  <div className="mb-5">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">UTR / Transaction ID *</label>
                    <input
                      type="text"
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                      placeholder="e.g. 412345678901 or TXN123456"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                    <p className="mt-1 text-xs text-gray-500">Enter the UTR number from your bank app / UPI app</p>
                  </div>

                  {/* Payment Proof Upload */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Payment Proof (optional)</label>
                    <input type="file" ref={fileInputRef} onChange={handleUploadProof} accept="image/*,.pdf" className="hidden" />
                    {paymentProof ? (
                      <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                        <Check className="w-5 h-5 text-green-600" />
                        <span className="text-sm text-green-700 flex-1">Proof uploaded</span>
                        <button onClick={() => { setPaymentProof(null); fileInputRef.current.value = ''; }} className="text-xs text-red-600 hover:underline">Remove</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-colors text-sm text-gray-600"
                      >
                        <Upload className="w-4 h-4" />
                        {uploading ? 'Uploading...' : 'Upload screenshot or PDF'}
                      </button>
                    )}
                  </div>

                  {/* Summary */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between"><span className="text-blue-700">Vendor:</span><span className="font-medium">{selectedVendor.vendorName}</span></div>
                      <div className="flex justify-between"><span className="text-blue-700">Amount:</span><span className="font-bold text-green-700">{formatCurrency(selectedVendor.pendingAmount)}</span></div>
                      <div className="flex justify-between"><span className="text-blue-700">Method:</span><span className="font-medium uppercase">{paymentMethod || '—'}</span></div>
                      <div className="flex justify-between"><span className="text-blue-700">Reference:</span><span className="font-mono">{paymentRef || '—'}</span></div>
                      <div className="flex justify-between"><span className="text-blue-700">Proof:</span><span>{paymentProof ? 'Attached' : 'None'}</span></div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button onClick={() => setPaymentStep('details')} variant="secondary" className="flex-1">Back</Button>
                    <Button
                      onClick={handleSubmitPayout}
                      variant="primary"
                      className="flex-1"
                      disabled={processPayoutMutation.isPending || !paymentRef.trim() || !paymentMethod}
                    >
                      {processPayoutMutation.isPending ? 'Recording...' : 'Confirm & Mark as Paid'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorPayouts;
