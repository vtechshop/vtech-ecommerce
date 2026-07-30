// FILE: apps/web/src/assets/pages/dashboard/admin/HubManager.jsx
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard, Layout, Zap, Package, Star, TrendingUp,
  BookOpen, Building2, Share2, Phone, Search, Palette, BarChart2,
  History, Eye, Send, Save, Trash2, RotateCcw, Plus, GripVertical,
  ChevronUp, ChevronDown, ExternalLink, Download, CheckCircle,
  AlertCircle, Edit3, X, Globe, Clock,
} from 'lucide-react';
import api from '@/utils/api';
import { useToast } from '@/components/common/ToastContainer';
import Spinner from '@/components/common/Spinner';

// ── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'dashboard',    label: 'Dashboard',         icon: LayoutDashboard },
  { id: 'hero',         label: 'Hero',               icon: Layout          },
  { id: 'quick-actions',label: 'Quick Actions',      icon: Zap             },
  { id: 'products',     label: 'Featured Products',  icon: Package         },
  { id: 'why-us',       label: 'Why Choose Us',      icon: Star            },
  { id: 'stats',        label: 'Statistics',         icon: TrendingUp      },
  { id: 'resources',    label: 'Resources',          icon: BookOpen        },
  { id: 'services',     label: 'Business Services',  icon: Building2       },
  { id: 'social',       label: 'Social Media',       icon: Share2          },
  { id: 'contact',      label: 'Contact',            icon: Phone           },
  { id: 'seo',          label: 'SEO',                icon: Search          },
  { id: 'analytics',    label: 'Analytics',          icon: BarChart2       },
  { id: 'versions',     label: 'Version History',    icon: History         },
];

const ICON_OPTIONS = [
  'shopping-bag','phone','mail','map-pin','message-circle','package','shield',
  'file-text','arrow-right','book-open','headphones','building-2','trending-up',
  'star','users','tag','award','zap','truck','shield-check','youtube','factory',
  'link','globe','clock','check-circle','heart','download','external-link','search',
  'home','settings','camera','refresh-cw','share-2','upload','video','info',
];

const COLOR_PRESETS = [
  { label: 'Brand Blue',   value: 'bg-primary-600' },
  { label: 'Green',        value: 'bg-green-500'   },
  { label: 'Dark Green',   value: 'bg-green-600'   },
  { label: 'Blue',         value: 'bg-blue-600'    },
  { label: 'Blue Light',   value: 'bg-blue-500'    },
  { label: 'Orange',       value: 'bg-orange-500'  },
  { label: 'Yellow',       value: 'bg-yellow-500'  },
  { label: 'Red',          value: 'bg-red-500'     },
  { label: 'Purple',       value: 'bg-purple-600'  },
  { label: 'Gradient Blue','value': 'bg-gradient-to-r from-primary-600 to-primary-700' },
  { label: 'Gradient Emerald','value': 'bg-gradient-to-r from-emerald-500 to-emerald-600' },
  { label: 'Gradient Orange','value': 'bg-gradient-to-r from-orange-500 to-orange-600' },
];

const SOCIAL_PLATFORMS = [
  { value: 'youtube',   label: 'YouTube',   hoverBg: 'group-hover:bg-red-600'  },
  { value: 'instagram', label: 'Instagram', hoverBg: 'group-hover:bg-pink-600' },
  { value: 'facebook',  label: 'Facebook',  hoverBg: 'group-hover:bg-blue-700' },
  { value: 'linkedin',  label: 'LinkedIn',  hoverBg: 'group-hover:bg-blue-800' },
  { value: 'twitter',   label: 'Twitter/X', hoverBg: 'group-hover:bg-gray-900' },
  { value: 'whatsapp',  label: 'WhatsApp',  hoverBg: 'group-hover:bg-green-600'},
  { value: 'threads',   label: 'Threads',   hoverBg: 'group-hover:bg-gray-800' },
  { value: 'custom',    label: 'Custom',    hoverBg: 'group-hover:bg-primary-600'},
];

const ICON_BG_PRESETS = [
  'bg-red-500','bg-red-600','bg-primary-600','bg-blue-600','bg-green-500',
  'bg-green-600','bg-purple-600','bg-orange-500','bg-yellow-500','bg-gray-600',
  'bg-gradient-to-br from-primary-600 to-primary-700',
];

// ── Reusable field components ─────────────────────────────────────────────────

