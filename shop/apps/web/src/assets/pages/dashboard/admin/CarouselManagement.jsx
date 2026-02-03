import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, X, Upload, Eye, EyeOff, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import api from '../../../utils/api';
import { useToast } from '../../../components/common/ToastContainer';

const CarouselManagement = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    brand: '',
    description: '',
    tags: '',
    imageUrl: '',
    link: '',
    sortOrder: 0,
    isActive: true,
  });

  // Fetch carousel items
  const { data: items, isLoading } = useQuery({
    queryKey: ['admin-carousel'],
    queryFn: async () => {
      const response = await api.get('/admin/carousel');
      return response.data.data;
    },
  });

  // Save mutation (Create/Update)
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        ...data,
        tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      };
      if (selected) {
        const response = await api.put(`/admin/carousel/${selected._id}`, payload);
        return response.data;
      } else {
        const response = await api.post('/admin/carousel', payload);
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-carousel'] });
      toast.success(`Carousel item ${selected ? 'updated' : 'created'} successfully`);
      setModalOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to save carousel item');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/admin/carousel/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-carousel'] });
      toast.success('Carousel item deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete carousel item');
    },
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }) => {
      const response = await api.put(`/admin/carousel/${id}`, { isActive });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-carousel'] });
      toast.success('Status updated');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update status');
    },
  });

  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: async (orderedIds) => {
      const response = await api.put('/admin/carousel/reorder', { orderedIds });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-carousel'] });
      toast.success('Order updated');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update order');
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      brand: '',
      description: '',
      tags: '',
      imageUrl: '',
      link: '',
      sortOrder: 0,
      isActive: true,
    });
    setSelected(null);
  };

  const handleCreate = () => {
    resetForm();
    // Set default sortOrder to next available
    const maxOrder = items?.length ? Math.max(...items.map(i => i.sortOrder || 0)) : 0;
    setFormData(prev => ({ ...prev, sortOrder: maxOrder + 1 }));
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setSelected(item);
    setFormData({
      title: item.title || '',
      brand: item.brand || '',
      description: item.description || '',
      tags: Array.isArray(item.tags) ? item.tags.join(', ') : '',
      imageUrl: item.imageUrl || '',
      link: item.link || '',
      sortOrder: item.sortOrder || 0,
      isActive: item.isActive !== false,
    });
    setModalOpen(true);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this carousel item?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const fd = new FormData();
      fd.append('files', file);
      const response = await api.post('/upload/multiple', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = response?.data?.data?.[0]?.url;
      if (url) setFormData(prev => ({ ...prev, imageUrl: url }));
    } catch (error) {
      toast.error('Image upload failed');
    } finally {
      setImageUploading(false);
    }
  };

  const moveItem = (index, direction) => {
    if (!items) return;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= items.length) return;

    const newItems = [...items];
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    const orderedIds = newItems.map(item => item._id);
    reorderMutation.mutate(orderedIds);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Carousel Management</h1>
          <p className="text-gray-700 mt-1">Manage homepage carousel slides</p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Slide
        </button>
      </div>

      {/* Items List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          {!items || items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No carousel items found</p>
              <button onClick={handleCreate} className="mt-4 text-primary-600 hover:underline">
                Add your first slide
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-blue-100 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                    Order
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    Image
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Brand
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Link
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item, index) => (
                  <tr key={item._id} className="hover:bg-blue-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <GripVertical className="w-4 h-4 text-gray-400" />
                        <div className="flex flex-col">
                          <button
                            onClick={() => moveItem(index, -1)}
                            disabled={index === 0 || reorderMutation.isLoading}
                            className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => moveItem(index, 1)}
                            disabled={index === items.length - 1 || reorderMutation.isLoading}
                            className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-20 h-12 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-20 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          <span className="text-xs text-gray-400">No image</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-gray-900">{item.title}</div>
                      {item.description && (
                        <div className="text-xs text-gray-500 mt-1 line-clamp-1">{item.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-700">{item.brand || '-'}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-700 font-mono truncate max-w-[200px]">{item.link}</div>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => toggleActiveMutation.mutate({ id: item._id, isActive: !item.isActive })}
                        disabled={toggleActiveMutation.isLoading}
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                          item.isActive
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {item.isActive ? (
                          <>
                            <Eye className="w-3 h-3" /> Active
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" /> Hidden
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-gray-600 hover:text-gray-800"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item._id)}
                          className="text-red-600 hover:text-red-700"
                          title="Delete"
                          disabled={deleteMutation.isLoading}
                        >
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
      </div>

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {selected ? 'Edit' : 'Add'} Carousel Slide
                </h2>
                <button
                  onClick={() => {
                    setModalOpen(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Slide Image *</label>
                {formData.imageUrl ? (
                  <div className="relative">
                    <img
                      src={formData.imageUrl}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors">
                    {imageUploading ? (
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-sm font-medium text-gray-600">Click to upload image</span>
                        <span className="text-xs text-gray-400 mt-1">JPG, PNG, WebP supported</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={imageUploading}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                  placeholder="Slide title"
                />
              </div>

              {/* Brand */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Brand name (optional)"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                  placeholder="Brief description for the slide"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="tag1, tag2, tag3 (comma separated)"
                />
              </div>

              {/* Link */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link *</label>
                <input
                  type="text"
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                  placeholder="/products or /category/electronics"
                />
              </div>

              {/* Sort Order and Active Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    min="0"
                  />
                </div>
                <div className="flex items-center pt-6">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="isActive" className="ml-2 text-sm font-medium text-gray-700">
                    Active (visible on homepage)
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    resetForm();
                  }}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isLoading || !formData.imageUrl}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {saveMutation.isLoading ? 'Saving...' : selected ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CarouselManagement;
