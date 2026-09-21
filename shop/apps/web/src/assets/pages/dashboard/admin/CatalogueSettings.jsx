// FILE: apps/web/src/assets/pages/dashboard/admin/CatalogueSettings.jsx
// Admin page for controlling the public /catalog page settings.
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import toast from 'react-hot-toast';
import { ExternalLink, Search, X, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import { normalizeImageUrl, PLACEHOLDER_IMAGE_MD } from '@/utils/placeholders';

// ─── Toggle switch ───────────────────────────────────────────────────────────
const Toggle = ({ checked, onChange, label, description }) => (
  <div className="flex items-start justify-between gap-4">
    <div>
      <p className="text-sm font-medium text-gray-700">{label}</p>
      {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 w-10 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
        checked ? 'bg-primary-600' : 'bg-gray-300'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);

// ─── Compact product row for the manual selection list ───────────────────────
const ManualProductRow = ({ product, index, total, onMoveUp, onMoveDown, onRemove }) => {
  const img = normalizeImageUrl(product.images?.[0], { width: 80, quality: 'auto', format: 'auto' });
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 bg-white border border-gray-200 rounded-lg">
      <GripVertical className="w-4 h-4 text-gray-300 shrink-0" aria-hidden="true" />
      <span className="text-xs text-gray-400 w-5 text-right shrink-0">{index + 1}</span>
      <img
        src={img}
        alt={product.title}
        className="w-8 h-8 object-contain rounded bg-gray-50 shrink-0"
        onError={(e) => { e.target.src = PLACEHOLDER_IMAGE_MD; e.target.onerror = null; }}
      />
      <span className="text-xs text-gray-800 flex-1 truncate">{product.title}</span>
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={index === 0}
          className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-25"
          aria-label="Move up"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={index === total - 1}
          className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-25"
          aria-label="Move down"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="p-0.5 text-red-400 hover:text-red-600 ml-1"
          aria-label="Remove"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

// ─── Product search picker for manual mode ───────────────────────────────────
const ProductPicker = ({ selectedIds, onAdd }) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const timeoutRef = useRef(null);

  const handleChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setDebouncedQuery(v), 350);
  };

  const { data, isFetching } = useQuery({
    queryKey: ['catalogue-product-search', debouncedQuery],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '12' });
      if (debouncedQuery) params.append('q', debouncedQuery);
      const res = await api.get(`/catalog/products?${params}`);
      return res.data.data || [];
    },
    staleTime: 30 * 1000,
    enabled: true,
  });

  const results = (data || []).filter(p => !selectedIds.includes(String(p._id)));

  return (
    <div className="border border-gray-200 rounded-lg bg-gray-50 p-3">
      <div className="relative mb-2">
        <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={handleChange}
          placeholder="Search products to add..."
          className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        {isFetching && <Spinner size="xs" className="absolute right-2.5 top-2.5" />}
      </div>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {results.length === 0 && !isFetching && (
          <p className="text-xs text-gray-400 text-center py-3">
            {debouncedQuery ? 'No products found' : 'Type to search products'}
          </p>
        )}
        {results.map((product) => {
          const img = normalizeImageUrl(product.images?.[0], { width: 48, quality: 'auto', format: 'auto' });
          return (
            <button
              key={product._id}
              type="button"
              onClick={() => onAdd(product)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-left rounded-lg hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-gray-200"
            >
              <img
                src={img}
                alt={product.title}
                className="w-7 h-7 object-contain rounded bg-white shrink-0"
                onError={(e) => { e.target.src = PLACEHOLDER_IMAGE_MD; e.target.onerror = null; }}
              />
              <span className="text-xs text-gray-700 truncate flex-1">{product.title}</span>
              <span className="text-[10px] text-primary-600 font-medium shrink-0">+ Add</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─── Main admin page ─────────────────────────────────────────────────────────
const CatalogueSettingsPage = () => {
  const queryClient = useQueryClient();

  // Form state
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [showSearch, setShowSearch] = useState(true);
  const [showCategoryFilter, setShowCategoryFilter] = useState(true);
  const [productMode, setProductMode] = useState('all');
  const [manualProducts, setManualProducts] = useState([]); // [{_id, title, slug, images}]
  const [categoryId, setCategoryId] = useState('');
  const [productsPerPage, setProductsPerPage] = useState(48);
  const [initialised, setInitialised] = useState(false);

  // Fetch current settings
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['admin-catalogue-settings'],
    queryFn: async () => {
      const res = await api.get('/catalogue-settings/admin');
      return res.data.data;
    },
  });

  // Fetch categories for the category dropdown
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/catalog/categories');
      return res.data.data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Populate form from fetched settings (once)
  useEffect(() => {
    if (!settingsData || initialised) return;
    setTitle(settingsData.title ?? 'Product Catalogue');
    setSubtitle(settingsData.subtitle ?? '');
    setShowSearch(settingsData.showSearch ?? true);
    setShowCategoryFilter(settingsData.showCategoryFilter ?? true);
    setProductMode(settingsData.productMode ?? 'all');
    setProductsPerPage(settingsData.productsPerPage ?? 48);
    setCategoryId(settingsData.categoryId?._id || settingsData.categoryId || '');

    // manualProducts come back populated: [{productId: {_id, title, slug, images}, order}]
    if (Array.isArray(settingsData.manualProducts)) {
      const sorted = [...settingsData.manualProducts]
        .sort((a, b) => a.order - b.order)
        .map(entry => entry.productId)
        .filter(Boolean);
      setManualProducts(sorted);
    }
    setInitialised(true);
  }, [settingsData, initialised]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title,
        subtitle,
        showSearch,
        showCategoryFilter,
        productMode,
        productsPerPage,
        categoryId: productMode === 'category' ? categoryId || null : null,
        manualProducts: productMode === 'manual'
          ? manualProducts.map((p, i) => ({ productId: p._id, order: i }))
          : [],
      };
      return api.put('/catalogue-settings', payload);
    },
    onSuccess: () => {
      toast.success('Catalogue settings saved');
      queryClient.invalidateQueries({ queryKey: ['admin-catalogue-settings'] });
      queryClient.invalidateQueries({ queryKey: ['catalogue-settings'] });
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Save failed'),
  });

  // Manual product list helpers
  const handleAddProduct = (product) => {
    if (manualProducts.some(p => p._id === product._id)) return;
    setManualProducts(prev => [...prev, product]);
  };

  const handleMoveProduct = (fromIndex, toIndex) => {
    setManualProducts(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const handleRemoveProduct = (index) => {
    setManualProducts(prev => prev.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const selectedIds = manualProducts.map(p => String(p._id));

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catalogue Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Controls what customers see at the public catalogue page.</p>
        </div>
        <Link
          to="/catalog"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 border border-primary-200 rounded-lg px-3 py-1.5 hover:bg-primary-50 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Preview
        </Link>
      </div>

      <div className="space-y-5">
        {/* Page Text */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Page Text</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Catalogue Title <span className="text-gray-400 font-normal">(max 100 chars)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder="Product Catalogue"
              className="input w-full"
            />
            <p className="text-xs text-gray-400 mt-1">{title.length}/100</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subtitle <span className="text-gray-400 font-normal">(max 200 chars)</span>
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              maxLength={200}
              placeholder="Commercial Kitchen & Food Processing Machines"
              className="input w-full"
            />
            <p className="text-xs text-gray-400 mt-1">{subtitle.length}/200</p>
          </div>
        </section>

        {/* Visibility Toggles */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Page Features</h2>
          <Toggle
            checked={showSearch}
            onChange={setShowSearch}
            label="Show Search Bar"
            description="Lets customers search machines by name"
          />
          <hr className="border-gray-100" />
          <Toggle
            checked={showCategoryFilter}
            onChange={setShowCategoryFilter}
            label="Show Category Filter"
            description="Compact pill row to filter by category"
          />
        </section>

        {/* Product Source */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Products to Display</h2>

          {/* Mode radio */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'all', label: 'All Products', desc: 'Every published product, paginated' },
              { value: 'manual', label: 'Manual Selection', desc: 'You pick and order specific products' },
              { value: 'category', label: 'By Category', desc: 'All products in one category' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setProductMode(opt.value)}
                className={`rounded-lg border-2 p-3 text-left transition-colors ${
                  productMode === opt.value
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <p className={`text-sm font-medium ${productMode === opt.value ? 'text-primary-700' : 'text-gray-800'}`}>
                  {opt.label}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">{opt.desc}</p>
              </button>
            ))}
          </div>

          {/* Category picker */}
          {productMode === 'category' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="input w-full"
              >
                <option value="">— select a category —</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Manual product picker */}
          {productMode === 'manual' && (
            <div className="space-y-3">
              {/* Ordered list */}
              {manualProducts.length > 0 ? (
                <div className="space-y-1.5">
                  {manualProducts.map((product, index) => (
                    <ManualProductRow
                      key={product._id}
                      product={product}
                      index={index}
                      total={manualProducts.length}
                      onMoveUp={() => handleMoveProduct(index, index - 1)}
                      onMoveDown={() => handleMoveProduct(index, index + 1)}
                      onRemove={() => handleRemoveProduct(index)}
                    />
                  ))}
                  <p className="text-[11px] text-gray-400">
                    {manualProducts.length} product{manualProducts.length !== 1 ? 's' : ''} selected
                  </p>
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-3 border border-dashed border-gray-200 rounded-lg">
                  No products selected yet. Search below to add.
                </p>
              )}

              {/* Search / add picker */}
              <ProductPicker selectedIds={selectedIds} onAdd={handleAddProduct} />
            </div>
          )}
        </section>

        {/* Products per page — only meaningful for all/category modes */}
        {productMode !== 'manual' && (
          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Pagination</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Products per page</label>
              <input
                type="number"
                value={productsPerPage}
                min={12}
                max={200}
                onWheel={(e) => e.target.blur()}
                onChange={(e) => setProductsPerPage(parseInt(e.target.value) || 48)}
                className="input w-32"
              />
              <p className="text-xs text-gray-400 mt-1">Between 12 and 200. Keep it a multiple of 4 for clean rows.</p>
            </div>
          </section>
        )}

        {/* Save */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Saving…' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CatalogueSettingsPage;