const Field = ({ label, children, hint }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    {children}
    {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
  </div>
);

const Input = (props) => (
  <input {...props} className={`input w-full ${props.className || ''}`} />
);

const Textarea = (props) => (
  <textarea {...props} rows={props.rows || 3} className={`input w-full resize-none ${props.className || ''}`} />
);

const Toggle = ({ checked, onChange, label }) => (
  <label className="flex items-center gap-2 cursor-pointer select-none">
    <div
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${checked ? 'bg-primary-600' : 'bg-gray-300'}`}
    >
      <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-5' : ''}`} />
    </div>
    {label && <span className="text-sm text-gray-700">{label}</span>}
  </label>
);

const IconSelect = ({ value, onChange }) => (
  <select value={value} onChange={e => onChange(e.target.value)} className="input w-full">
    {ICON_OPTIONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
  </select>
);

const ColorSelect = ({ value, onChange }) => (
  <select value={value} onChange={e => onChange(e.target.value)} className="input w-full">
    {COLOR_PRESETS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
    <option value={value} disabled={COLOR_PRESETS.some(c => c.value === value)}>
      Custom: {value}
    </option>
  </select>
);

// Reorder helpers
const moveUp = (arr, i) => {
  if (i === 0) return arr;
  const a = [...arr]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; return a;
};
const moveDown = (arr, i) => {
  if (i === arr.length - 1) return arr;
  const a = [...arr]; [a[i], a[i + 1]] = [a[i + 1], a[i]]; return a;
};

// ── Section editors ───────────────────────────────────────────────────────────

const HeroEditor = ({ data, onChange }) => {
  const set = (key, val) => onChange({ ...data, [key]: val });
  const setBtn = (btn, key, val) => onChange({ ...data, [btn]: { ...data[btn], [key]: val } });
  return (
    <div className="space-y-5">
      <Field label="Visible">
        <Toggle checked={data.visible !== false} onChange={v => set('visible', v)} label="Show hero section" />
      </Field>
      <Field label="Eyebrow (small text above headline)">
        <Input value={data.eyebrow || ''} onChange={e => set('eyebrow', e.target.value)} />
      </Field>
      <Field label="Headline">
        <Input value={data.headline || ''} onChange={e => set('headline', e.target.value)} />
      </Field>
      <Field label="Subheading">
        <Input value={data.subheading || ''} onChange={e => set('subheading', e.target.value)} />
      </Field>
      <Field label="Trust Text (small text below buttons)">
        <Input value={data.trustText || ''} onChange={e => set('trustText', e.target.value)} />
      </Field>
      <Field label="Badge (optional pill above eyebrow)">
        <Input value={data.badge || ''} onChange={e => set('badge', e.target.value)} placeholder="e.g. 🎉 New Collection" />
      </Field>
      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Primary Button</h4>
          <Field label="Text"><Input value={data.primaryButton?.text || ''} onChange={e => setBtn('primaryButton', 'text', e.target.value)} /></Field>
          <Field label="URL"><Input value={data.primaryButton?.url || ''} onChange={e => setBtn('primaryButton', 'url', e.target.value)} /></Field>
          <Toggle checked={data.primaryButton?.visible !== false} onChange={v => setBtn('primaryButton', 'visible', v)} label="Visible" />
        </div>
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Secondary Button</h4>
          <Field label="Text"><Input value={data.secondaryButton?.text || ''} onChange={e => setBtn('secondaryButton', 'text', e.target.value)} /></Field>
          <Field label="URL"><Input value={data.secondaryButton?.url || ''} onChange={e => setBtn('secondaryButton', 'url', e.target.value)} /></Field>
          <Toggle checked={data.secondaryButton?.visible !== false} onChange={v => setBtn('secondaryButton', 'visible', v)} label="Visible" />
        </div>
      </div>
    </div>
  );
};

const ItemListEditor = ({ items, onChange, renderForm, newItem }) => {
  const [editingIndex, setEditingIndex] = useState(null);
  const [draft, setDraft] = useState(null);

  const openNew = () => { setDraft({ ...newItem }); setEditingIndex('new'); };
  const openEdit = (i) => { setDraft({ ...items[i] }); setEditingIndex(i); };
  const close = () => { setDraft(null); setEditingIndex(null); };

  const save = () => {
    if (editingIndex === 'new') {
      onChange([...items, { ...draft, displayOrder: items.length }]);
    } else {
      const updated = [...items];
      updated[editingIndex] = draft;
      onChange(updated);
    }
    close();
  };

  const remove = (i) => {
    if (!window.confirm('Delete this item?')) return;
    onChange(items.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg">
          <div className="flex flex-col gap-0.5">
            <button onClick={() => onChange(moveUp(items, i))} disabled={i === 0} className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
            <button onClick={() => onChange(moveDown(items, i))} disabled={i === items.length - 1} className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
          </div>
          <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-gray-900 truncate">{item.label || item.title || '(untitled)'}</p>
            <p className="text-xs text-gray-500 truncate">{item.desc || item.href || ''}</p>
          </div>
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${item.visible !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {item.visible !== false ? 'On' : 'Off'}
          </span>
          <button onClick={() => openEdit(i)} className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"><Edit3 className="w-4 h-4" /></button>
          <button onClick={() => remove(i)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
        </div>
      ))}
      <button onClick={openNew} className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 flex items-center justify-center gap-2 transition-colors">
        <Plus className="w-4 h-4" /> Add Item
      </button>

      {editingIndex !== null && draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">{editingIndex === 'new' ? 'Add Item' : 'Edit Item'}</h3>
              <button onClick={close} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              {renderForm(draft, setDraft)}
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-100">
              <button onClick={close} className="btn btn-outline">Cancel</button>
              <button onClick={save} className="btn btn-primary">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const QuickActionsEditor = ({ data, onChange }) => (
  <ItemListEditor
    items={data || []}
    onChange={onChange}
    newItem={{ label: '', desc: '', icon: 'shopping-bag', href: '', color: 'bg-primary-600', visible: true, newTab: false, ping: false, analyticsKey: '' }}
    renderForm={(draft, setDraft) => {
      const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Label (button title)"><Input value={draft.label || ''} onChange={e => set('label', e.target.value)} /></Field>
            <Field label="Description"><Input value={draft.desc || ''} onChange={e => set('desc', e.target.value)} /></Field>
          </div>
          <Field label="URL / href"><Input value={draft.href || ''} onChange={e => set('href', e.target.value)} placeholder="https:// or /path" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Icon"><IconSelect value={draft.icon || 'shopping-bag'} onChange={v => set('icon', v)} /></Field>
            <Field label="Background Color"><ColorSelect value={draft.color || 'bg-primary-600'} onChange={v => set('color', v)} /></Field>
          </div>
          <Field label="Analytics Key" hint="Unique key for tracking clicks (e.g. shop_products)"><Input value={draft.analyticsKey || ''} onChange={e => set('analyticsKey', e.target.value)} placeholder="shop_products" /></Field>
          <div className="flex gap-6">
            <Toggle checked={draft.visible !== false} onChange={v => set('visible', v)} label="Visible" />
            <Toggle checked={!!draft.newTab} onChange={v => set('newTab', v)} label="Open in new tab" />
            <Toggle checked={!!draft.ping} onChange={v => set('ping', v)} label="Show live ping dot" />
          </div>
        </div>
      );
    }}
  />
);

const FeaturedProductsEditor = ({ data, onChange }) => {
  const set = (k, v) => onChange({ ...data, [k]: v });
  return (
    <div className="space-y-5">
      <Toggle checked={data.visible !== false} onChange={v => set('visible', v)} label="Show featured products section" />
      <Field label="Display Mode">
        <select value={data.mode || 'automatic'} onChange={e => set('mode', e.target.value)} className="input w-full">
          <option value="automatic">Automatic (from catalog)</option>
          <option value="manual">Manual (specific product IDs)</option>
        </select>
      </Field>
      {data.mode === 'automatic' && (
        <Field label="Auto-select products by">
          <select value={data.automaticMode || 'featured'} onChange={e => set('automaticMode', e.target.value)} className="input w-full">
            <option value="featured">Featured flag</option>
            <option value="newest">Newest first</option>
            <option value="bestsellers">Best sellers</option>
            <option value="highest_rated">Highest rated</option>
          </select>
        </Field>
      )}
      <Field label="Number of products to show (1–20)">
        <Input type="number" min={1} max={20} value={data.limit || 6} onChange={e => set('limit', Number(e.target.value))} />
      </Field>
      <p className="text-sm text-gray-500 bg-blue-50 border border-blue-100 rounded-lg p-3">
        Product details (titles, images, prices) are always fetched live from your catalog. Only the selection mode is controlled here.
      </p>
    </div>
  );
};

const WhyUsEditor = ({ data, onChange }) => (
  <ItemListEditor
    items={data || []}
    onChange={onChange}
    newItem={{ icon: 'star', title: '', desc: '', visible: true }}
    renderForm={(draft, setDraft) => {
      const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));
      return (
        <div className="space-y-4">
          <Field label="Icon"><IconSelect value={draft.icon || 'star'} onChange={v => set('icon', v)} /></Field>
          <Field label="Title"><Input value={draft.title || ''} onChange={e => set('title', e.target.value)} /></Field>
          <Field label="Description"><Textarea value={draft.desc || ''} onChange={e => set('desc', e.target.value)} /></Field>
          <Toggle checked={draft.visible !== false} onChange={v => set('visible', v)} label="Visible" />
        </div>
      );
    }}
  />
);

const StatsEditor = ({ data, onChange }) => (
  <ItemListEditor
    items={data || []}
    onChange={onChange}
    newItem={{ label: '', end: 0, suffix: '', prefix: '', decimals: 0, visible: true, animationEnabled: true }}
    renderForm={(draft, setDraft) => {
      const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));
      return (
        <div className="space-y-4">
          <Field label="Label (e.g. Happy Customers)"><Input value={draft.label || ''} onChange={e => set('label', e.target.value)} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Number (end value)"><Input type="number" value={draft.end || 0} onChange={e => set('end', Number(e.target.value))} /></Field>
            <Field label="Prefix (e.g. ★)"><Input value={draft.prefix || ''} onChange={e => set('prefix', e.target.value)} /></Field>
            <Field label="Suffix (e.g. +, /5)"><Input value={draft.suffix || ''} onChange={e => set('suffix', e.target.value)} /></Field>
          </div>
          <Field label="Decimal places"><Input type="number" min={0} max={4} value={draft.decimals || 0} onChange={e => set('decimals', Number(e.target.value))} /></Field>
          <div className="flex gap-6">
            <Toggle checked={draft.visible !== false} onChange={v => set('visible', v)} label="Visible" />
            <Toggle checked={draft.animationEnabled !== false} onChange={v => set('animationEnabled', v)} label="Count-up animation" />
          </div>
        </div>
      );
    }}
  />
);

