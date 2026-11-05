import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import { useToast } from '@/components/common/ToastContainer';
import { Plus, Search, Link2, Link2Off } from 'lucide-react';

const EXTERNAL_SOURCES = [
  { value: 'woo_vegetablecuttingmachine', label: 'vegetablecuttingmachine.com' },
  { value: 'woo_styleyourlyf',            label: 'styleyourlyf.com' },
];

const EMPTY_FORM = {
  externalSource: 'woo_vegetablecuttingmachine',
  wooProductId: '',
  wooVariantId: '',
  vtechProductId: '',
  vtechVariantId: '',
  notes: '',
};

const BASE = '/admin/woo-mappings';

export default function WooMappings() {
  const toast  = useToast();
  const qc     = useQueryClient();

  const [form,       setForm]       = useState(EMPTY_FORM);
  const [editId,     setEditId]     = useState(null);
  const [search,     setSearch]     = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('true');

  const { data, isLoading } = useQuery({
    queryKey: ['woo-mappings', sourceFilter, activeFilter, search],
    queryFn: async () => {
      const params = { limit: 200 };
      if (sourceFilter)  params.externalSource = sourceFilter;
      if (activeFilter !== '') params.active = activeFilter;
      if (search)        params.wooProductId = search.trim();
      const r = await api.get(BASE, { params });
      return r.data.data;
    },
    staleTime: 0,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['woo-mappings'] });

  const setField = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const createMut = useMutation({
    mutationFn: (body) => api.post(BASE, body),
    onSuccess: () => {
      toast.success('Mapping created');
      setForm(EMPTY_FORM);
      invalidate();
    },
    onError: (e) => toast.error(e.response?.data?.error?.message || 'Failed to create mapping'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }) => api.put(`${BASE}/${id}`, body),
    onSuccess: () => {
      toast.success('Mapping updated');
      setEditId(null);
      setForm(EMPTY_FORM);
      invalidate();
    },
    onError: (e) => toast.error(e.response?.data?.error?.message || 'Failed to update mapping'),
  });

  const deactivateMut = useMutation({
    mutationFn: (id) => api.put(`${BASE}/${id}/deactivate`),
    onSuccess: () => { toast.success('Mapping deactivated'); invalidate(); },
    onError: (e) => toast.error(e.response?.data?.error?.message || 'Failed to deactivate'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const body = {
      externalSource:  form.externalSource,
      wooProductId:    form.wooProductId.trim(),
      wooVariantId:    form.wooVariantId.trim() || null,
      vtechProductId:  form.vtechProductId.trim(),
      vtechVariantId:  form.vtechVariantId.trim() || null,
      notes:           form.notes.trim() || undefined,
    };
    if (editId) {
      updateMut.mutate({ id: editId, body: { vtechProductId: body.vtechProductId, vtechVariantId: body.vtechVariantId, notes: body.notes } });
    } else {
      createMut.mutate(body);
    }
  };

  const startEdit = (item) => {
    setEditId(item._id);
    setForm({
      externalSource: item.externalSource,
      wooProductId:   item.wooProductId,
      wooVariantId:   item.wooVariantId || '',
      vtechProductId: item.vtechProductId?._id || item.vtechProductId || '',
      vtechVariantId: item.vtechVariantId || '',
      notes:          item.notes || '',
    });
  };

  const cancelEdit = () => { setEditId(null); setForm(EMPTY_FORM); };

  const mappings = data?.mappings || [];

  const sourceLabel = (src) => EXTERNAL_SOURCES.find(s => s.value === src)?.label || src;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">WooCommerce Mappings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Link WooCommerce products from external storefronts to VTech products for central checkout
        </p>
      </div>

      {/* Add / Edit Form */}
      <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          {editId ? 'Edit Mapping (VTech product / notes only)' : 'Create New Mapping'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

          {/* External source */}
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Storefront *</label>
            <select required disabled={!!editId} value={form.externalSource}
              onChange={e => setField('externalSource', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none disabled:bg-gray-100">
              {EXTERNAL_SOURCES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Woo product ID */}
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Woo Product ID *</label>
            <input required disabled={!!editId} value={form.wooProductId}
              onChange={e => setField('wooProductId', e.target.value)}
              placeholder="e.g. 1234"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none disabled:bg-gray-100" />
          </div>

          {/* Woo variant ID */}
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Woo Variant ID <span className="text-gray-400">(variable products)</span></label>
            <input disabled={!!editId} value={form.wooVariantId}
              onChange={e => setField('wooVariantId', e.target.value)}
              placeholder="Leave blank for simple products"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none disabled:bg-gray-100" />
          </div>

          {/* VTech product ID */}
          <div>
            <label className="text-xs text-gray-600 mb-1 block">VTech Product ID *</label>
            <input required value={form.vtechProductId}
              onChange={e => setField('vtechProductId', e.target.value)}
              placeholder="MongoDB ObjectId"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none" />
          </div>

          {/* VTech variant ID */}
          <div>
            <label className="text-xs text-gray-600 mb-1 block">VTech Variant ID <span className="text-gray-400">(if variant product)</span></label>
            <input value={form.vtechVariantId}
              onChange={e => setField('vtechVariantId', e.target.value)}
              placeholder="Variant subdocument _id"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none" />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Notes</label>
            <input value={form.notes}
              onChange={e => setField('notes', e.target.value)}
              placeholder="Optional admin note"
              maxLength={500}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none" />
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <button type="submit" disabled={createMut.isPending || updateMut.isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60">
            <Plus className="w-4 h-4" /> {editId ? 'Update' : 'Create Mapping'}
          </button>
          {editId && (
            <button type="button" onClick={cancelEdit}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Filter by Woo Product ID..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none" />
        </div>
        <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none">
          <option value="">All storefronts</option>
          {EXTERNAL_SOURCES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select value={activeFilter} onChange={e => setActiveFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none">
          <option value="true">Active only</option>
          <option value="false">Inactive only</option>
          <option value="">All statuses</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500 text-sm">Loading...</div>
        ) : mappings.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">No mappings found</div>
        ) : (
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Storefront</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Woo Product</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Woo Variant</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">VTech Product</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">VTech Variant</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mappings.map(item => {
                const product = item.vtechProductId;
                return (
                  <tr key={item._id} className={`hover:bg-gray-50 ${!item.active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 text-gray-700 text-xs font-medium">
                      {sourceLabel(item.externalSource)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-800">{item.wooProductId}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.wooVariantId || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-medium text-gray-900">{product?.title || '(deleted)'}</div>
                      <div className="font-mono text-[10px] text-gray-400 mt-0.5">
                        {typeof product === 'object' ? product._id : product}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.vtechVariantId || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${
                        item.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {item.active
                          ? <><Link2 className="w-3 h-3" /> Active</>
                          : <><Link2Off className="w-3 h-3" /> Inactive</>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => startEdit(item)}
                          className="text-xs px-2.5 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
                          Edit
                        </button>
                        {item.active && (
                          <button
                            onClick={() => { if (window.confirm('Deactivate this mapping?')) deactivateMut.mutate(item._id); }}
                            className="text-xs px-2.5 py-1 border border-red-200 rounded-lg hover:bg-red-50 text-red-600">
                            Deactivate
                          </button>
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
      {data?.pagination && (
        <p className="text-xs text-gray-400 mt-2">
          {data.pagination.total} mapping(s)
        </p>
      )}
    </div>
  );
}
