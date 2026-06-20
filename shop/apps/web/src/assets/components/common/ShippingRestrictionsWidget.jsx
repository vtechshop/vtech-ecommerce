import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import { Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';

const TABS = [
  { key: 'state',    label: 'State' },
  { key: 'district', label: 'District' },
  { key: 'pincode',  label: 'Pincode' },
];

const EMPTY = { stateName: '', districtName: '', pincode: '' };

export default function ShippingRestrictionsWidget() {
  const qc = useQueryClient();
  const [open, setOpen]   = useState(false);
  const [tab, setTab]     = useState('state');
  const [form, setForm]   = useState(EMPTY);
  const [err, setErr]     = useState('');

  const BASE = '/admin/shipping-restrictions';

  const { data } = useQuery({
    queryKey: ['shipping-restrictions-widget', tab],
    queryFn:  async () => {
      const r = await api.get(BASE, { params: { type: tab, limit: 100 } });
      return r.data.data;
    },
    enabled: open,
    staleTime: 0,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['shipping-restrictions-widget'] });
    qc.invalidateQueries({ queryKey: ['shipping-restrictions'] });
  };

  const addMut = useMutation({
    mutationFn: (body) => api.post(BASE, body),
    onSuccess: () => { setForm(EMPTY); setErr(''); invalidate(); },
    onError:   (e)  => setErr(e.response?.data?.error || 'Failed to add'),
  });

  const delMut = useMutation({
    mutationFn: (id) => api.delete(`${BASE}/${id}`),
    onSuccess: () => invalidate(),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }) => api.put(`${BASE}/${id}`, { isActive }),
    onSuccess: () => invalidate(),
  });

  const handleAdd = () => {
    if (!form.stateName.trim()) { setErr('State name required'); return; }
    if (tab === 'district' && !form.districtName.trim()) { setErr('District name required'); return; }
    if (tab === 'pincode'  && !form.pincode.trim())      { setErr('Pincode required'); return; }
    setErr('');
    addMut.mutate({ type: tab, ...form });
  };

  const items = data || [];

  return (
    <div className="md:col-span-2 border border-red-200 bg-red-50 rounded-lg p-4 mt-1">
      {/* Header toggle */}
      <button type="button" onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full text-left">
        <div>
          <h3 className="text-sm font-semibold text-red-800">Delivery Restrictions</h3>
          <p className="text-xs text-red-600 mt-0.5">Block delivery to specific states, districts, or pincodes</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-red-500" /> : <ChevronDown className="w-4 h-4 text-red-500" />}
      </button>

      {open && (
        <div className="mt-4">
          {/* Sub-tabs */}
          <div className="flex gap-1 mb-3 bg-white rounded-lg p-1 border border-red-100">
            {TABS.map(t => (
              <button key={t.key} type="button" onClick={() => { setTab(t.key); setForm(EMPTY); setErr(''); }}
                className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${
                  tab === t.key ? 'bg-red-500 text-white' : 'text-gray-600 hover:bg-red-50'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Add form */}
          <div className="flex flex-wrap gap-2 mb-3">
            <input value={form.stateName} onChange={e => setForm(p => ({ ...p, stateName: e.target.value }))}
              placeholder="State name *"
              className="flex-1 min-w-28 px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-400 focus:outline-none bg-white" />
            {(tab === 'district' || tab === 'pincode') && (
              <input value={form.districtName} onChange={e => setForm(p => ({ ...p, districtName: e.target.value }))}
                placeholder="District name *"
                className="flex-1 min-w-28 px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-400 focus:outline-none bg-white" />
            )}
            {tab === 'pincode' && (
              <input value={form.pincode} onChange={e => setForm(p => ({ ...p, pincode: e.target.value }))}
                placeholder="Pincode *" maxLength={6}
                className="w-28 px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-400 focus:outline-none bg-white" />
            )}
            <button type="button" onClick={handleAdd} disabled={addMut.isPending}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-60 whitespace-nowrap">
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
          {err && <p className="text-xs text-red-600 mb-2">{err}</p>}

          {/* List */}
          {items.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-3">No restrictions added</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {items.map(item => (
                <div key={item._id}
                  className={`flex items-center justify-between bg-white border rounded-lg px-3 py-2 ${!item.isActive ? 'opacity-50' : 'border-red-100'}`}>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-gray-800">{item.stateName}</span>
                    {item.districtName && <span className="text-xs text-gray-500"> › {item.districtName}</span>}
                    {item.pincode      && <span className="text-xs text-gray-500 font-mono"> › {item.pincode}</span>}
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <button type="button"
                      onClick={() => toggleMut.mutate({ id: item._id, isActive: !item.isActive })}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                      {item.isActive ? 'Active' : 'Off'}
                    </button>
                    <button type="button" onClick={() => delMut.mutate(item._id)}
                      className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-2">These restrictions apply globally to all products at checkout.</p>
        </div>
      )}
    </div>
  );
}
