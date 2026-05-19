// FILE: apps/web/src/pages/dashboard/admin/Categories.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import { useToast } from '@/components/common/ToastContainer';
import { Plus, Edit, Trash2, X, Save, FolderTree, Folder, ZoomIn, Upload, Clock, CheckCircle, RefreshCw, PackagePlus, Search, Package } from 'lucide-react';

const Categories = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [assigningCategory, setAssigningCategory] = useState(null); // {_id, name}

  const { data: categories, isLoading, refetch } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const response = await api.get('/admin/categories');
      return response.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      await api.post('/admin/categories', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setShowModal(false);
      toast.success('Category created successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create category');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await api.put(`/admin/categories/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setShowModal(false);
      toast.success('Category updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update category');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      toast.success('Category deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete category');
    },
  });

  const dismissDeleteRequest = useMutation({
    mutationFn: async (id) => {
      await api.put(`/admin/categories/${id}`, { deleteRequested: false, deleteRequestedBy: null, deleteRequestedAt: null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      toast.success('Delete request dismissed');
    },
  });

  const handleEdit = (category) => {
    setEditingCategory(category);
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this category?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Category Management</h1>
        <div className="flex items-center gap-2">
          <button onClick={refetch} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <Button
            onClick={() => {
              setEditingCategory(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </Button>
        </div>
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-blue-100 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sort</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status / Requests</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {categories?.filter(cat => !cat.parentId).map((parent) => (
              <React.Fragment key={parent._id}>
                <tr className="hover:bg-blue-100">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {parent.image ? (
                        <img src={parent.image} alt={parent.name} className="w-8 h-8 object-cover rounded" />
                      ) : (
                        <FolderTree className="w-5 h-5 text-blue-600" />
                      )}
                      <div>
                        <div className="font-medium text-gray-900">{parent.name}</div>
                        {parent.description && (
                          <div className="text-sm text-gray-500">{parent.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-sm bg-blue-100 px-2 py-1 rounded">{parent.slug}</code>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{parent.sortOrder || 0}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-block w-fit px-2 py-1 text-xs font-semibold rounded-full ${
                        parent.isActive ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-gray-900'
                      }`}>
                        {parent.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {parent.deleteRequested && (
                        <span className="inline-flex items-center gap-1 w-fit px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700">
                          <Clock className="w-3 h-3" /> Delete Requested
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setAssigningCategory(parent)} className="text-green-600 hover:text-green-800 inline-flex items-center gap-1 text-xs font-medium px-2 py-1 bg-green-50 rounded" title="Add Products to this category">
                        <PackagePlus className="w-3.5 h-3.5" /> Add Products
                      </button>
                      <button onClick={() => handleEdit(parent)} className="text-blue-600 hover:text-primary-800" title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(parent._id)} className="text-red-600 hover:text-red-800" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {parent.deleteRequested && (
                        <button onClick={() => dismissDeleteRequest.mutate(parent._id)} className="text-gray-500 hover:text-gray-700" title="Dismiss request">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {/* Subcategories */}
                {categories?.filter(cat => cat.parentId === parent._id).map((child) => (
                  <tr key={child._id} className="hover:bg-blue-100 bg-gray-25">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 ml-8">
                        <span className="text-gray-400">└─</span>
                        <Folder className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-700">{child.name}</div>
                          {child.description && (
                            <div className="text-xs text-gray-500">{child.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-sm bg-blue-100 px-2 py-1 rounded">{child.slug}</code>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{child.sortOrder || 0}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-block w-fit px-2 py-1 text-xs font-semibold rounded-full ${
                          child.isActive ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-gray-900'
                        }`}>
                          {child.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {child.deleteRequested && (
                          <span className="inline-flex items-center gap-1 w-fit px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700">
                            <Clock className="w-3 h-3" /> Delete Requested
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setAssigningCategory(child)} className="text-green-600 hover:text-green-800 inline-flex items-center gap-1 text-xs font-medium px-2 py-1 bg-green-50 rounded" title="Add Products to this category">
                          <PackagePlus className="w-3.5 h-3.5" /> Add Products
                        </button>
                        <button onClick={() => handleEdit(child)} className="text-blue-600 hover:text-primary-800" title="Edit">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(child._id)} className="text-red-600 hover:text-red-800" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {child.deleteRequested && (
                          <button onClick={() => dismissDeleteRequest.mutate(child._id)} className="text-gray-500 hover:text-gray-700" title="Dismiss request">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        {!categories || categories.length === 0 ? (
          <div className="text-center py-12">
            <FolderTree className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No categories found. Create your first category!</p>
          </div>
        ) : null}
      </div>

      {/* Category Modal */}
      {showModal && (
        <CategoryModal
          category={editingCategory}
          categories={categories}
          onClose={() => {
            setShowModal(false);
            setEditingCategory(null);
          }}
          onSave={(data) => {
            if (editingCategory) {
              updateMutation.mutate({ id: editingCategory._id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* Assign Products Modal */}
      {assigningCategory && (
        <AssignProductsModal
          category={assigningCategory}
          apiBase="/admin/products"
          onClose={() => setAssigningCategory(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
            toast.success('Products assigned successfully!');
            setAssigningCategory(null);
          }}
        />
      )}
    </div>
  );
};

// Category Modal Component
const CategoryModal = ({ category, categories, onClose, onSave, isLoading }) => {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    slug: category?.slug || '',
    description: category?.description || '',
    image: category?.image || '',
    parentId: category?.parentId || null,
    isActive: category?.isActive ?? true,
    sortOrder: category?.sortOrder || 0,
  });
  const [imageUploading, setImageUploading] = useState(false);
  const [imageZoom, setImageZoom] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const fd = new FormData();
      fd.append('files', file);
      const response = await api.post('/upload/multiple', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = response?.data?.data?.[0]?.url;
      if (url) setFormData(prev => ({ ...prev, image: url }));
    } catch (error) {
      alert('Image upload failed');
    } finally {
      setImageUploading(false);
    }
  };

  // Auto-generate slug from name
  const handleNameChange = (e) => {
    const name = e.target.value;
    const autoSlug = name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    setFormData({
      ...formData,
      name,
      // Only auto-generate slug when creating new category
      slug: !category ? autoSlug : formData.slug
    });
  };

  const handleSlugChange = (e) => {
    const slug = e.target.value
      .toLowerCase()
      .replace(/[^\w-]/g, '')
      .replace(/^-+|-+$/g, '');
    setFormData({ ...formData, slug });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  // Get parent categories (only top-level, exclude current category)
  const parentCategories = categories?.filter(cat =>
    !cat.parentId && cat._id !== category?._id
  ) || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50 rounded-t-xl">
          <h2 className="text-lg font-bold text-gray-900">
            {category ? 'Edit Category' : 'Create New Category'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            {/* Image Upload Section - Amazon style */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Category Image</label>
              {formData.image ? (
                <div className="relative border-2 border-gray-200 rounded-lg overflow-hidden bg-white">
                  <div className="relative w-full h-44 flex items-center justify-center bg-gray-50">
                    <img src={formData.image} alt="Category" className="max-w-full max-h-full object-contain" />
                  </div>
                  {/* Action bar below image */}
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-t">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setImageZoom(true)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border rounded-md hover:bg-gray-100 transition-colors">
                        <ZoomIn className="w-3.5 h-3.5" /> Preview
                      </button>
                      <label className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border rounded-md hover:bg-gray-100 transition-colors cursor-pointer">
                        <Upload className="w-3.5 h-3.5" /> Replace
                        <input type="file" accept="image/*" onChange={handleImageUpload} disabled={imageUploading} className="hidden" />
                      </label>
                    </div>
                    <button type="button" onClick={() => setFormData({ ...formData, image: '' })} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors">
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm font-medium text-gray-600">Click to upload image</span>
                  <span className="text-xs text-gray-400 mt-1">JPG, PNG, WebP, SVG supported</span>
                  <span className="text-xs text-gray-400">Displayed on homepage & category pages</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} disabled={imageUploading} className="hidden" />
                </label>
              )}
              {imageUploading && (
                <div className="flex items-center gap-2 mt-2 text-sm text-primary-600">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" /></svg>
                  Uploading...
                </div>
              )}
            </div>

            {/* Image Zoom Modal */}
            {imageZoom && formData.image && (
              <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={() => setImageZoom(false)}>
                <div className="relative max-w-3xl max-h-[85vh] w-full" onClick={(e) => e.stopPropagation()}>
                  <button type="button" onClick={() => setImageZoom(false)} className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                  <img src={formData.image} alt="Category Preview" className="w-full h-full object-contain rounded-lg" />
                </div>
              </div>
            )}

            {/* Name & Slug */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={handleNameChange}
                  className="input w-full"
                  required
                  placeholder="e.g., Electronics"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Slug <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={handleSlugChange}
                  className="input w-full font-mono text-sm"
                  required
                  placeholder="e.g., electronics"
                />
                <p className="text-xs text-gray-400 mt-1">Auto-generated from name</p>
              </div>
            </div>

            {/* Parent & Sort Order */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Parent Category</label>
                <select
                  value={formData.parentId || ''}
                  onChange={(e) => setFormData({ ...formData, parentId: e.target.value || null })}
                  className="input w-full"
                >
                  <option value="">None (Top Level)</option>
                  {parentCategories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Sort Order</label>
                <input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                  className="input w-full"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input w-full"
                rows={3}
                placeholder="Brief description of this category"
              />
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <label htmlFor="isActive" className="text-sm font-semibold text-gray-700">Status</label>
                <p className="text-xs text-gray-500">Inactive categories are hidden from customers</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : category ? 'Update Category' : 'Create Category'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Assign Products to Category Modal
const AssignProductsModal = ({ category, apiBase, onClose, onSuccess }) => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['assign-products-list', apiBase],
    queryFn: async () => {
      const res = await api.get(`${apiBase}?limit=500`);
      return res.data.data || [];
    },
    staleTime: 30000,
  });

  // Pre-select products already in this category
  React.useEffect(() => {
    if (data) {
      const preSelected = new Set(
        data.filter(p => p.categoryIds?.map(String).includes(String(category._id))).map(p => p._id)
      );
      setSelected(preSelected);
    }
  }, [data, category._id]);

  const filtered = (data || []).filter(p =>
    p.title?.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleProduct = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (filtered.every(p => selected.has(p._id))) {
      setSelected(prev => {
        const next = new Set(prev);
        filtered.forEach(p => next.delete(p._id));
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        filtered.forEach(p => next.add(p._id));
        return next;
      });
    }
  };

  const handleSave = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      await api.post(`${apiBase}/assign-category`, {
        categoryId: category._id,
        productIds: [...selected],
      });
      onSuccess();
    } catch (e) {
      alert(e.response?.data?.error?.message || 'Failed to assign products');
    } finally {
      setSaving(false);
    }
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every(p => selected.has(p._id));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50 rounded-t-xl">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Add Products to Category</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              <span className="font-medium text-blue-700">{category.name}</span>
              {selected.size > 0 && <span className="ml-2 text-green-700 font-medium">· {selected.size} selected</span>}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products by name or SKU..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-9 w-full text-sm"
              autoFocus
            />
          </div>
        </div>

        {/* Select all row */}
        {!isLoading && filtered.length > 0 && (
          <div className="px-6 py-2 border-b bg-gray-50 flex items-center gap-3">
            <input
              type="checkbox"
              checked={allFilteredSelected}
              onChange={toggleAll}
              className="w-4 h-4 rounded text-blue-600"
            />
            <span className="text-xs font-medium text-gray-600">
              {allFilteredSelected ? 'Deselect all' : `Select all ${filtered.length} shown`}
            </span>
          </div>
        )}

        {/* Product list */}
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-1.5">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No products found</p>
            </div>
          ) : (
            filtered.map(product => {
              const isSelected = selected.has(product._id);
              const alreadyIn = product.categoryIds?.map(String).includes(String(category._id));
              return (
                <label
                  key={product._id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${
                    isSelected ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleProduct(product._id)}
                    className="w-4 h-4 rounded text-blue-600 flex-shrink-0"
                  />
                  {product.images?.[0] ? (
                    <img src={product.images[0]} alt={product.title} className="w-10 h-10 object-cover rounded-lg border border-gray-200 flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">{product.title}</div>
                    <div className="text-xs text-gray-500">₹{product.price?.toLocaleString('en-IN')} {product.sku && `· ${product.sku}`}</div>
                  </div>
                  {alreadyIn && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">In category</span>
                  )}
                </label>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50 rounded-b-xl">
          <span className="text-sm text-gray-500">{selected.size} product{selected.size !== 1 ? 's' : ''} selected</span>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="button" onClick={handleSave} disabled={saving || selected.size === 0}>
              {saving ? 'Assigning...' : `Assign ${selected.size > 0 ? selected.size : ''} Product${selected.size !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Categories;