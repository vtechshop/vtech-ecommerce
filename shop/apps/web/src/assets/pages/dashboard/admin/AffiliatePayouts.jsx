import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DollarSign, Eye, CheckCircle, Clock, Filter, RefreshCw, Copy, Check, Upload, CreditCard, Building2, Smartphone, IndianRupee, X, ExternalLink } from 'lucide-react';
import api from '../../../utils/api';
import { useToast } from '../../../components/common/ToastContainer';
import Button from '../../../components/common/Button';
import Modal from '../../../components/common/Modal';

const PAYMENT_METHODS = [
  { value: 'upi', label: 'UPI', icon: Smartphone, color: 'purple' },
  { value: 'neft', label: 'NEFT', icon: Building2, color: 'blue' },
  { value: 'imps', label: 'IMPS', icon: CreditCard, color: 'green' },
  { value: 'rtgs', label: 'RTGS', icon: IndianRupee, color: 'orange' },
  { value: 'cash', label: 'Cash', icon: IndianRupee, color: 'gray' },
];

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
    <button onClick={handleCopy} className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors" title={`Copy ${label}`}>
      {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
};

const UpiQrCode = ({ upiId, amount, name }) => {
  if (!upiId) return null;
  const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name || 'Affiliate')}&am=${amount}&cu=INR`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUrl)}`;
  return (
    <div className="flex flex-col items-center gap-2">
      <img src={qrUrl} alt="UPI QR Code" className="w-40 h-40 rounded-lg border border-gray-200" />
      <p className="text-xs text-gray-500">Scan with any UPI app</p>
      <a href={upiUrl} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors">
        <ExternalLink className="w-3 h-3" /> Open UPI App
      </a>
    </div>
  );
};

