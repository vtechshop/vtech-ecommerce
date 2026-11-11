// Admin: edit what the tax invoice shows, then generate it (gives the next invoice number).
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Lock, Pencil, Download, CheckCircle2 } from 'lucide-react';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import { useToast } from '@/components/common/ToastContainer';
import { blobErrorMessage } from '@/utils/blobError';
import { isOrderPaid } from '@/utils/orderPayment';

const BILL_FIELDS = [
  { key: 'name', label: 'Customer name', span: 1 },
  { key: 'company', label: 'Company / business name', span: 1 },
  { key: 'gstin', label: 'Customer GSTIN (optional)', span: 1, placeholder: '33ABCDE1234F1Z5', upper: true, maxLength: 15 },
  { key: 'phone', label: 'Phone', span: 1 },
  { key: 'email', label: 'Email', span: 2 },
  { key: 'addressLine1', label: 'Address line 1', span: 2 },
  { key: 'addressLine2', label: 'Address line 2', span: 2 },
  { key: 'city', label: 'City', span: 1 },
  { key: 'state', label: 'State', span: 1 },
  { key: 'zipCode', label: 'Pincode', span: 1, maxLength: 6 },
];

function initialForm(order) {
  const saved = order.invoiceDetails?.billTo || {};
  const ship = order.shipTo || {};
  const has = Object.values(saved).some(v => typeof v === 'string' && v.trim());
  const billTo = has ? { ...saved } : {
    name: ship.fullName || '', company: '', gstin: '',
    addressLine1: ship.addressLine1 || '', addressLine2: ship.addressLine2 || '',
    city: ship.city || '', state: ship.state || '', zipCode: ship.zipCode || '',
    phone: ship.phone || '', email: order.guestEmail || order.userId?.email || '',
  };
  for (const f of BILL_FIELDS) billTo[f.key] = billTo[f.key] || '';
  const edits = new Map((order.invoiceDetails?.items || []).map(e => [String(e.itemId), e]));
  const items = (order.items || []).map(item => ({
    itemId: item._id,
    original: item.name,
    name: edits.get(String(item._id))?.name || item.name || '',
    hsnCode: edits.get(String(item._id))?.hsnCode || item.hsnCode || '',
  }));
  return { billTo, items };
}

