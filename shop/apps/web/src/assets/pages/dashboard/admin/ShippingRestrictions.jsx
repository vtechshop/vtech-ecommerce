import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import { useToast } from '@/components/common/ToastContainer';
import { Trash2, ToggleLeft, ToggleRight, Plus, Search, Upload, Download, X } from 'lucide-react';

const TABS = [
  { key: 'state',    label: 'Restricted States' },
  { key: 'district', label: 'Restricted Districts' },
  { key: 'pincode',  label: 'Restricted Pincodes' },
];

const EMPTY_FORM = { stateName: '', districtName: '', pincode: '', note: '' };

export default function ShippingRestrictions() {
  const toast = useToast();
  const qc = useQueryClient();
  const fileRef = useRef();

  const [tab, setTab]         = useState('state');
  const [search, setSearch]   = useState('');
  const [form, setForm]       = useState(EMPTY_FORM);
  const [editId, setEditId]   = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [csvText, setCsvText]       = useState('');

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

  const bulkImportMut = useMutation({
    mutationFn: (rows) => api.post(`${BASE}/bulk-import`, { rows }),
    onSuccess: (r) => { toast.success(`Imported ${r.data.inserted} rows`); setShowImport(false); setCsvText(''); invalidate(); },
    onError:   (e)  => toast.error(e.response?.data?.error || 'Import failed'),
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

  const handleExport = async () => {
    try {
      const r = await api.get(`${BASE}/export`);
      const rows = r.data.data;
      const headers = 'type,stateName,districtName,pincode,isActive,note';
      const lines = rows.map(r =>
        [r.type, r.stateName, r.districtName || '', r.pincode || '', r.isActive, r.note || ''].join(',')
      );
      const csv = [headers, ...lines].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = 'shipping-restrictions.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Export failed'); }
  };

  const handleCsvImport = () => {
    const lines = csvText.trim().split('\n').filter(Boolean);
    if (lines.length < 2) { toast.error('CSV needs header + at least one row'); return; }
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1).map(line => {
      const vals = line.split(',');
      const obj = {};
      headers.forEach((h, i) => { obj[h] = (vals[i] || '').trim(); });
      return obj;
    }).filter(r => r.type && r.stateName);
    bulkImportMut.mutate(rows);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText(ev.target.result);
    reader.readAsText(file);
  };

  const items = data || [];

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shipping Restrictions</h1>
          <p className="text-sm text-gray-500 mt-1">Block delivery for specific states, districts, or pincodes</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            <Upload className="w-4 h-4" /> Import CSV
          </button>
          <button onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
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
              placeholder="Reason for restriction"
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
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search restrictions..."
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
                {tab !== 'state'    && <th className="text-left px-4 py-3 font-semibold text-gray-600">District</th>}
                {tab === 'pincode'  && <th className="text-left px-4 py-3 font-semibold text-gray-600">Pincode</th>}
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
                      {item.isActive
                        ? <><ToggleRight className="w-3.5 h-3.5" /> Active</>
                        : <><ToggleLeft  className="w-3.5 h-3.5" /> Disabled</>}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => startEdit(item)}
                        className="text-xs px-2.5 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
                        Edit
                      </button>
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
      <p className="text-xs text-gray-400 mt-2">{items.length} restriction(s) shown</p>

      {/* CSV Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Import Restrictions via CSV</h3>
              <button onClick={() => { setShowImport(false); setCsvText(''); }}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              CSV format: <code className="bg-gray-100 px-1 rounded">type,stateName,districtName,pincode,note</code><br />
              type must be: <code className="bg-gray-100 px-1 rounded">state</code> / <code className="bg-gray-100 px-1 rounded">district</code> / <code className="bg-gray-100 px-1 rounded">pincode</code>
            </p>
            <input type="file" accept=".csv" ref={fileRef} onChange={handleFileUpload} className="hidden" />
            <button onClick={() => fileRef.current.click()}
              className="flex items-center gap-2 text-sm px-3 py-2 border border-dashed border-gray-300 rounded-lg w-full justify-center hover:bg-gray-50 mb-3">
              <Upload className="w-4 h-4" /> Choose CSV file
            </button>
            <textarea value={csvText} onChange={e => setCsvText(e.target.value)}
              rows={8} placeholder={"type,stateName,districtName,pincode,note\nstate,Tamil Nadu,,,Remote area\npincode,Tamil Nadu,Chennai,600001,Hub blocked"}
              className="w-full text-xs font-mono border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none resize-none mb-4" />
            <div className="flex gap-3">
              <button onClick={handleCsvImport} disabled={!csvText.trim() || bulkImportMut.isPending}
                className="flex-1 bg-primary-600 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-primary-700 disabled:opacity-60">
                {bulkImportMut.isPending ? 'Importing...' : 'Import'}
              </button>
              <button onClick={() => { setShowImport(false); setCsvText(''); }}
                className="px-4 py-2.5 border border-gray-300 text-sm rounded-xl hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