const ResourcesEditor = ({ data, onChange }) => (
  <ItemListEditor
    items={data || []}
    onChange={onChange}
    newItem={{ icon: 'link', label: '', desc: '', href: '', iconClass: 'bg-primary-600', visible: true, newTab: true }}
    renderForm={(draft, setDraft) => {
      const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Label"><Input value={draft.label || ''} onChange={e => set('label', e.target.value)} /></Field>
            <Field label="Description"><Input value={draft.desc || ''} onChange={e => set('desc', e.target.value)} /></Field>
          </div>
          <Field label="URL"><Input value={draft.href || ''} onChange={e => set('href', e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Icon"><IconSelect value={draft.icon || 'link'} onChange={v => set('icon', v)} /></Field>
            <Field label="Icon Background">
              <select value={draft.iconClass || 'bg-primary-600'} onChange={e => set('iconClass', e.target.value)} className="input w-full">
                {ICON_BG_PRESETS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <div className="flex gap-6">
            <Toggle checked={draft.visible !== false} onChange={v => set('visible', v)} label="Visible" />
            <Toggle checked={draft.newTab !== false} onChange={v => set('newTab', v)} label="Open in new tab" />
          </div>
        </div>
      );
    }}
  />
);

const ServicesEditor = ({ data, onChange }) => (
  <ItemListEditor
    items={data || []}
    onChange={onChange}
    newItem={{ icon: 'arrow-right', label: '', desc: '', href: '', visible: true }}
    renderForm={(draft, setDraft) => {
      const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Label"><Input value={draft.label || ''} onChange={e => set('label', e.target.value)} /></Field>
            <Field label="Icon"><IconSelect value={draft.icon || 'arrow-right'} onChange={v => set('icon', v)} /></Field>
          </div>
          <Field label="Description"><Textarea value={draft.desc || ''} rows={2} onChange={e => set('desc', e.target.value)} /></Field>
          <Field label="URL"><Input value={draft.href || ''} onChange={e => set('href', e.target.value)} /></Field>
          <Toggle checked={draft.visible !== false} onChange={v => set('visible', v)} label="Visible" />
        </div>
      );
    }}
  />
);

const SocialsEditor = ({ data, onChange }) => (
  <ItemListEditor
    items={data || []}
    onChange={onChange}
    newItem={{ platform: 'custom', label: '', handle: '', href: '', hoverBg: 'group-hover:bg-primary-600', visible: true, newTab: true }}
    renderForm={(draft, setDraft) => {
      const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));
      const onPlatformChange = (platform) => {
        const preset = SOCIAL_PLATFORMS.find(p => p.value === platform);
        setDraft(d => ({ ...d, platform, hoverBg: preset?.hoverBg || d.hoverBg }));
      };
      return (
        <div className="space-y-4">
          <Field label="Platform">
            <select value={draft.platform || 'custom'} onChange={e => onPlatformChange(e.target.value)} className="input w-full">
              {SOCIAL_PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Label (display name)"><Input value={draft.label || ''} onChange={e => set('label', e.target.value)} /></Field>
            <Field label="Handle (e.g. @vtechkitchen)"><Input value={draft.handle || ''} onChange={e => set('handle', e.target.value)} /></Field>
          </div>
          <Field label="Profile URL"><Input value={draft.href || ''} onChange={e => set('href', e.target.value)} placeholder="https://..." /></Field>
          <div className="flex gap-6">
            <Toggle checked={draft.visible !== false} onChange={v => set('visible', v)} label="Visible" />
            <Toggle checked={draft.newTab !== false} onChange={v => set('newTab', v)} label="Open in new tab" />
          </div>
        </div>
      );
    }}
  />
);

