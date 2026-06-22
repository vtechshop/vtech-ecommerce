import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Plus, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { STATES, DISTRICTS } from './indiaGeoData';

// ─── Portal dropdown (same pattern as ShippingRestrictionsWidget) ─────────────
function SearchableDropdown({ options, value, onChange, placeholder, disabled }) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');
  const [rect, setRect]   = useState(null);
  const [ref, setRef]     = useState(null);
  const [listRef, setListRef] = useState(null);

  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()));

  const openDrop = () => {
    if (disabled) return;
    if (ref) setRect(ref.getBoundingClientRect());
    setQuery(''); setOpen(true);
  };

  const pick = (opt) => { onChange(opt); setOpen(false); setQuery(''); };

  const handleOutside = (e) => {
    if (!ref?.contains(e.target) && !listRef?.contains(e.target)) { setOpen(false); setQuery(''); }
  };

  if (open) document.addEventListener('mousedown', handleOutside, { once: true });

  const dropStyle = rect ? { position: 'fixed', top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 99999 } : {};

  return (
    <div className="flex-1 min-w-24">
      <div ref={setRef} onClick={openDrop}
        className={`flex items-center justify-between px-3 py-1.5 text-xs border rounded-lg cursor-pointer bg-white select-none ${
          disabled ? 'opacity-40 cursor-not-allowed' : 'border-gray-300 hover:border-orange-400'
        } ${open ? 'border-orange-400 ring-1 ring-orange-300' : ''}`}>
        <span className={value ? 'text-gray-800' : 'text-gray-400'}>{value || placeholder}</span>
        <ChevronDown className="w-3 h-3 text-gray-400 shrink-0 ml-1" />
      </div>

      {open && rect && createPortal(
        <div ref={setListRef} style={dropStyle} className="bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
          <div className="p-1.5 border-b border-gray-100">
            <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
              onClick={e => e.stopPropagation()} placeholder="Search..."
              className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-orange-400" />
          </div>
          <div className="max-h-44 overflow-y-auto">
            {value && <button type="button" onClick={() => pick('')} className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-50 italic">— Clear</button>}
            {filtered.length === 0
              ? <p className="px-3 py-2 text-xs text-gray-400">No results</p>
              : filtered.map(o => (
                <button key={o} type="button" onClick={() => pick(o)}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${value === o ? 'bg-orange-50 text-orange-700 font-semibold' : 'text-gray-700 hover:bg-orange-50'}`}>
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

// ─── Main widget ──────────────────────────────────────────────────────────────
const TABS = [
  { key: 'state',    label: 'State' },
  { key: 'district', label: 'District' },
  { key: 'pincode',  label: 'Pincode' },
];
const EMPTY = { type: 'state', stateName: '', districtName: '', pincode: '' };

export default function ProductRestrictionsWidget({ value = [], onChange }) {
  const [open, setOpen]           = useState(false);
  const [tab, setTab]             = useState('state');
  const [form, setForm]           = useState(EMPTY);
  const [err, setErr]             = useState('');
  const [pinLookup, setPinLookup] = useState(false);

  const switchTab = (key) => { setTab(key); setForm({ ...EMPTY, type: key }); setErr(''); };

  // Pincode → auto-fill state + district
  const handlePincodeChange = (pin) => {
    const cleaned = pin.replace(/\D/g, '').slice(0, 6);
    setForm(p => ({ ...p, pincode: cleaned }));
    if (cleaned.length !== 6) return;
    setPinLookup(true);
    fetch(`https://api.postalpincode.in/pincode/${cleaned}`)
      .then(r => r.json())
      .then(json => {
        if (json[0]?.Status === 'Success' && json[0]?.PostOffice?.length) {
          const po = json[0].PostOffice[0];
          setForm(p => ({ ...p, stateName: po.State || p.stateName, districtName: po.District || p.districtName }));
        }
      })
      .catch(() => {})
      .finally(() => setPinLookup(false));
  };

  const handleAdd = () => {
    if (!form.stateName.trim()) { setErr('Select a state'); return; }
    if (tab === 'district' && !form.districtName.trim()) { setErr('Select a district'); return; }
    if (tab === 'pincode'  && !form.pincode.trim())      { setErr('Enter pincode'); return; }

    // Prevent duplicates
    const isDup = value.some(r =>
      r.type === tab &&
      r.stateName.toLowerCase()    === form.stateName.toLowerCase() &&
      (r.districtName || '').toLowerCase() === (form.districtName || '').toLowerCase() &&
      (r.pincode || '') === (form.pincode || '')
    );
    if (isDup) { setErr('Already added'); return; }

    setErr('');
    onChange([...value, { type: tab, stateName: form.stateName, districtName: form.districtName, pincode: form.pincode }]);
    setForm({ ...EMPTY, type: tab });
  };

  const handleRemove = (idx) => onChange(value.filter((_, i) => i !== idx));

  const districtOptions = (form.stateName && DISTRICTS[form.stateName]) || [];

  return (
    <div className="md:col-span-2 border border-orange-200 bg-orange-50 rounded-lg mt-1">
      {/* Toggle header */}
      <button type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o); }}
        className="flex items-center justify-between w-full text-left p-4">
        <div>
          <h3 className="text-sm font-semibold text-orange-800">
            Product Delivery Restrictions
            {value.length > 0 && (
              <span className="ml-2 text-xs bg-orange-200 text-orange-700 px-1.5 py-0.5 rounded-full">{value.length}</span>
            )}
          </h3>
          <p className="text-xs text-orange-600 mt-0.5">Block delivery of this product to specific states, districts, or pincodes</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-orange-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-orange-500 shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-orange-100">
          {/* Sub-tabs */}
          <div className="flex gap-1 my-3 bg-white rounded-lg p-1 border border-orange-100">
            {TABS.map(t => (
              <button key={t.key} type="button" onClick={() => switchTab(t.key)}
                className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${
                  tab === t.key ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-orange-50'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Add form */}
          <div className="flex flex-wrap gap-2 mb-2 items-stretch">
            {tab === 'pincode' && (
              <div className="relative">
                <input value={form.pincode} onChange={e => handlePincodeChange(e.target.value)}
                  placeholder="Pincode *" maxLength={6}
                  className="w-28 px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-orange-400 focus:outline-none bg-white pr-7" />
                {pinLookup && <Loader2 className="w-3 h-3 absolute right-2 top-2.5 animate-spin text-orange-400" />}
              </div>
            )}

            <SearchableDropdown options={STATES} value={form.stateName}
              onChange={v => setForm(p => ({ ...p, stateName: v, districtName: '' }))}
              placeholder="Select state *" />

            {(tab === 'district' || tab === 'pincode') && (
              <SearchableDropdown options={districtOptions} value={form.districtName}
                onChange={v => setForm(p => ({ ...p, districtName: v }))}
                placeholder={districtOptions.length ? 'Select district *' : 'Select state first'}
                disabled={!form.stateName} />
            )}

            <button type="button" onClick={handleAdd}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-orange-500 text-white rounded-lg hover:bg-orange-600 whitespace-nowrap shrink-0">
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
          {err && <p className="text-xs text-red-600 mb-2">{err}</p>}

          {/* List */}
          {value.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-3">No restrictions for this product</p>
          ) : (
            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              {value.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white border border-orange-100 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0 text-xs">
                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-medium ${
                      item.type === 'state' ? 'bg-blue-100 text-blue-700' :
                      item.type === 'district' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                    }`}>{item.type}</span>
                    <span className="font-medium text-gray-800">{item.stateName}</span>
                    {item.districtName && <span className="text-gray-500">› {item.districtName}</span>}
                    {item.pincode      && <span className="text-gray-500 font-mono">› {item.pincode}</span>}
                  </div>
                  <button type="button" onClick={() => handleRemove(idx)} className="text-red-400 hover:text-red-600 ml-2 shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-2">These restrictions apply only to this product at checkout.</p>
        </div>
      )}
    </div>
  );
}