const AffiliatePayouts = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedAffiliate, setSelectedAffiliate] = useState(null);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [paymentStep, setPaymentStep] = useState('details');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentProof, setPaymentProof] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const { data: affiliatesData, isLoading, refetch } = useQuery({
    queryKey: ['admin-affiliate-payouts', statusFilter],
    queryFn: async () => {
      let url = '/admin/affiliates?';
      if (statusFilter !== 'all') url += `status=${statusFilter}`;
      const response = await api.get(url);
      return response.data.data;
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async ({ affiliateId, amount, reference, paymentMethod: method, paymentProof: proof }) => {
      const response = await api.post(`/admin/affiliates/${affiliateId}/payout`, {
        amount, reference, paymentMethod: method, paymentProof: proof,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-affiliate-payouts'] });
      toast.success('Payout recorded successfully');
      closePayoutModal();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to record payout');
    },
  });

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

  const openPayoutModal = (affiliate) => {
    setSelectedAffiliate(affiliate);
    setPayoutAmount(affiliate.pendingEarnings?.toFixed(2) || '0');
    setShowPayoutModal(true);
    setPaymentStep('details');
    setPaymentMethod('');
    setPaymentRef('');
    setPaymentProof(null);
  };

  const closePayoutModal = () => {
    setShowPayoutModal(false);
    setSelectedAffiliate(null);
    setPayoutAmount('');
    setPaymentMethod('');
    setPaymentRef('');
    setPaymentProof(null);
    setPaymentStep('details');
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
    if (!payoutAmount || parseFloat(payoutAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    markPaidMutation.mutate({
      affiliateId: selectedAffiliate._id,
      amount: parseFloat(payoutAmount),
      reference: paymentRef.trim(),
      paymentMethod,
      paymentProof,
    });
  };

  const affiliates = affiliatesData || [];
  const totalPending = affiliates.reduce((sum, a) => sum + (a.pendingEarnings || 0), 0);
  const totalPaid = affiliates.reduce((sum, a) => sum + (a.paidEarnings || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const bank = selectedAffiliate?.paymentDetails || selectedAffiliate?.bankDetails;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Affiliate Payouts</h1>
          <p className="text-gray-700 mt-1">Manage commission payments to affiliates</p>
        </div>
        <button onClick={refetch} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center"><Clock className="w-6 h-6 text-yellow-600" /></div>
            <div><p className="text-sm text-gray-700">Total Pending</p><p className="text-2xl font-bold text-gray-900">₹{totalPending.toFixed(2)}</p></div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center"><CheckCircle className="w-6 h-6 text-green-600" /></div>
            <div><p className="text-sm text-gray-700">Total Paid</p><p className="text-2xl font-bold text-gray-900">₹{totalPaid.toFixed(2)}</p></div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center"><DollarSign className="w-6 h-6 text-blue-600" /></div>
            <div><p className="text-sm text-gray-700">Active Affiliates</p><p className="text-2xl font-bold text-gray-900">{affiliates.filter(a => a.status === 'active').length}</p></div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
            <option value="all">All Affiliates</option>
            <option value="active">Active Only</option>
            <option value="pending">Pending Approval</option>
          </select>
        </div>
      </div>

      {/* Affiliates Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {affiliates.length === 0 ? (
          <div className="text-center py-12"><p className="text-gray-500">No affiliates found</p></div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Affiliate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bank / UPI</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pending</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {affiliates.map((affiliate) => {
                const aBank = affiliate.paymentDetails || affiliate.bankDetails;
                return (
                  <tr key={affiliate._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{affiliate.userId?.name || 'N/A'}</p>
                      <p className="text-sm text-gray-500">{affiliate.userId?.email}</p>
                      <code className="text-xs text-gray-400">{affiliate.code}</code>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-600 space-y-0.5">
                        {aBank?.upiId && (
                          <div className="flex items-center gap-1">
                            <Smartphone className="w-3 h-3 text-purple-500" />
                            <span className="font-mono">{aBank.upiId}</span>
                          </div>
                        )}
                        {aBank?.bankName && (
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-gray-400" />
                            <span>{aBank.bankName}</span>
                          </div>
                        )}
                        {!aBank?.upiId && !aBank?.bankName && (
                          <span className="text-red-500 italic">No details</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-yellow-600">₹{affiliate.pendingEarnings?.toFixed(2) || '0.00'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-green-600">₹{affiliate.paidEarnings?.toFixed(2) || '0.00'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        affiliate.status === 'active' ? 'bg-green-100 text-green-800' :
                        affiliate.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {affiliate.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => setSelectedAffiliate(affiliate)} title="View Details">
                          <Eye className="w-4 h-4" />
                        </Button>
                        {affiliate.pendingEarnings > 0 && (
                          <Button size="sm" variant="primary" onClick={() => openPayoutModal(affiliate)}>
                            Pay Now
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* View Details Modal */}
      {selectedAffiliate && !showPayoutModal && (
        <Modal isOpen={!!selectedAffiliate} onClose={() => setSelectedAffiliate(null)} title="Affiliate Payment Details" size="md">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Affiliate Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-700">Name:</span><span className="font-medium">{selectedAffiliate.userId?.name}</span></div>
                <div className="flex justify-between"><span className="text-gray-700">Email:</span><span className="font-medium">{selectedAffiliate.userId?.email}</span></div>
                <div className="flex justify-between"><span className="text-gray-700">Code:</span><code className="font-medium">{selectedAffiliate.code}</code></div>
              </div>
            </div>
            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-900 mb-3">Bank Account Details</h3>
              {bank ? (
                <div className="space-y-3 text-sm bg-gray-50 rounded-xl p-4">
                  {bank.accountHolderName && (
                    <div className="flex items-center justify-between"><div><span className="text-xs text-gray-500">Account Holder</span><p className="font-medium">{bank.accountHolderName}</p></div></div>
                  )}
                  {bank.bankName && (
                    <div className="flex items-center justify-between"><div><span className="text-xs text-gray-500">Bank</span><p className="font-medium">{bank.bankName}</p></div></div>
                  )}
                  {bank.accountNumber && (
                    <div className="flex items-center justify-between"><div><span className="text-xs text-gray-500">Account Number</span><p className="font-mono font-medium">{bank.accountNumber}</p></div><CopyButton text={bank.accountNumber} label="Account Number" /></div>
                  )}
                  {bank.ifscCode && (
                    <div className="flex items-center justify-between"><div><span className="text-xs text-gray-500">IFSC Code</span><p className="font-mono font-medium">{bank.ifscCode}</p></div><CopyButton text={bank.ifscCode} label="IFSC" /></div>
                  )}
                  {bank.upiId && (
                    <div className="flex items-center justify-between border-t border-gray-200 pt-3"><div><span className="text-xs text-gray-500">UPI ID</span><p className="font-mono font-medium text-purple-700">{bank.upiId}</p></div><CopyButton text={bank.upiId} label="UPI ID" /></div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No bank details added yet</p>
              )}
            </div>
            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-900 mb-3">Earnings Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-700">Total Earnings:</span><span className="font-medium">₹{selectedAffiliate.totalEarnings?.toFixed(2) || '0.00'}</span></div>
                <div className="flex justify-between"><span className="text-yellow-700">Pending:</span><span className="font-medium text-yellow-600">₹{selectedAffiliate.pendingEarnings?.toFixed(2) || '0.00'}</span></div>
                <div className="flex justify-between"><span className="text-green-700">Paid Out:</span><span className="font-medium text-green-600">₹{selectedAffiliate.paidEarnings?.toFixed(2) || '0.00'}</span></div>
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t"><Button onClick={() => setSelectedAffiliate(null)}>Close</Button></div>
          </div>
        </Modal>
      )}

      {/* ============ PAYOUT MODAL ============ */}
      {showPayoutModal && selectedAffiliate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{paymentStep === 'details' ? 'Pay Affiliate' : 'Record Payment'}</h2>
                <p className="text-sm text-gray-500">{selectedAffiliate.userId?.name} ({selectedAffiliate.code})</p>
              </div>
              <button onClick={closePayoutModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              {/* Amount Summary */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-700 font-medium">Payout Amount</p>
                    <p className="text-3xl font-bold text-green-700">₹{parseFloat(payoutAmount || 0).toFixed(2)}</p>
                  </div>
                  <div className="text-right text-sm text-green-700">
                    <p>TDS (2%): ₹{(parseFloat(payoutAmount || 0) * 0.02).toFixed(2)}</p>
                    <p className="font-bold">Net: ₹{(parseFloat(payoutAmount || 0) * 0.98).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {paymentStep === 'details' ? (
                <>
                  {/* Payout Amount Input */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Payout Amount (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter amount"
                    />
                  </div>

                  {/* Bank Details */}
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Building2 className="w-4 h-4" /> Bank Details
                    </h3>
                    {bank?.accountNumber || bank?.upiId ? (
                      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                        {bank.accountHolderName && (
                          <div className="flex items-center justify-between"><div><span className="text-xs text-gray-500">Account Holder</span><p className="text-sm font-medium">{bank.accountHolderName}</p></div></div>
                        )}
                        {bank.bankName && (
                          <div className="flex items-center justify-between"><div><span className="text-xs text-gray-500">Bank</span><p className="text-sm font-medium">{bank.bankName}</p></div></div>
                        )}
                        {bank.accountNumber && (
                          <div className="flex items-center justify-between"><div><span className="text-xs text-gray-500">Account Number</span><p className="text-sm font-mono font-medium">{bank.accountNumber}</p></div><CopyButton text={bank.accountNumber} label="Account Number" /></div>
                        )}
                        {bank.ifscCode && (
                          <div className="flex items-center justify-between"><div><span className="text-xs text-gray-500">IFSC Code</span><p className="text-sm font-mono font-medium">{bank.ifscCode}</p></div><CopyButton text={bank.ifscCode} label="IFSC" /></div>
                        )}
                        {bank.upiId && (
                          <div className="flex items-center justify-between border-t border-gray-200 pt-3"><div><span className="text-xs text-gray-500">UPI ID</span><p className="text-sm font-mono font-medium text-purple-700">{bank.upiId}</p></div><CopyButton text={bank.upiId} label="UPI ID" /></div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <p className="text-sm text-red-700 italic">No bank details found. Ask the affiliate to add bank details.</p>
                      </div>
                    )}
                  </div>

                  {/* UPI QR Code */}
                  {bank?.upiId && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><Smartphone className="w-4 h-4" /> UPI Quick Pay</h3>
                      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex justify-center">
                        <UpiQrCode upiId={bank.upiId} amount={parseFloat(payoutAmount || 0) * 0.98} name={bank.accountHolderName || selectedAffiliate.userId?.name} />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button onClick={closePayoutModal} variant="secondary" className="flex-1">Cancel</Button>
                    <Button onClick={() => setPaymentStep('confirm')} variant="primary" className="flex-1" disabled={!payoutAmount || parseFloat(payoutAmount) <= 0}>
                      I've Paid — Record Payment
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {/* Payment Method */}
                  <div className="mb-5">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Payment Method *</label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {PAYMENT_METHODS.map((method) => {
                        const Icon = method.icon;
                        const isSelected = paymentMethod === method.value;
                        return (
                          <button key={method.value} onClick={() => setPaymentMethod(method.value)} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-sm font-medium ${isSelected ? `border-${method.color}-500 bg-${method.color}-50 text-${method.color}-700` : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                            <Icon className="w-5 h-5" />
                            {method.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* UTR */}
                  <div className="mb-5">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">UTR / Transaction ID *</label>
                    <input type="text" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="e.g. 412345678901 or TXN123456" className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    <p className="mt-1 text-xs text-gray-500">Enter the UTR number from your bank app / UPI app</p>
                  </div>

                  {/* Proof Upload */}
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
                      <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-colors text-sm text-gray-600">
                        <Upload className="w-4 h-4" />
                        {uploading ? 'Uploading...' : 'Upload screenshot or PDF'}
                      </button>
                    )}
                  </div>

                  {/* Summary */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between"><span className="text-blue-700">Affiliate:</span><span className="font-medium">{selectedAffiliate.userId?.name} ({selectedAffiliate.code})</span></div>
                      <div className="flex justify-between"><span className="text-blue-700">Gross Amount:</span><span className="font-medium">₹{parseFloat(payoutAmount || 0).toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-blue-700">TDS (2%):</span><span className="font-medium">₹{(parseFloat(payoutAmount || 0) * 0.02).toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-blue-700">Net Payout:</span><span className="font-bold text-green-700">₹{(parseFloat(payoutAmount || 0) * 0.98).toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-blue-700">Method:</span><span className="font-medium uppercase">{paymentMethod || '—'}</span></div>
                      <div className="flex justify-between"><span className="text-blue-700">Reference:</span><span className="font-mono">{paymentRef || '—'}</span></div>
                      <div className="flex justify-between"><span className="text-blue-700">Proof:</span><span>{paymentProof ? 'Attached' : 'None'}</span></div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={() => setPaymentStep('details')} variant="secondary" className="flex-1">Back</Button>
                    <Button onClick={handleSubmitPayout} variant="primary" className="flex-1" disabled={markPaidMutation.isPending || !paymentRef.trim() || !paymentMethod}>
                      {markPaidMutation.isPending ? 'Recording...' : 'Confirm & Mark as Paid'}
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

export default AffiliatePayouts;