const ContactEditor = ({ data, onChange }) => {
  const set = (k, v) => onChange({ ...data, [k]: v });
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Phone (display)"><Input value={data.phone || ''} onChange={e => set('phone', e.target.value)} /></Field>
        <Field label="Phone href (tel:+91...)"><Input value={data.phoneHref || ''} onChange={e => set('phoneHref', e.target.value)} /></Field>
        <Field label="WhatsApp (display)"><Input value={data.whatsapp || ''} onChange={e => set('whatsapp', e.target.value)} /></Field>
        <Field label="WhatsApp URL"><Input value={data.whatsappHref || ''} onChange={e => set('whatsappHref', e.target.value)} /></Field>
        <Field label="Email (display)"><Input value={data.email || ''} onChange={e => set('email', e.target.value)} /></Field>
        <Field label="Email href (mailto:...)"><Input value={data.emailHref || ''} onChange={e => set('emailHref', e.target.value)} /></Field>
      </div>
      <Field label="Address"><Textarea value={data.address || ''} rows={2} onChange={e => set('address', e.target.value)} /></Field>
      <Field label="Google Maps link"><Input value={data.mapsHref || ''} onChange={e => set('mapsHref', e.target.value)} /></Field>
      <Field label="Google Maps embed URL" hint="The URL inside <iframe src=...>"><Input value={data.mapsEmbed || ''} onChange={e => set('mapsEmbed', e.target.value)} /></Field>
      <Field label="Business Hours"><Input value={data.businessHours || ''} onChange={e => set('businessHours', e.target.value)} /></Field>
    </div>
  );
};

