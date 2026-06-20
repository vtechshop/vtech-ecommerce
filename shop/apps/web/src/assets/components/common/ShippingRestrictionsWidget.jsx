import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import { Trash2, Plus, ChevronDown, ChevronUp, Edit2, X, Loader2 } from 'lucide-react';
import { STATES, DISTRICTS } from './indiaGeoData';

// ─── Searchable dropdown (portal-based — works inside overflow:hidden/auto modals) ───
function SearchableDropdown({ options, value, onChange, placeholder, disabled }) {
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState('');
  const [rect, setRect]     = useState(null);
  const inputRef            = useRef(null);
  const listRef             = useRef(null);

  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()));

  const openDropdown = () => {
    if (disabled) return;
    const r = inputRef.current?.getBoundingClientRect();
    if (r) setRect(r);
    setQuery('');
    setOpen(true);
  };

  const pick = (opt) => {
    onChange(opt);
    setOpen(false);
    setQuery('');
  };

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (!inputRef.current?.contains(e.target) && !listRef.current?.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  // Recompute position on scroll/resize while open
  useEffect(() => {
    if (!open) return;
    const update = () => {
      const r = inputRef.current?.getBoundingClientRect();
      if (r) setRect(r);
    };
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  const dropStyle = rect ? {
    position: 'fixed',
    top:   rect.bottom + 4,
    left:  rect.left,
    width: rect.width,
    zIndex: 99999,
  } : {};

  return (
    <div className="flex-1 min-w-24 relative">
      <div
        ref={inputRef}
        onClick={openDropdown}
        className={`flex items-center justify-between px-3 py-1.5 text-xs border rounded-lg cursor-pointer bg-white select-none ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'border-gray-300 hover:border-red-400'
        } ${open ? 'border-red-400 ring-1 ring-red-300' : ''}`}
      >
        <span className={value ? 'text-gray-800' : 'text-gray-400'}>
          {value || placeholder}
        </span>
        <ChevronDown className="w-3 h-3 text-gray-400 shrink-0 ml-1" />
      </div>

      {open && rect && createPortal(
        <div ref={listRef} style={dropStyle}
          className="bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
          {/* Search inside dropdown */}
          <div className="p-1.5 border-b border-gray-100">
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search..."
              onClick={e => e.stopPropagation()}
              className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-red-400"
            />
          </div>
          <div className="max-h-44 overflow-y-auto">
            {value && (
              <button type="button" onClick={() => pick('')}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-50 italic">
                — Clear selection
              </button>
            )}
            {filtered.length === 0
              ? <p className="px-3 py-2 text-xs text-gray-400">No results</p>
              : filtered.map(o => (
                <button key={o} type="button" onClick={() => pick(o)}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                    value === o
                      ? 'bg-red-50 text-red-700 font-semibold'
                      : 'text-gray-700 hover:bg-red-50'
                  }`}>
                  {o}
                </button>
              ))
            }
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── Main widget ─────────────────────────────────────────────────────────────
const TABS = [
  { key: 'state',    label: 'State' },
  { key: 'district', label: 'District' },
  { key: 'pincode',  label: 'Pincode' },
];
const EMPTY = { stateName: '', districtName: '', pincode: '' };

export default function ShippingRestrictionsWidget() {
  const qc         = useQueryClient();
  const contentRef = useRef(null);

  const [open, setOpen]           = useState(false);
  const [tab, setTab]             = useState('state');
  const [form, setForm]           = useState(EMPTY);
  const [editId, setEditId]       = useState(null);
  const [err, setErr]             = useState('');
  const [pinLookup, setPinLookup] = useState(false);

  // Scroll expanded panel into view inside the modal
  useEffect(() => {
    if (open && contentRef.current) {
      setTimeout(() => contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
    }
  }, [open]);

  // Pincode → auto-fill state + district
  useEffect(() => {
    if (tab !== 'pincode' || form.pincode.length !== 6) return;
    setPinLookup(true);
    fetch(`https://api.postalpincode.in/pincode/${form.pincode}`)
      .then(r => r.json())
      .then(json => {
        if (json[0]?.Status === 'Success' && json[0]?.PostOffice?.length) {
          const po = json[0].PostOffice[0];
          setForm(p => ({ ...p, stateName: po.State || p.stateName, districtName: po.District || p.districtName }));
        }
      })
      .catch(() => {})
      .finally(() => setPinLookup(false));
  }, [form.pincode, tab]);

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

  const addMut  = useMutation({
    mutationFn: (body) => api.post(BASE, body),
    onSuccess: () => { setForm(EMPTY); setErr(''); invalidate(); },
    onError:   (e)  => setErr(e.response?.data?.error || 'Failed to add'),
  });
  const editMut = useMutation({
    mutationFn: ({ id, body }) => api.put(`${BASE}/${id}`, body),
    onSuccess: () => { setForm(EMPTY); setEditId(null); setErr(''); invalidate(); },
    onError:   (e) => setErr(e.response?.data?.error || 'Failed to update'),
  });
  const delMut  = useMutation({
    mutationFn: (id) => api.delete(`${BASE}/${id}`),
    onSuccess: () => invalidate(),
  });
  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }) => api.put(`${BASE}/${id}`, { isActive }),
    onSuccess: () => invalidate(),
  });

  const handleAdd = () => {
    if (!form.stateName.trim()) { setErr('Select a state'); return; }
    if (tab === 'district' && !form.districtName.trim()) { setErr('Select a district'); return; }
    if (tab === 'pincode'  && !form.pincode.trim())      { setErr('Enter pincode'); return; }
    setErr('');
    const body = { type: tab, ...form };
    if (editId) editMut.mutate({ id: editId, body });
    else        addMut.mutate(body);
  };

  const startEdit = (item) => {
    setEditId(item._id);
    setForm({ stateName: item.stateName || '', districtName: item.districtName || '', pincode: item.pincode || '' });
    setErr('');
  };

  const cancelEdit = () => { setEditId(null); setForm(EMPTY); setErr(''); };
  const switchTab  = (key) => { setTab(key); setForm(EMPTY); setEditId(null); setErr(''); };

  const items      = data || [];
  const isPending  = addMut.isPending || editMut.isPending;
  const districtOptions = (form.stateName && DISTRICTS[form.stateName]) || [];

  return (
    <div className="md:col-span-2 border border-red-200 bg-red-50 rounded-lg mt-1">
      {/* Toggle header */}
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o); }}
        className="flex items-center justify-between w-full text-left p-4"
      >
        <div>
          <h3 className="text-sm font-semibold text-red-800">Delivery Restrictions</h3>
          <p className="text-xs text-red-600 mt-0.5">Block delivery to specific states, districts, or pincodes</p>
        </div>
        {open
          ? <ChevronUp   className="w-4 h-4 text-red-500 shrink-0" />
          : <ChevronDown className="w-4 h-4 text-red-500 shrink-0" />
        }
      </button>

      {open && (
        <div ref={contentRef} className="px-4 pb-4 border-t border-red-100">
          {/* Sub-tabs */}
          <div className="flex gap-1 my-3 bg-white rounded-lg p-1 border border-red-100">
            {TABS.map(t => (
              <button key={t.key} type="button" onClick={() => switchTab(t.key)}
                className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${
                  tab === t.key ? 'bg-red-500 text-white' : 'text-gray-600 hover:bg-red-50'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Form row */}
          <div className="flex flex-wrap gap-2 mb-2 items-stretch">
            {/* Pincode (first, triggers auto-lookup) */}
            {tab === 'pincode' && (
              <div className="relative">
                <input
                  value={form.pincode}
                  onChange={e => setForm(p => ({ ...p, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                  placeholder="Pincode *" maxLength={6}
                  className="w-28 px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-400 focus:outline-none bg-white pr-7"
                />
                {pinLookup && <Loader2 className="w-3 h-3 absolute right-2 top-2.5 animate-spin text-red-400" />}
              </div>
            )}

            {/* State dropdown */}
            <SearchableDropdown
              options={STATES}
              value={form.stateName}
              onChange={v => setForm(p => ({ ...p, stateName: v, districtName: '' }))}
              placeholder="Select state *"
            />

            {/* District dropdown (only shown if tab needs it) */}
            {(tab === 'district' || tab === 'pincode') && (
              <SearchableDropdown
                options={districtOptions}
                value={form.districtName}
                onChange={v => setForm(p => ({ ...p, districtName: v }))}
                placeholder={districtOptions.length ? 'Select district *' : 'Select state first'}
                disabled={!form.stateName}
              />
            )}

            {/* Action buttons */}
            <div className="flex gap-1 shrink-0">
              <button type="button" onClick={handleAdd} disabled={isPending}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-60 whitespace-nowrap">
                {editId ? <><Edit2 className="w-3 h-3" /> Update</> : <><Plus className="w-3.5 h-3.5" /> Add</>}
              </button>
              {editId && (
                <button type="button" onClick={cancelEdit}
                  className="px-2 py-1.5 text-xs border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {err && <p className="text-xs text-red-600 mb-2">{err}</p>}

          {/* Restrictions list */}
          {items.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-3">No restrictions added</p>
          ) : (
            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              {items.map(item => (
                <div key={item._id}
                  className={`flex items-center justify-between bg-white border rounded-lg px-3 py-2 ${
                    editId === item._id
                      ? 'border-red-400 ring-1 ring-red-300'
                      : !item.isActive ? 'opacity-50 border-gray-100' : 'border-red-100'
                  }`}>
                  <div className="flex-1 min-w-0 text-xs">
                    <span className="font-medium text-gray-800">{item.stateName}</span>
                    {item.districtName && <span className="text-gray-500"> › {item.districtName}</span>}
                    {item.pincode      && <span className="text-gray-500 font-mono"> › {item.pincode}</span>}
                  </div>
                  <div className="flex items-center gap-1.5 ml-2 shrink-0">
                    <button type="button"
                      onClick={() => toggleMut.mutate({ id: item._id, isActive: !item.isActive })}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                      {item.isActive ? 'Active' : 'Off'}
                    </button>
                    <button type="button" onClick={() => startEdit(item)}
                      className="text-blue-400 hover:text-blue-600 p-0.5">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => delMut.mutate(item._id)}
                      className="text-red-400 hover:text-red-600 p-0.5">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-2">Restrictions apply globally at checkout for all products.</p>
        </div>
      )}
    </div>
  );
}
