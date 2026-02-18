import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Edit, Trash2, X, Upload, Eye, EyeOff, GripVertical, ArrowUp, ArrowDown,
  RefreshCw, Download, Image as ImageIcon, Layers, Monitor, Smartphone, Calendar,
  Link as LinkIcon, Copy, ExternalLink, CheckCircle, Clock, BarChart2, MousePointer
} from 'lucide-react';
import api from '../../../utils/api';
import { useToast } from '../../../components/common/ToastContainer';
import Button from '../../../components/common/Button';

const CarouselManagement = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [previewDevice, setPreviewDevice] = useState('desktop'); // desktop | mobile
  const [formData, setFormData] = useState({
    title: '',
    brand: '',
    description: '',
    tags: '',
    imageUrl: '',
    link: '',
    sortOrder: 0,
    isActive: true,
    startDate: '',
    endDate: '',
  });

  // Fetch carousel items
  const { data: items, isLoading, refetch } = useQuery({
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
        startDate: data.startDate || null,
        endDate: data.endDate || null,
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
      startDate: '',
      endDate: '',
    });
    setSelected(null);
    setPreviewDevice('desktop');
  };

  const handleCreate = () => {
    resetForm();
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
      startDate: item.startDate ? new Date(item.startDate).toISOString().split('T')[0] : '',
      endDate: item.endDate ? new Date(item.endDate).toISOString().split('T')[0] : '',
    });
    setModalOpen(true);
  };

  const handleDuplicate = (item) => {
    setSelected(null);
    const maxOrder = items?.length ? Math.max(...items.map(i => i.sortOrder || 0)) : 0;
    setFormData({
      title: `${item.title} (Copy)`,
      brand: item.brand || '',
      description: item.description || '',
      tags: Array.isArray(item.tags) ? item.tags.join(', ') : '',
      imageUrl: item.imageUrl || '',
      link: item.link || '',
      sortOrder: maxOrder + 1,
      isActive: false,
      startDate: '',
      endDate: '',
    });
    setModalOpen(true);
    toast.info('Duplicated slide - make changes and save');
  };

  const handleDelete = (id, title) => {
    if (confirm(`Are you sure you want to delete "${title}"?\n\nThis action cannot be undone.`)) {
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

  // Check if slide is scheduled
  const getScheduleStatus = (item) => {
    const now = new Date();
    if (item.startDate && new Date(item.startDate) > now) {
      return { status: 'scheduled', label: 'Scheduled', color: 'bg-blue-100 text-blue-800 border-blue-200' };
    }
    if (item.endDate && new Date(item.endDate) < now) {
      return { status: 'expired', label: 'Expired', color: 'bg-gray-100 text-gray-600 border-gray-200' };
    }
    return null;
  };

  // Export to CSV
  const handleExportCSV = () => {
    const csvData = [
      ['Order', 'Title', 'Brand', 'Link', 'Status', 'Start Date', 'End Date', 'Created'].join(','),
      ...(items || []).map((item, index) => [
        index + 1,
        item.title || '',
        item.brand || '',
        item.link || '',
        item.isActive ? 'Active' : 'Hidden',
        item.startDate ? new Date(item.startDate).toLocaleDateString() : '',
        item.endDate ? new Date(item.endDate).toLocaleDateString() : '',
        new Date(item.createdAt).toLocaleDateString(),
      ].map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `carousel-slides-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully!');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Calculate stats
  const stats = {
    total: items?.length || 0,
    active: items?.filter(i => i.isActive).length || 0,
    hidden: items?.filter(i => !i.isActive).length || 0,
    scheduled: items?.filter(i => {
      const now = new Date();
      return i.startDate && new Date(i.startDate) > now;
    }).length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Layers className="w-8 h-8 text-blue-600" />
            Carousel Management
          </h1>
          <p className="text-gray-700 mt-1">Manage homepage carousel slides</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Add Slide
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Slides</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Layers className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Active</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.active}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <Eye className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Hidden</p>
              <p className="text-3xl font-bold text-gray-600 mt-1">{stats.hidden}</p>
            </div>
            <div className="bg-gray-100 p-3 rounded-lg">
              <EyeOff className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Scheduled</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{stats.scheduled}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {!items || items.length === 0 ? (
          <div className="text-center py-16">
            <Layers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No carousel slides found</p>
            <p className="text-gray-400 text-sm mt-1">Add your first slide to get started</p>
            <Button onClick={handleCreate} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Add Slide
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider w-20">
                    Order
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider w-32">
                    Preview
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">
                    Schedule
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item, index) => {
                  const scheduleStatus = getScheduleStatus(item);

                  return (
                    <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col">
                            <button
                              onClick={() => moveItem(index, -1)}
                              disabled={index === 0 || reorderMutation.isPending}
                              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => moveItem(index, 1)}
                              disabled={index === items.length - 1 || reorderMutation.isPending}
                              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                          </div>
                          <span className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-700">
                            {index + 1}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {item.imageUrl ? (
                          <div className="relative group">
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              className="w-28 h-16 object-cover rounded-lg border border-gray-200"
                            />
                            <a
                              href={item.imageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition-opacity"
                            >
                              <ExternalLink className="w-5 h-5 text-white" />
                            </a>
                          </div>
                        ) : (
                          <div className="w-28 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-semibold text-gray-900">{item.title}</p>
                          {item.brand && (
                            <p className="text-sm text-gray-500">{item.brand}</p>
                          )}
                          <div className="flex items-center gap-1 mt-1">
                            <LinkIcon className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-500 font-mono truncate max-w-[200px]">
                              {item.link}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => toggleActiveMutation.mutate({ id: item._id, isActive: !item.isActive })}
                          disabled={toggleActiveMutation.isPending}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                            item.isActive
                              ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                          }`}
                        >
                          {item.isActive ? (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              Active
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              Hidden
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {scheduleStatus ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${scheduleStatus.color}`}>
                            <Clock className="w-3 h-3" />
                            {scheduleStatus.label}
                          </span>
                        ) : item.startDate || item.endDate ? (
                          <div className="text-xs text-gray-500">
                            {item.startDate && (
                              <div>From: {new Date(item.startDate).toLocaleDateString()}</div>
                            )}
                            {item.endDate && (
                              <div>To: {new Date(item.endDate).toLocaleDateString()}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Always</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDuplicate(item)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Duplicate"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item._id, item.title)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Layers className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {selected ? 'Edit Slide' : 'Add New Slide'}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {selected ? 'Update carousel slide details' : 'Create a new carousel slide'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setModalOpen(false);
                    resetForm();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Image & Preview */}
                <div className="space-y-4">
                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Slide Image *
                    </label>
                    {formData.imageUrl ? (
                      <div className="relative">
                        {/* Device Preview Toggle */}
                        <div className="flex gap-2 mb-2">
                          <button
                            type="button"
                            onClick={() => setPreviewDevice('desktop')}
                            className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg ${
                              previewDevice === 'desktop'
                                ? 'bg-gray-800 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            <Monitor className="w-3 h-3" />
                            Desktop
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewDevice('mobile')}
                            className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg ${
                              previewDevice === 'mobile'
                                ? 'bg-gray-800 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            <Smartphone className="w-3 h-3" />
                            Mobile
                          </button>
                        </div>

                        {/* Preview Container */}
                        <div className={`relative bg-gray-100 rounded-lg overflow-hidden ${
                          previewDevice === 'mobile' ? 'max-w-[200px] mx-auto' : ''
                        }`}>
                          <img
                            src={formData.imageUrl}
                            alt="Preview"
                            className={`w-full object-cover ${
                              previewDevice === 'mobile' ? 'h-[300px]' : 'h-48'
                            }`}
                          />
                          {/* Overlay with title preview */}
                          {formData.title && (
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                              <p className="text-white font-bold text-sm">{formData.title}</p>
                              {formData.brand && (
                                <p className="text-white/80 text-xs">{formData.brand}</p>
                              )}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                          className="absolute top-10 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                        {imageUploading ? (
                          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                        ) : (
                          <>
                            <Upload className="w-10 h-10 text-gray-400 mb-2" />
                            <span className="text-sm font-medium text-gray-600">Click to upload image</span>
                            <span className="text-xs text-gray-400 mt-1">JPG, PNG, WebP supported</span>
                            <span className="text-xs text-gray-400">Recommended: 1920x600px</span>
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

                  {/* Schedule */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Schedule (Optional)
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={formData.startDate}
                          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">End Date</label>
                        <input
                          type="date"
                          value={formData.endDate}
                          onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Leave empty to show the slide always when active
                    </p>
                  </div>
                </div>

                {/* Right Column - Form Fields */}
                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      placeholder="e.g., Summer Sale - Up to 50% Off"
                    />
                  </div>

                  {/* Brand */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Brand / Subtitle</label>
                    <input
                      type="text"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Brand name or subtitle (optional)"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={2}
                      placeholder="Brief description for the slide (optional)"
                    />
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                    <input
                      type="text"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="sale, featured, new (comma separated)"
                    />
                  </div>

                  {/* Link */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Link *</label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={formData.link}
                        onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                        placeholder="/products or /category/electronics"
                      />
                    </div>
                  </div>

                  {/* Sort Order and Active Status */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                      <input
                        type="number"
                        value={formData.sortOrder}
                        onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="0"
                      />
                    </div>
                    <div className="flex items-end pb-2">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.isActive}
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Active</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </form>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setModalOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={saveMutation.isPending || !formData.imageUrl || !formData.title || !formData.link}
              >
                {saveMutation.isPending ? 'Saving...' : selected ? 'Update Slide' : 'Create Slide'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CarouselManagement;