const SEOEditor = ({ data, onChange }) => {
  const set = (k, v) => onChange({ ...data, [k]: v });
  const titleLen = (data.title || '').length;
  const descLen  = (data.description || '').length;
  return (
    <div className="space-y-5">
      <Field label={`Page Title (${titleLen}/60 chars)`} hint="Appears in browser tab and Google search results">
        <Input value={data.title || ''} onChange={e => set('title', e.target.value)} maxLength={70} />
        <div className={`mt-1 text-xs ${titleLen > 60 ? 'text-red-500' : 'text-gray-500'}`}>{titleLen > 60 ? 'Too long — Google may truncate' : 'Good length'}</div>
      </Field>
      <Field label={`Meta Description (${descLen}/155 chars)`} hint="Shown under title in search results">
        <Textarea value={data.description || ''} onChange={e => set('description', e.target.value)} maxLength={165} />
        <div className={`mt-1 text-xs ${descLen > 155 ? 'text-red-500' : 'text-gray-500'}`}>{descLen > 155 ? 'Too long — Google may truncate' : 'Good length'}</div>
      </Field>
      <Field label="Keywords (comma-separated)"><Textarea value={data.keywords || ''} rows={2} onChange={e => set('keywords', e.target.value)} /></Field>
      <Field label="Canonical URL"><Input value={data.canonicalUrl || ''} onChange={e => set('canonicalUrl', e.target.value)} /></Field>
      <Field label="OG Image URL" hint="Used by Facebook, LinkedIn, WhatsApp when sharing"><Input value={data.ogImage || ''} onChange={e => set('ogImage', e.target.value)} /></Field>
      <Field label="Robots directive">
        <select value={data.robots || 'index, follow'} onChange={e => set('robots', e.target.value)} className="input w-full">
          <option value="index, follow">index, follow (visible to Google)</option>
          <option value="noindex, nofollow">noindex, nofollow (hidden from Google)</option>
          <option value="noindex, follow">noindex, follow</option>
        </select>
      </Field>
      <Toggle checked={data.sitemapInclude !== false} onChange={v => set('sitemapInclude', v)} label="Include in sitemap" />
    </div>
  );
};

// ── Analytics view ────────────────────────────────────────────────────────────

