import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import { useToast } from '@/components/common/ToastContainer';
import { Trash2, ToggleLeft, ToggleRight, Plus, Search } from 'lucide-react';

const TABS = [
  { key: 'state',    label: 'Restricted States' },
  { key: 'district', label: 'Restricted Districts' },
  { key: 'pincode',  label: 'Restricted Pincodes' },
];

const EMPTY_FORM = { stateName: '', districtName: '', pincode: '', note: '' };

export default function ShippingRestrictions() {
  const toast = useToast();
  const qc = useQueryClient();

  const [tab, setTab]       = useState('state');
  const [search, setSearch] = useState('');
  const [form, setForm]     = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);

  const BASE = '/admin/shipping-restrictions';

  const { data, isLoading } = useQuery({
    queryKey: ['shipping-restrictions', tab, search],
    queryFn: async () => {
      const r = await api.get(BASE, { params: { type: tab, search, limit: 200 } });
      return r.data.data;
    },
    staleTime: 0,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['shipping-restrictions'] });

  const createMut = useMutation({
    mutationFn: (body) => api.post(BASE, body),
    onSuccess: () => { toast.success('Restriction added'); setForm(EMPTY_FORM); invalidate(); },
    onError:   (e)  => toast.error(e.response?.data?.error || 'Failed to add'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }) => api.put(`${BASE}/${id}`, body),
    onSuccess: () => { toast.success('Updated'); setEditId(null); setForm(EMPTY_FORM); invalidate(); },
    onError:   (e)  => toast.error(e.response?.data?.error || 'Failed to update'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`${BASE}/${id}`),
    onSuccess: () => { toast.success('Deleted'); invalidate(); },
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }) => api.put(`${BASE}/${id}`, { isActive }),
    onSuccess: () => invalidate(),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const body = { type: tab, ...form };
    if (editId) updateMut.mutate({ id: editId, body });
    else        createMut.mutate(body);
  };

  const startEdit = (item) => {
    setEditId(item._id);
    setForm({ stateName: item.stateName, districtName: item.districtName || '', pincode: item.pincode || '', note: item.note || '' });
  };

  const cancelEdit = () => { setEditId(null); setForm(EMPTY_FORM); };

  const items = data || [];

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Shipping Restrictions</h1>
        <p className="text-sm text-gray-500 mt-1">Block delivery for specific states, districts, or pincodes</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {TABS.map(t => (
          <button key={t.key}
            onClick={() => { setTab(t.key); setSearch(''); cancelEdit(); }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Add / Edit Form */}
      <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          {editId ? 'Edit Restriction' : `Add ${TABS.find(t => t.key === tab)?.label.replace('Restricted ', '')}`}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-600 mb-1 block">State Name *</label>
            <input required value={form.stateName} onChange={e => setForm(p => ({ ...p, stateName: e.target.value }))}
              placeholder="e.g. Tamil Nadu"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none" />
          </div>
          {(tab === 'district' || tab === 'pincode') && (
            <div>
              <label className="text-xs text-gray-600 mb-1 block">District Name {tab === 'district' ? '*' : ''}</label>
              <input value={form.districtName} onChange={e => setForm(p => ({ ...p, districtName: e.target.value }))}
                required={tab === 'district'} placeholder="e.g. Chennai"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none" />
            </div>
          )}
          {tab === 'pincode' && (
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Pincode *</label>
              <input required value={form.pincode} onChange={e => setForm(p => ({ ...p, pincode: e.target.value }))}
                placeholder="e.g. 600001" maxLength={6}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none" />
            </div>
          )}
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Note (optional)</label>
            <input value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
              placeholder="Reason"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none" />
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" disabled={createMut.isPending || updateMut.isPending}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60">
              <Plus className="w-4 h-4" /> {editId ? 'Update' : 'Add'}
            </button>
            {editId && (
              <button type="button" onClick={cancelEdit}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none" />
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500 text-sm">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">No restrictions added yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">State</th>
                {tab !== 'state'   && <th className="text-left px-4 py-3 font-semibold text-gray-600">District</th>}
                {tab === 'pincode' && <th className="text-left px-4 py-3 font-semibold text-gray-600">Pincode</th>}
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Note</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(item => (
                <tr key={item._id} className={`hover:bg-gray-50 ${!item.isActive ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{item.stateName}</td>
                  {tab !== 'state'   && <td className="px-4 py-3 text-gray-700">{item.districtName || '—'}</td>}
                  {tab === 'pincode' && <td className="px-4 py-3 font-mono text-gray-700">{item.pincode || '—'}</td>}
                  <td className="px-4 py-3 text-gray-500 text-xs">{item.note || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleMut.mutate({ id: item._id, isActive: !item.isActive })}
                      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${
                        item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                      {item.isActive ? <><ToggleRight className="w-3.5 h-3.5" /> Active</> : <><ToggleLeft className="w-3.5 h-3.5" /> Disabled</>}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => startEdit(item)}
                        className="text-xs px-2.5 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">Edit</button>
                      <button onClick={() => { if (confirm('Delete this restriction?')) deleteMut.mutate(item._id); }}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-2">{items.length} restriction(s)</p>
    </div>
  );
}
