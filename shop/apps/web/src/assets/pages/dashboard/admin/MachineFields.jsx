// Admin extras for a Machine Article: photo gallery, YouTube demo, "Buy this machine" products, FAQs.
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Upload, Trash2, ArrowLeft, ArrowRight, Plus, Search, X } from 'lucide-react';
import api from '@/utils/api';
import { uploadToServer } from './GuideFields';

const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-primary-500';
export const productImage = (p) => {
  const img = p?.images?.[0];
  return typeof img === 'string' ? img : img?.url || '';
};

export function GalleryField({ images, onChange }) {
  const [uploading, setUploading] = useState(false);
  const add = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setUploading(true);
    const added = [];
    for (const file of files) {
      try {
        added.push((await uploadToServer(file, 'blog')).url);
      } catch (err) {
        toast.error(err.response?.data?.error?.message || `Could not upload ${file.name}`);
      }
    }
    onChange([...images, ...added]);
    setUploading(false);
  };
  const move = (i, d) => {
    const next = [...images];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  return (
    <fieldset className="rounded-lg border border-gray-200 p-4">
      <legend className="px-1 text-sm font-semibold text-gray-800">Photo gallery (slides on the page)</legend>
      <div className="flex flex-wrap gap-3">
        {images.map((src, i) => (
          <div key={src + i} className="relative w-28">
            <img src={src} alt="" className="h-24 w-28 rounded-lg border object-cover" />
            <div className="mt-1 flex justify-between">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30" aria-label="Move left"><ArrowLeft className="h-4 w-4" /></button>
              <button type="button" onClick={() => onChange(images.filter((_, j) => j !== i))} className="rounded p-1 text-red-500 hover:bg-red-50" aria-label="Remove photo"><Trash2 className="h-4 w-4" /></button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30" aria-label="Move right"><ArrowRight className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
        <label className={`flex h-24 w-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 text-xs text-gray-600 hover:border-primary-400 hover:text-primary-700 ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
          <Upload className="h-5 w-5" /> {uploading ? 'Uploading…' : 'Add photos'}
          <input type="file" accept="image/*" multiple className="sr-only" onChange={add} disabled={uploading} />
        </label>
      </div>
    </fieldset>
  );
}

export function ProductPicker({ products, onChange }) {
  const [search, setSearch] = useState('');
  const { data: results = [], isFetching } = useQuery({
    queryKey: ['blog-product-search', search],
    queryFn: async () => (await api.get('/admin/products', { params: { search, limit: 8 } })).data.data || [],
    enabled: search.trim().length >= 2,
    staleTime: 30000,
  });
  const chosen = new Set(products.map(p => String(p._id)));
  return (
    <fieldset className="rounded-lg border border-gray-200 p-4">
      <legend className="px-1 text-sm font-semibold text-gray-800">"Buy this machine" products</legend>
      {products.length > 0 && (
        <ul className="mb-3 space-y-2">
          {products.map(p => (
            <li key={p._id} className="flex items-center gap-3 rounded-lg bg-gray-50 p-2">
              {productImage(p) && <img src={productImage(p)} alt="" className="h-10 w-10 rounded object-cover" />}
              <span className="flex-1 text-sm">{p.title}</span>
              <button type="button" onClick={() => onChange(products.filter(x => x._id !== p._id))} className="rounded p-1 text-red-500 hover:bg-red-50" aria-label={`Remove ${p.title}`}><X className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" aria-hidden="true" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search your products (e.g. veg cutter)" className={`${inputCls} pl-9`} />
      </div>
      {search.trim().length >= 2 && (
        <ul className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-gray-200">
          {isFetching && <li className="p-2 text-sm text-gray-500">Searching…</li>}
          {!isFetching && results.length === 0 && <li className="p-2 text-sm text-gray-500">No products found</li>}
          {results.filter(p => !chosen.has(String(p._id))).map(p => (
            <li key={p._id}>
              <button type="button" onClick={() => { onChange([...products, p]); setSearch(''); }} className="flex w-full items-center gap-3 p-2 text-left text-sm hover:bg-primary-50">
                {productImage(p) && <img src={productImage(p)} alt="" className="h-8 w-8 rounded object-cover" />}
                <span className="flex-1">{p.title}</span>
                <Plus className="h-4 w-4 text-primary-600" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}

export function FaqField({ faqs, onChange }) {
  const update = (i, key, value) => onChange(faqs.map((f, j) => (j === i ? { ...f, [key]: value } : f)));
  return (
    <fieldset className="rounded-lg border border-gray-200 p-4">
      <legend className="px-1 text-sm font-semibold text-gray-800">Questions & answers (FAQ)</legend>
      <div className="space-y-3">
        {faqs.map((f, i) => (
          <div key={i} className="flex gap-2">
            <div className="flex-1 space-y-2">
              <input value={f.q} onChange={e => update(i, 'q', e.target.value)} placeholder="Question" aria-label="Question" className={inputCls} />
              <textarea rows={2} value={f.a} onChange={e => update(i, 'a', e.target.value)} placeholder="Answer" aria-label="Answer" className={inputCls} />
            </div>
            <button type="button" onClick={() => onChange(faqs.filter((_, j) => j !== i))} className="self-start rounded p-1 text-red-500 hover:bg-red-50" aria-label="Remove question"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => onChange([...faqs, { q: '', a: '' }])} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:text-primary-900">
        <Plus className="h-4 w-4" /> Add question
      </button>
    </fieldset>
  );
}