const AnalyticsDashboard = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['hub-analytics'],
    queryFn: async () => { const r = await api.get('/hub/admin/analytics'); return r.data.data; },
    refetchInterval: 60_000,
  });

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (!data)     return <p className="text-gray-500">No analytics data yet.</p>;

  const max = Math.max(...(data.buttons || []).map(b => b.total), 1);

  const exportCSV = async () => {
    const res = await api.get('/hub/admin/analytics/export', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a   = document.createElement('a');
    a.href = url; a.download = 'hub-analytics.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const StatCard = ({ title, value }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">Click Analytics</h3>
        <button onClick={exportCSV} className="btn btn-outline flex items-center gap-2 text-sm">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Total Clicks"   value={data.totalClicks}  />
        <StatCard title="Today"          value={data.todayClicks}  />
        <StatCard title="This Week"      value={data.weekClicks}   />
        <StatCard title="This Month"     value={data.monthClicks}  />
      </div>

      <div>
        <h4 className="font-medium text-gray-900 mb-3">Clicks by Button</h4>
        <div className="space-y-2">
          {(data.buttons || []).map(b => (
            <div key={b.button} className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-gray-900">{b.label || b.button}</span>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>Today: <b className="text-gray-900">{b.today}</b></span>
                  <span>Week: <b className="text-gray-900">{b.week}</b></span>
                  <span>Month: <b className="text-gray-900">{b.month}</b></span>
                  <span>Total: <b className="text-gray-900">{b.total}</b></span>
                  <span>CTR: <b className="text-gray-900">{b.ctr}%</b></span>
                </div>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full">
                <div className="h-1.5 bg-primary-500 rounded-full transition-all duration-500" style={{ width: `${(b.total / max) * 100}%` }} />
              </div>
            </div>
          ))}
          {(!data.buttons || data.buttons.length === 0) && (
            <p className="text-gray-500 text-sm text-center py-8">No clicks tracked yet. Analytics will appear once visitors start clicking buttons on the /hub page.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium text-gray-900 mb-3">By Device</h4>
          <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
            {(data.byDevice || []).map(d => (
              <div key={d.device} className="flex items-center justify-between text-sm">
                <span className="capitalize text-gray-700">{d.device}</span>
                <span className="font-semibold text-gray-900">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-medium text-gray-900 mb-3">By Referrer</h4>
          <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
            {(data.byReferrer || []).map(r => (
              <div key={r.referrer} className="flex items-center justify-between text-sm">
                <span className="capitalize text-gray-700">{r.referrer}</span>
                <span className="font-semibold text-gray-900">{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-medium text-gray-900 mb-3">Recent Clicks</h4>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-blue-100 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-gray-700">Button</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-700">Device</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-700">Referrer</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-700">Time</th>
              </tr>
            </thead>
            <tbody>
              {(data.recentClicks || []).map((c, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-900">{c.label || c.button}</td>
                  <td className="px-4 py-2.5 text-gray-600 capitalize">{c.deviceType}</td>
                  <td className="px-4 py-2.5 text-gray-600 capitalize">{c.referrer}</td>
                  <td className="px-4 py-2.5 text-gray-500">{new Date(c.timestamp).toLocaleString()}</td>
                </tr>
              ))}
              {(!data.recentClicks || data.recentClicks.length === 0) && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No clicks yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ── Version history view ──────────────────────────────────────────────────────

const VersionHistory = ({ onRestore }) => {
  const toast = useToast();
  const { data: versions, isLoading, refetch } = useQuery({
    queryKey: ['hub-versions'],
    queryFn: async () => { const r = await api.get('/hub/admin/versions'); return r.data.data; },
  });

  const restoreMutation = useMutation({
    mutationFn: (index) => api.post(`/hub/admin/versions/${index}/restore`),
    onSuccess: () => { toast.success('Version restored and published.'); refetch(); onRestore?.(); },
    onError:   (e) => toast.error(e.response?.data?.error?.message || 'Restore failed'),
  });

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">Up to 10 versions are kept. Restoring a version publishes it immediately and saves the current state as a new version.</p>
      {(!versions || versions.length === 0) && (
        <p className="text-gray-500 text-center py-8">No versions saved yet. Each time you publish, the previous state is saved here.</p>
      )}
      {(versions || []).map((v) => (
        <div key={v.index} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
          <div>
            <p className="font-medium text-gray-900">{v.note || 'Published version'}</p>
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
              <Clock className="w-3.5 h-3.5" /> {new Date(v.savedAt).toLocaleString()}
            </p>
          </div>
          <button
            onClick={() => { if (window.confirm('Restore this version? It will be published immediately.')) restoreMutation.mutate(v.index); }}
            disabled={restoreMutation.isPending}
            className="btn btn-outline text-sm flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Restore
          </button>
        </div>
      ))}
    </div>
  );
};

// ── Dashboard overview ────────────────────────────────────────────────────────

const DashboardOverview = ({ hubData, onTabChange }) => {
  const sections = [
    { id: 'hero',          label: 'Hero',              count: null },
    { id: 'quick-actions', label: 'Quick Actions',     count: hubData?.quickActions?.length },
    { id: 'why-us',        label: 'Why Choose Us',     count: hubData?.whyChooseUs?.length  },
    { id: 'stats',         label: 'Statistics',        count: hubData?.stats?.length        },
    { id: 'resources',     label: 'Resources',         count: hubData?.resources?.length    },
    { id: 'services',      label: 'Business Services', count: hubData?.services?.length     },
    { id: 'social',        label: 'Social Media',      count: hubData?.socials?.length      },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${hubData?.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
          {hubData?.status === 'published' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {hubData?.status === 'published' ? 'Published' : 'Draft'}
        </div>
        {hubData?.hasDraft && <span className="text-xs bg-yellow-50 border border-yellow-200 text-yellow-700 px-2 py-1 rounded-full">Unsaved draft</span>}
        {hubData?.publishedAt && (
          <span className="text-xs text-gray-500">Last published: {new Date(hubData.publishedAt).toLocaleString()}</span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {sections.map(s => (
          <button key={s.id} onClick={() => onTabChange(s.id)}
            className="text-left p-4 bg-white border border-gray-200 rounded-xl hover:border-primary-300 hover:shadow-sm transition-all group"
          >
            <p className="font-medium text-gray-900 group-hover:text-primary-600 text-sm">{s.label}</p>
            {s.count !== null && <p className="text-2xl font-bold text-gray-900 mt-1">{s.count}</p>}
            <p className="text-xs text-gray-500 mt-0.5">Click to edit →</p>
          </button>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <h3 className="font-medium text-blue-900 mb-1">How it works</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Edit any section using the tabs above</li>
          <li>Click <b>Save Section</b> to update that section immediately (live)</li>
          <li>Or click <b>Save Draft</b> to stage changes without going live</li>
          <li>Click <b>Publish</b> to make staged changes live and save a version</li>
          <li>Use <b>Preview</b> to see draft changes at /hub?preview=true</li>
        </ul>
      </div>
    </div>
  );
};

// ── Main HubManager component ─────────────────────────────────────────────────

const HubManager = () => {
  const toast          = useToast();
  const queryClient    = useQueryClient();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [formData, setFormData]   = useState(null);
  const [isDirty, setIsDirty]     = useState(false);

  const { data: hubData, isLoading, error } = useQuery({
    queryKey: ['admin-hub'],
    queryFn: async () => { const r = await api.get('/hub/admin'); return r.data.data; },
    staleTime: 30_000,
  });

  // Sync API data → local form state (only on first load or explicit discard)
  useEffect(() => {
    if (hubData && !isDirty) setFormData(hubData);
  }, [hubData, isDirty]);

  const handleSectionChange = useCallback((section, value) => {
    setFormData(prev => ({ ...prev, [section]: value }));
    setIsDirty(true);
  }, []);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-hub'] });

  // Save a single section immediately
  const saveSectionMutation = useMutation({
    mutationFn: ({ section, data }) => api.put(`/hub/admin/section/${section}`, data),
    onSuccess: (_, { section }) => {
      toast.success(`${section} saved.`);
      invalidate();
      setIsDirty(false);
    },
    onError: (e) => toast.error(e.response?.data?.error?.message || 'Save failed'),
  });

  const handleSaveSection = () => {
    const SECTION_MAP = {
      'hero':          'hero',
      'quick-actions': 'quickActions',
      'products':      'featuredProducts',
      'why-us':        'whyChooseUs',
      'stats':         'stats',
      'resources':     'resources',
      'services':      'services',
      'social':        'socials',
      'contact':       'contact',
      'seo':           'seo',
    };
    const section = SECTION_MAP[activeTab];
    if (!section || !formData) return;
    saveSectionMutation.mutate({ section, data: formData[section] });
  };

  const saveDraftMutation = useMutation({
    mutationFn: () => api.post('/hub/admin/draft', formData),
    onSuccess: () => { toast.success('Draft saved.'); invalidate(); setIsDirty(false); },
    onError:   (e) => toast.error(e.response?.data?.error?.message || 'Draft save failed'),
  });

  const publishMutation = useMutation({
    mutationFn: (note) => api.post('/hub/admin/publish', { ...formData, note }),
    onSuccess: () => { toast.success('Hub page published! Changes are now live.'); invalidate(); setIsDirty(false); },
    onError:   (e) => toast.error(e.response?.data?.error?.message || 'Publish failed'),
  });

  const discardMutation = useMutation({
    mutationFn: () => api.post('/hub/admin/discard'),
    onSuccess: () => { toast.success('Draft discarded.'); setFormData(hubData); setIsDirty(false); invalidate(); },
    onError:   (e) => toast.error(e.response?.data?.error?.message || 'Discard failed'),
  });

  const handleDiscard = () => {
    if (!window.confirm('Discard all unsaved changes?')) return;
    if (hubData?.hasDraft) {
      discardMutation.mutate();
    } else {
      setFormData(hubData);
      setIsDirty(false);
    }
  };

  const handlePublish = () => {
    const note = window.prompt('Optional note for this version (e.g. "Updated hero text"):', '') ?? '';
    publishMutation.mutate(note);
  };

  const EDIT_TABS = ['hero','quick-actions','products','why-us','stats','resources','services','social','contact','seo'];
  const showSaveSection = EDIT_TABS.includes(activeTab);

  const renderContent = () => {
    if (!formData) return <div className="flex justify-center py-12"><Spinner /></div>;
    switch (activeTab) {
      case 'dashboard':    return <DashboardOverview hubData={formData} onTabChange={setActiveTab} />;
      case 'hero':         return <HeroEditor data={formData.hero || {}} onChange={v => handleSectionChange('hero', v)} />;
      case 'quick-actions':return <QuickActionsEditor data={formData.quickActions || []} onChange={v => handleSectionChange('quickActions', v)} />;
      case 'products':     return <FeaturedProductsEditor data={formData.featuredProducts || {}} onChange={v => handleSectionChange('featuredProducts', v)} />;
      case 'why-us':       return <WhyUsEditor data={formData.whyChooseUs || []} onChange={v => handleSectionChange('whyChooseUs', v)} />;
      case 'stats':        return <StatsEditor data={formData.stats || []} onChange={v => handleSectionChange('stats', v)} />;
      case 'resources':    return <ResourcesEditor data={formData.resources || []} onChange={v => handleSectionChange('resources', v)} />;
      case 'services':     return <ServicesEditor data={formData.services || []} onChange={v => handleSectionChange('services', v)} />;
      case 'social':       return <SocialsEditor data={formData.socials || []} onChange={v => handleSectionChange('socials', v)} />;
      case 'contact':      return <ContactEditor data={formData.contact || {}} onChange={v => handleSectionChange('contact', v)} />;
      case 'seo':          return <SEOEditor data={formData.seo || {}} onChange={v => handleSectionChange('seo', v)} />;
      case 'analytics':    return <AnalyticsDashboard />;
      case 'versions':     return <VersionHistory onRestore={invalidate} />;
      default:             return null;
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (error)     return <div className="p-8 text-center text-red-600">Failed to load hub data: {error.message}</div>;

  const isBusy = saveSectionMutation.isPending || saveDraftMutation.isPending || publishMutation.isPending;

  return (
    <div>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Hub Manager</h1>
          <p className="text-gray-500 text-sm mt-1">Manage every element of the /hub landing page</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a href="/hub?preview=true" target="_blank" rel="noopener noreferrer"
            className="btn btn-outline flex items-center gap-1.5 text-sm">
            <Eye className="w-4 h-4" /> Preview
          </a>
          {showSaveSection && (
            <button onClick={handleSaveSection} disabled={isBusy || !isDirty}
              className="btn btn-outline flex items-center gap-1.5 text-sm disabled:opacity-50">
              <Save className="w-4 h-4" /> Save Section
            </button>
          )}
          <button onClick={() => saveDraftMutation.mutate()} disabled={isBusy || !isDirty}
            className="btn btn-outline flex items-center gap-1.5 text-sm disabled:opacity-50">
            <Save className="w-4 h-4" /> Save Draft
          </button>
          <button onClick={handlePublish} disabled={isBusy}
            className="btn btn-primary flex items-center gap-1.5 text-sm disabled:opacity-50">
            <Send className="w-4 h-4" /> {publishMutation.isPending ? 'Publishing…' : 'Publish'}
          </button>
          {isDirty && (
            <button onClick={handleDiscard} disabled={isBusy}
              className="btn btn-outline text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1.5 text-sm">
              <X className="w-4 h-4" /> Discard
            </button>
          )}
          <a href="/hub" target="_blank" rel="noopener noreferrer"
            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="Open /hub page">
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {isDirty && (
        <div className="mb-4 flex items-center gap-2 text-sm bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg px-4 py-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          You have unsaved changes. Click <b className="mx-1">Save Section</b> to update just this section, or <b className="mx-1">Publish</b> to push everything live.
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar tabs */}
        <div className="lg:w-52 flex-shrink-0">
          <nav className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium transition-colors text-left border-b border-gray-100 last:border-0 ${
                    activeTab === tab.id
                      ? 'bg-primary-50 text-primary-700 border-l-2 border-l-primary-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content area */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-5 pb-4 border-b border-gray-100">
              {TABS.find(t => t.id === activeTab)?.label}
            </h2>
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HubManager;
