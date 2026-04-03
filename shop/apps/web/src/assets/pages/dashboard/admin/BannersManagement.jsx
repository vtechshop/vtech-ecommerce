// FILE: apps/web/src/assets/pages/dashboard/admin/BannersManagement.jsx
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import toast from 'react-hot-toast';
import { Eye, Trash2, Edit, Plus, X } from 'lucide-react';

const BannersManagement = () => {
  const queryClient = useQueryClient();
  const [editingBanner, setEditingBanner] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: async () => {
      const res = await api.get('/banners/all');
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`/banners/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
      toast.success('Banner deleted');
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Delete failed'),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }) => api.put(`/banners/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  }

  const banners = data?.data || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Banner Management</h1>
        <Button onClick={() => { setEditingBanner(null); setShowModal(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Banner
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-blue-100 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-sm">Image</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Title</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Order</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Schedule</th>
                <th className="text-right py-3 px-4 font-semibold text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {banners.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-gray-500">No banners yet</td></tr>
              )}
              {banners.map((banner) => (
                <tr key={banner._id} className="border-b last:border-b-0 hover:bg-blue-50">
                  <td className="py-3 px-4">
                    <img
                      src={banner.image}
                      alt={banner.title}
                      className="w-24 h-12 object-cover rounded"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium">{banner.title}</div>
                    {banner.subtitle && <div className="text-sm text-gray-500">{banner.subtitle}</div>}
                  </td>
                  <td className="py-3 px-4">{banner.order}</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => toggleMutation.mutate({ id: banner._id, isActive: !banner.isActive })}
                      className={`inline-block px-2 py-1 text-xs font-semibold rounded-full cursor-pointer ${
                        banner.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {banner.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500">
                    {banner.startDate && <div>From: {new Date(banner.startDate).toLocaleDateString()}</div>}
                    {banner.endDate && <div>To: {new Date(banner.endDate).toLocaleDateString()}</div>}
                    {!banner.startDate && !banner.endDate && 'Always'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => { setEditingBanner(banner); setShowModal(true); }}
                        className="text-gray-700 hover:text-primary-600 p-1"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this banner?')) deleteMutation.mutate(banner._id);
                        }}
                        className="text-red-600 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <BannerModal
          banner={editingBanner}
          onClose={() => { setShowModal(false); setEditingBanner(null); }}
          onSave={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
            setShowModal(false);
            setEditingBanner(null);
          }}
        />
      )}
    </div>
  );
};

// Dynamic Link URL input with category/page suggestions from DB
const LinkUrlInput = ({ value, onChange }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [filter, setFilter] = useState('');
  const wrapperRef = useRef(null);

  const { data: catData } = useQuery({
    queryKey: ['categories-for-banner-link'],
    queryFn: async () => (await api.get('/categories?limit=100')).data,
    staleTime: 10 * 60 * 1000,
  });

  const { data: prodData } = useQuery({
    queryKey: ['products-for-banner-link', filter],
    queryFn: async () => {
      const q = filter && filter.length > 1 ? `&search=${encodeURIComponent(filter)}` : '';
      return (await api.get(`/products?limit=30&published=true${q}`)).data;
    },
    staleTime: 30 * 1000,
    enabled: showDropdown,
  });

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const categories = catData?.data || catData || [];
  const products = prodData?.data || prodData?.products || [];
  const staticOptions = [
    { label: 'All Products', path: '/products', group: 'Pages' },
    { label: 'All Categories', path: '/categories', group: 'Pages' },
    { label: 'Blog', path: '/blog', group: 'Pages' },
    { label: 'About Us', path: '/page/about', group: 'Pages' },
    { label: 'Contact', path: '/page/contact', group: 'Pages' },
  ];
  const categoryOptions = categories.map(c => ({
    label: c.name,
    path: `/category/${c.slug || c.name.toLowerCase().replace(/\s+/g, '-')}`,
    group: 'Categories',
  }));
  const productOptions = products.map(p => ({
    label: p.title,
    path: `/product/${p.slug || p._id}`,
    group: 'Products',
  }));
  const allOptions = [...staticOptions, ...categoryOptions, ...productOptions];
  const filtered = filter && filter.length > 0
    ? allOptions.filter(o => o.label.toLowerCase().includes(filter.toLowerCase()) || o.path.includes(filter))
    : allOptions;

  // Group for display
  const groups = ['Pages', 'Categories', 'Products'];

  return (
    <div ref={wrapperRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">Link URL</label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setFilter(e.target.value); setShowDropdown(true); }}
          onFocus={() => { setShowDropdown(true); }}
          placeholder="Search product, category or page..."
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
        />
        {showDropdown && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-xs text-gray-400">No matches</div>
            )}
            {groups.map(group => {
              const items = filtered.filter(o => o.group === group);
              if (items.length === 0) return null;
              return (
                <div key={group}>
                  <div className="px-3 py-1 text-xs font-semibold text-gray-400 bg-gray-50 border-b">{group}</div>
                  {items.map((opt) => (
                    <button
                      key={opt.path}
                      type="button"
                      onMouseDown={() => { onChange(opt.path); setShowDropdown(false); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between gap-2"
                    >
                      <span className="text-gray-700 truncate">{opt.label}</span>
                      <span className="text-xs text-gray-400 font-mono shrink-0">{opt.path}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-1">Shows "Shop Now →" button. Click or type to search.</p>
    </div>
  );
};

const BannerModal = ({ banner, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: banner?.title || '',
    subtitle: banner?.subtitle || '',
    link: banner?.link || '',
    order: banner?.order || 0,
    isActive: banner?.isActive !== undefined ? banner.isActive : true,
    startDate: banner?.startDate ? banner.startDate.split('T')[0] : '',
    endDate: banner?.endDate ? banner.endDate.split('T')[0] : '',
    imagePosition: banner?.imagePosition || '50',
    platform: banner?.platform || 'website',
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(banner?.image || '');

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const fd = new FormData();
      fd.append('title', data.title);
      fd.append('subtitle', data.subtitle);
      fd.append('link', data.link);
      fd.append('order', data.order);
      fd.append('isActive', data.isActive);
      fd.append('imagePosition', data.imagePosition);
      fd.append('platform', data.platform);
      if (data.startDate) fd.append('startDate', data.startDate);
      if (data.endDate) fd.append('endDate', data.endDate);
      if (imageFile) {
        fd.append('image', imageFile);
      } else if (banner?.image) {
        fd.append('image', banner.image);
      }

      if (banner?._id) {
        return api.put(`/banners/${banner._id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      return api.post('/banners', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      toast.success(banner?._id ? 'Banner updated' : 'Banner created');
      onSave();
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Save failed'),
  });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title) return toast.error('Title is required');
    if (!imageFile && !banner?.image) return toast.error('Image is required');
    saveMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-xl font-bold">{banner?._id ? 'Edit Banner' : 'Add Banner'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>

        {/* Live Preview */}
        <div className="p-5 border-b bg-gray-50">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" /> Live Preview — Homepage Hero
          </p>
          <div
            className="relative w-full overflow-hidden rounded-lg bg-gray-800"
            style={{ height: '200px' }}
          >
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Banner preview"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ objectPosition: `center ${formData.imagePosition}%` }}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-blue-400 flex items-center justify-center">
                <p className="text-white/40 text-sm">Upload an image to see preview</p>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-transparent" />
            <div className="absolute inset-0 flex items-center px-8">
              <div className="max-w-xs">
                <h3 className="text-white font-bold text-lg leading-tight mb-1">
                  {formData.title || 'Your Banner Title'}
                </h3>
                {formData.subtitle && (
                  <p className="text-white/80 text-xs mb-3 line-clamp-2">{formData.subtitle}</p>
                )}
                {formData.link && (
                  <span className="inline-block bg-white text-gray-900 px-3 py-1.5 rounded-md text-xs font-semibold">
                    Shop Now →
                  </span>
                )}
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">Actual size: ~1400×500px. Recommended image ratio: 16:5</p>
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Premium Commercial Grinders"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="e.g. Free shipping on orders over ₹500"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>
              <LinkUrlInput
                value={formData.link}
                onChange={(val) => setFormData({ ...formData, link: val })}
              />
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Banner Image *</label>
                <input type="file" accept="image/*" onChange={handleImageChange} className="w-full text-sm" />
                <p className="text-xs text-gray-400 mt-1">Recommended: 1400×500px, JPG/PNG, max 2MB</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image Position — <span className="text-primary-600 font-semibold">
                    {formData.imagePosition === '0' ? 'Top' : formData.imagePosition === '100' ? 'Bottom' : formData.imagePosition === '50' ? 'Center' : `${formData.imagePosition}%`}
                  </span>
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400">Top</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.imagePosition}
                    onChange={(e) => setFormData({ ...formData, imagePosition: e.target.value })}
                    className="flex-1 h-2 accent-primary-600 cursor-pointer"
                  />
                  <span className="text-xs text-gray-400">Bottom</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Drag to show which part of image is visible</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">0 = first slide</p>
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Active (visible on site)</span>
                  </label>
                </div>
              </div>
              {/* Show On */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Show On</label>
                <div className="flex gap-2">
                  {[
                    { value: 'website', label: '🖥 Website' },
                    { value: 'mobile', label: '📱 Mobile App' },
                    { value: 'both', label: '🌐 Both' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, platform: opt.value })}
                      className={`flex-1 py-2 px-3 text-sm rounded-lg border-2 font-medium transition-all ${
                        formData.platform === opt.value
                          ? 'border-primary-600 bg-primary-50 text-primary-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-5 mt-2 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : banner?._id ? 'Update Banner' : 'Create Banner'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BannersManagement;
