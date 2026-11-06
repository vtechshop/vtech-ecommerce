import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import { useToast } from '@/components/common/ToastContainer';
import { Plus, Search, Link2, Link2Off, ChevronDown, AlertTriangle, CheckCircle2, RefreshCw, X } from 'lucide-react';

const EXTERNAL_SOURCES = [
  { value: 'woo_vegetablecuttingmachine', label: 'vegetablecuttingmachine.com' },
  { value: 'woo_styleyourlyf',            label: 'styleyourlyf.com' },
];

const BASE = '/admin/woo-mappings';
const inr = (n) => (n == null || Number.isNaN(Number(n)) ? '—' : `₹${Number(n).toLocaleString('en-IN')}`);
const wooKey = (productId, variantId) => `${productId}:${variantId || ''}`;
const inputCls = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none disabled:bg-gray-100';

/** Search-as-you-type picker. options: [{ value, label, sub, disabled, hint }] */
function Picker({ id, value, options, onChange, placeholder, loading, emptyText }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const boxRef = useRef(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const close = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const filtered = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const list = words.length
      ? options.filter(o => { const t = `${o.label} ${o.sub || ''} ${o.value}`.toLowerCase(); return words.every(w => t.includes(w)); })
      : options;
    return list.slice(0, 80);
  }, [options, query]);

  const choose = (o) => { if (o.disabled) return; onChange(o.value); setOpen(false); setQuery(''); };

  return (
    <div ref={boxRef} className="relative">
      <button type="button" id={id} onClick={() => { setOpen(o => !o); setActive(0); }}
        className={`${inputCls} flex items-center justify-between gap-2 text-left min-h-[40px]`} aria-haspopup="listbox" aria-expanded={open}>
        {selected ? (
          <span className="min-w-0">
            <span className="block truncate text-gray-900">{selected.label}</span>
            {selected.sub && <span className="block truncate text-xs text-gray-500">{selected.sub}</span>}
          </span>
        ) : <span className="text-gray-400">{loading ? 'Loading…' : placeholder}</span>}
        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-2 border-b border-gray-100">
            <input autoFocus value={query} placeholder="Type to search…" className={inputCls}
              onChange={e => { setQuery(e.target.value); setActive(0); }}
              onKeyDown={e => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, filtered.length - 1)); }
                if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
                if (e.key === 'Enter') { e.preventDefault(); if (filtered[active]) choose(filtered[active]); }
                if (e.key === 'Escape') setOpen(false);
              }} />
          </div>
          <ul role="listbox" className="max-h-72 overflow-y-auto py-1">
            {filtered.length === 0 && <li className="px-3 py-3 text-sm text-gray-400">{loading ? 'Loading…' : emptyText || 'Nothing found'}</li>}
            {filtered.map((o, i) => (
              <li key={o.value} role="option" aria-selected={o.value === value} aria-disabled={o.disabled}
                onMouseEnter={() => setActive(i)} onMouseDown={e => { e.preventDefault(); choose(o); }}
                className={`px-3 py-2 text-sm ${o.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${i === active && !o.disabled ? 'bg-primary-50' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-gray-900">{o.label}</span>
                    {o.sub && <span className="block text-xs text-gray-500">{o.sub}</span>}
                  </span>
                  {o.hint && <span className="shrink-0 text-[11px] font-medium text-gray-500">{o.hint}</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function PriceCheck({ wooPrice, vtechPrice }) {
  if (wooPrice == null || vtechPrice == null) return null;
  const same = Number(wooPrice) === Number(vtechPrice);
  return same ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full whitespace-nowrap">
      <CheckCircle2 className="w-3.5 h-3.5" /> Same price
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full whitespace-nowrap">
      <AlertTriangle className="w-3.5 h-3.5" /> Store {inr(wooPrice)} · VTech {inr(vtechPrice)}
    </span>
  );
}

const EMPTY_FORM = { woo: '', vtechProductId: '', vtechVariantId: '', notes: '' };

export default function WooMappings() {
  const toast = useToast();
  const qc = useQueryClient();
  const formRef = useRef(null);

  const [source, setSource] = useState(EXTERNAL_SOURCES[0].value);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('true');
  const [showUnmapped, setShowUnmapped] = useState(false);
  const setField = (key, val) => setForm(p => ({ ...p, [key]: val }));

  // Every mapping of this store (active and inactive), filtered on the page
  const mappingsQ = useQuery({
    queryKey: ['woo-mappings', source],
    queryFn: async () => (await api.get(BASE, { params: { externalSource: source, limit: 200 } })).data.data,
    staleTime: 0,
  });
  const storeQ = useQuery({
    queryKey: ['woo-store-products', source],
    queryFn: async () => (await api.get('/admin/woo-store-products', { params: { externalSource: source } })).data.data,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  const vtechQ = useQuery({
    queryKey: ['admin-products-for-mapping'],
    queryFn: async () => (await api.get('/admin/products', { params: { limit: 1000 } })).data.data,
    staleTime: 5 * 60 * 1000,
  });

  const mappings = mappingsQ.data?.mappings || [];
  const storeProducts = storeQ.data || [];
  const vtechProducts = vtechQ.data || [];

  const storeByKey = useMemo(() => new Map(storeProducts.map(p => [wooKey(p.wooProductId, p.wooVariantId), p])), [storeProducts]);
  const vtechById = useMemo(() => new Map(vtechProducts.map(p => [String(p._id), p])), [vtechProducts]);
  const mappedKeys = useMemo(() => new Set(mappings.filter(m => m.active).map(m => wooKey(m.wooProductId, m.wooVariantId))), [mappings]);
  const unmapped = storeProducts.filter(p => p.type !== 'variable' && !mappedKeys.has(wooKey(p.wooProductId, p.wooVariantId)));

  const wooOptions = useMemo(() => storeProducts
    .filter(p => p.type !== 'variable') // pick the variations of a variable product, not the parent
    .map(p => {
      const key = wooKey(p.wooProductId, p.wooVariantId);
      const mapped = mappedKeys.has(key);
      return { value: key, label: p.name, sub: `Store ID ${p.wooVariantId || p.wooProductId}${p.price != null ? ' · ' + inr(p.price) : ''}`, disabled: mapped && !editId, hint: mapped ? 'Mapped' : '' };
    }), [storeProducts, mappedKeys, editId]);

  const vtechOptions = useMemo(() => vtechProducts.map(p => ({
    value: String(p._id),
    label: p.title,
    sub: `${inr(p.price)} · stock ${p.stock ?? 0}${p.vendorId?.storeName ? ' · ' + p.vendorId.storeName : ''}`,
    hint: p.published === false ? 'Unpublished' : '',
  })), [vtechProducts]);

  const selectedWoo = storeByKey.get(form.woo);
  const selectedVtech = vtechById.get(form.vtechProductId);
  const vtechVariants = selectedVtech?.variants || [];
  const selectedVariant = vtechVariants.find(v => String(v._id) === form.vtechVariantId);
  const vtechPrice = selectedVariant?.price ?? selectedVtech?.price;

  const invalidate = () => qc.invalidateQueries({ queryKey: ['woo-mappings'] });
  const resetForm = () => { setEditId(null); setForm(EMPTY_FORM); };

  const createMut = useMutation({
    mutationFn: (body) => api.post(BASE, body),
    onSuccess: () => { toast.success('Mapping created'); resetForm(); invalidate(); },
    onError: (e) => toast.error(e.response?.data?.error?.message || 'Failed to create mapping'),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, body }) => api.put(`${BASE}/${id}`, body),
    onSuccess: () => { toast.success('Mapping updated'); resetForm(); invalidate(); },
    onError: (e) => toast.error(e.response?.data?.error?.message || 'Failed to update mapping'),
  });
  const deactivateMut = useMutation({
    mutationFn: (id) => api.put(`${BASE}/${id}/deactivate`),
    onSuccess: () => { toast.success('Mapping deactivated'); invalidate(); },
    onError: (e) => toast.error(e.response?.data?.error?.message || 'Failed to deactivate'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.woo || !form.vtechProductId) { toast.error('Choose a store product and a VTech product'); return; }
    if (vtechVariants.length > 0 && !form.vtechVariantId) { toast.error('Choose the VTech variant'); return; }
    const [wooProductId, wooVariantId] = form.woo.split(':');
    const vtech = { vtechProductId: form.vtechProductId, vtechVariantId: form.vtechVariantId || null, notes: form.notes.trim() || undefined };
    if (editId) updateMut.mutate({ id: editId, body: vtech });
    else createMut.mutate({ externalSource: source, wooProductId, wooVariantId: wooVariantId || null, ...vtech });
  };

  const startEdit = (item) => {
    setEditId(item._id);
    setForm({
      woo: wooKey(item.wooProductId, item.wooVariantId),
      vtechProductId: String(item.vtechProductId?._id || item.vtechProductId || ''),
      vtechVariantId: item.vtechVariantId || '',
      notes: item.notes || '',
    });
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const startMap = (p) => {
    resetForm();
    setField('woo', wooKey(p.wooProductId, p.wooVariantId));
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const rows = mappings.filter(m => {
    if (activeFilter !== '' && String(m.active) !== activeFilter) return false;
    if (!search.trim()) return true;
    const store = storeByKey.get(wooKey(m.wooProductId, m.wooVariantId));
    const text = `${m.wooProductId} ${m.wooVariantId || ''} ${store?.name || ''} ${m.vtechProductId?.title || ''}`.toLowerCase();
    return search.toLowerCase().split(/\s+/).filter(Boolean).every(w => text.includes(w));
  });
  const activeCount = mappings.filter(m => m.active).length;
  const sellable = storeProducts.filter(p => p.type !== 'variable').length;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">WooCommerce Mappings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Link each store product to the VTech product customers will pay for at VTech checkout.
        </p>
      </div>

      {/* Store switch + progress */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="grid grid-cols-2 w-full sm:inline-flex sm:w-auto rounded-lg border border-gray-200 bg-white p-1" role="tablist">
          {EXTERNAL_SOURCES.map(s => (
            <button key={s.value} type="button" role="tab" aria-selected={source === s.value}
              onClick={() => { setSource(s.value); resetForm(); setShowUnmapped(false); }}
              className={`min-w-0 truncate px-2 sm:px-4 py-1.5 text-xs sm:text-sm rounded-md font-medium ${source === s.value ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm">
          {storeQ.isLoading ? <span className="text-gray-400">Loading store products…</span> : storeQ.isError ? null : (
            <>
              <span className="text-gray-600"><strong className="text-gray-900">{sellable - unmapped.length}</strong> of {sellable} store products mapped</span>
              {unmapped.length > 0 && (
                <button type="button" onClick={() => setShowUnmapped(v => !v)}
                  className="px-2.5 py-1 text-xs font-medium rounded-full bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100">
                  {unmapped.length} not mapped {showUnmapped ? '▲' : '▼'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {storeQ.isError && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border border-red-200 bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3">
          <span>{storeQ.error?.response?.data?.error?.message || 'Could not load products from the store.'}</span>
          <button type="button" onClick={() => storeQ.refetch()} className="inline-flex items-center gap-1 font-medium underline">
            <RefreshCw className="w-3.5 h-3.5" /> Try again
          </button>
        </div>
      )}

      {/* Products still to map */}
      {showUnmapped && unmapped.length > 0 && (
        <div className="mb-5 bg-white border border-amber-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-amber-50 text-sm font-medium text-amber-900">Not mapped yet — customers cannot check out with these</div>
          <ul className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {unmapped.map(p => (
              <li key={wooKey(p.wooProductId, p.wooVariantId)} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="min-w-0">
                  <span className="block text-sm text-gray-900 truncate">{p.name}</span>
                  <span className="block text-xs text-gray-500">Store ID {p.wooVariantId || p.wooProductId}{p.price != null ? ` · ${inr(p.price)}` : ''}</span>
                </span>
                <button type="button" onClick={() => startMap(p)}
                  className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700">Map</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Create / edit */}
      <form ref={formRef} onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-xl p-4 sm:p-5 mb-6 scroll-mt-24">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-800">{editId ? 'Edit mapping' : 'New mapping'}</h3>
          {(editId || form.woo || form.vtechProductId) && (
            <button type="button" onClick={resetForm} className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800">
              <X className="w-3.5 h-3.5" /> {editId ? 'Cancel edit' : 'Clear'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="woo-pick" className="text-xs font-medium text-gray-600 mb-1 block">
              Store product <span className="text-gray-400 font-normal">({EXTERNAL_SOURCES.find(s => s.value === source)?.label})</span>
            </label>
            {editId ? (
              <div className={`${inputCls} bg-gray-100 min-h-[40px]`}>
                <span className="block truncate">{selectedWoo?.name || `Store ID ${form.woo.replace(/:$/, '')}`}</span>
              </div>
            ) : (
              <Picker id="woo-pick" value={form.woo} options={wooOptions} onChange={v => setField('woo', v)}
                placeholder="Choose a store product" loading={storeQ.isLoading} emptyText="No store products found" />
            )}
          </div>

          <div>
            <label htmlFor="vtech-pick" className="text-xs font-medium text-gray-600 mb-1 block">VTech product <span className="text-gray-400 font-normal">(customer pays this price)</span></label>
            <Picker id="vtech-pick" value={form.vtechProductId} options={vtechOptions}
              onChange={v => setForm(p => ({ ...p, vtechProductId: v, vtechVariantId: '' }))}
              placeholder="Choose a VTech product" loading={vtechQ.isLoading} />
          </div>

          {vtechVariants.length > 0 && (
            <div>
              <label htmlFor="vtech-variant" className="text-xs font-medium text-gray-600 mb-1 block">VTech variant</label>
              <select id="vtech-variant" value={form.vtechVariantId} onChange={e => setField('vtechVariantId', e.target.value)} className={inputCls}>
                <option value="">Choose a variant</option>
                {vtechVariants.map(v => (
                  <option key={v._id} value={v._id}>{v.name || v.sku || v._id} · {inr(v.price)} · stock {v.stock ?? 0}</option>
                ))}
              </select>
            </div>
          )}

          <div className={vtechVariants.length > 0 ? '' : 'md:col-span-2'}>
            <label htmlFor="map-notes" className="text-xs font-medium text-gray-600 mb-1 block">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <input id="map-notes" value={form.notes} onChange={e => setField('notes', e.target.value)} maxLength={500}
              placeholder="Anything the team should know" className={inputCls} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-4">
          <button type="submit" disabled={createMut.isPending || updateMut.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60">
            <Plus className="w-4 h-4" /> {editId ? 'Save changes' : 'Create mapping'}
          </button>
          <PriceCheck wooPrice={selectedWoo?.price} vtechPrice={selectedVtech ? vtechPrice : null} />
        </div>
      </form>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by product name or ID…"
            className={`${inputCls} pl-9`} />
        </div>
        <select value={activeFilter} onChange={e => setActiveFilter(e.target.value)} className="w-full sm:w-44 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none">
          <option value="true">Active only</option>
          <option value="false">Inactive only</option>
          <option value="">All statuses</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        {mappingsQ.isLoading ? (
          <div className="text-center py-12 text-gray-500 text-sm">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">{mappings.length ? 'No mappings match' : 'No mappings yet for this store'}</div>
        ) : (
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Store product</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">VTech product</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Price</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(item => {
                const product = item.vtechProductId && typeof item.vtechProductId === 'object' ? item.vtechProductId : null;
                const variant = item.vtechVariantId ? product?.variants?.find(v => String(v._id) === String(item.vtechVariantId)) : null;
                const store = storeByKey.get(wooKey(item.wooProductId, item.wooVariantId));
                return (
                  <tr key={item._id} className={`align-top hover:bg-gray-50 ${!item.active ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="text-gray-900">{store?.name || <span className="text-gray-400">Not found in store</span>}</div>
                      <div className="text-xs text-gray-500 mt-0.5">Store ID {item.wooVariantId || item.wooProductId}{store?.price != null ? ` · ${inr(store.price)}` : ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-900">{product?.title || <span className="text-red-600">Product deleted</span>}{variant ? ` — ${variant.name || variant.sku}` : ''}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{inr(variant?.price ?? product?.price)}{product?.published === false ? ' · unpublished' : ''}</div>
                    </td>
                    <td className="px-4 py-3"><PriceCheck wooPrice={store?.price} vtechPrice={variant?.price ?? product?.price} /></td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${item.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {item.active ? <><Link2 className="w-3 h-3" /> Active</> : <><Link2Off className="w-3 h-3" /> Inactive</>}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={() => startEdit(item)}
                          className="text-xs px-2.5 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">Edit</button>
                        {item.active && (
                          <button type="button" onClick={() => { if (window.confirm('Deactivate this mapping? Customers will not be able to check out this product.')) deactivateMut.mutate(item._id); }}
                            className="text-xs px-2.5 py-1 border border-red-200 rounded-lg hover:bg-red-50 text-red-600">Deactivate</button>
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
      <p className="text-xs text-gray-400 mt-2">{activeCount} active mapping(s) for this store</p>
    </div>
  );
}