export default function InvoicePanel({ order }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [form, setForm] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const paid = isOrderPaid(order);
  const locked = Boolean(order.invoiceNumber);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-order', order._id] });

  const saveMutation = useMutation({
    mutationFn: (body) => api.put(`/admin/orders/${order._id}/invoice-details`, body),
    onSuccess: () => { toast.success('Invoice details saved'); setEditing(false); refresh(); },
    onError: (e) => toast.error(e.response?.data?.error?.message || 'Could not save invoice details'),
  });

  const generateMutation = useMutation({
    mutationFn: () => api.post(`/admin/orders/${order._id}/invoice`),
    onSuccess: (res) => {
      const d = res.data?.data || {};
      toast.success(d.alreadyGenerated
        ? `Invoice ${d.invoiceNumber} was already generated`
        : `Invoice ${d.invoiceNumber} generated${d.emailed ? ' and emailed to the customer' : ''}`);
      setConfirming(false);
      refresh();
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: (e) => { toast.error(e.response?.data?.error?.message || 'Could not generate the invoice'); setConfirming(false); },
  });

  const openEdit = () => { setForm(initialForm(order)); setEditing(true); };
  const setBill = (key, value) => setForm(f => ({ ...f, billTo: { ...f.billTo, [key]: value } }));
  const setItem = (i, key, value) => setForm(f => ({ ...f, items: f.items.map((it, j) => (j === i ? { ...it, [key]: value } : it)) }));
  const save = (e) => {
    e.preventDefault();
    saveMutation.mutate({
      billTo: form.billTo,
      items: form.items.map(({ itemId, name, hsnCode }) => ({ itemId, name, hsnCode })),
    });
  };

  const download = async () => {
    setDownloading(true);
    try {
      const response = await api.get(`/admin/orders/${order._id}/invoice`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', locked ? `Invoice-${order.invoiceNumber}.pdf` : `Order-Summary-${order.orderId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(await blobErrorMessage(error, 'Could not download the PDF'));
    } finally {
      setDownloading(false);
    }
  };

  const billTo = order.invoiceDetails?.billTo;
  const hasEdits = Boolean(order.invoiceDetails?.updatedAt);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${locked ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
            {locked ? <CheckCircle2 className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900">Tax invoice</h2>
            {locked ? (
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{order.invoiceNumber}</span> generated
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"><Lock className="h-3 w-3" /> Locked</span>
              </p>
            ) : paid ? (
              <p className="text-sm text-gray-600">Not generated yet. The customer can download an order summary (not a tax invoice) until you generate it.</p>
            ) : (
              <p className="text-sm text-gray-600">Payment not confirmed. An invoice can be generated only after payment.</p>
            )}
            {hasEdits && (
              <p className="mt-1 text-xs text-gray-500">
                Invoice shows: {billTo?.company || billTo?.name || 'edited billing details'}
                {billTo?.gstin ? ` · GSTIN ${billTo.gstin}` : ''}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!locked && (
            <Button variant="outline" onClick={openEdit}>
              <Pencil className="mr-2 inline h-4 w-4" /> Edit invoice
            </Button>
          )}
          {!locked && paid && (
            <Button onClick={() => setConfirming(true)}>
              <CheckCircle2 className="mr-2 inline h-4 w-4" /> Approve &amp; generate
            </Button>
          )}
          {(locked || paid) && (
            <Button variant="outline" onClick={download} loading={downloading}>
              <Download className="mr-2 inline h-4 w-4" /> {locked ? 'Download invoice' : 'Download order summary'}
            </Button>
          )}
        </div>
      </div>

      {/* Edit */}
      <Modal isOpen={editing} onClose={() => setEditing(false)} title={`Edit invoice – ${order.orderId}`} size="lg">
        {form && (
          <form onSubmit={save} className="space-y-6">
            <p className="text-sm text-gray-600">
              These details are used only on the tax invoice. The order&apos;s shipping address, prices, quantities and tax do not change.
            </p>
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-gray-900">Billing details</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {BILL_FIELDS.map(f => (
                  <label key={f.key} className={`flex flex-col gap-1 ${f.span === 2 ? 'sm:col-span-2' : ''}`}>
                    <span className="text-xs font-medium text-gray-700">{f.label}</span>
                    <input
                      value={form.billTo[f.key]}
                      onChange={(e) => setBill(f.key, f.upper ? e.target.value.toUpperCase() : e.target.value)}
                      placeholder={f.placeholder}
                      maxLength={f.maxLength}
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-gray-900">Items on the invoice</legend>
              {form.items.map((it, i) => (
                <div key={it.itemId} className="grid grid-cols-1 gap-3 rounded-md border border-gray-200 p-3 sm:grid-cols-[1fr_8rem]">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-gray-700">Item name</span>
                    <input
                      value={it.name}
                      onChange={(e) => setItem(i, 'name', e.target.value)}
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-gray-700">HSN code</span>
                    <input
                      value={it.hsnCode}
                      onChange={(e) => setItem(i, 'hsnCode', e.target.value.replace(/\D/g, ''))}
                      maxLength={8}
                      inputMode="numeric"
                      placeholder="8438"
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm tabular-nums focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </label>
                </div>
              ))}
              <p className="text-xs text-gray-500">Price, quantity and GST come from the order and cannot be edited.</p>
            </fieldset>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              <Button type="submit" loading={saveMutation.isPending}>Save</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Confirm generate */}
      <Modal isOpen={confirming} onClose={() => setConfirming(false)} title="Approve and generate the tax invoice?" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Order <span className="font-semibold">{order.orderId}</span> gets the next invoice number and the invoice is emailed to the customer.
          </p>
          <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
            After this the invoice is locked and cannot be edited. Check the billing details first.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirming(false)}>Cancel</Button>
            <Button onClick={() => generateMutation.mutate()} loading={generateMutation.isPending}>Generate invoice</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
