import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Eye, Edit, Trash2, X } from 'lucide-react';
import api from '../../../utils/api';
import { useToast } from '../../../components/common/ToastContainer';

const CMSManagement = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('posts'); // 'posts' | 'pages'
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    category: '',
    status: 'draft', // For blog posts: 'draft' or 'published'
    published: false, // For pages: boolean
    featuredImage: '',
  });

  // Fetch posts (using blog API)
  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ['admin-posts'],
    queryFn: async () => {
      const response = await api.get('/blog/admin/all');
      return response.data.data;
    },
    enabled: activeTab === 'posts',
  });

  // Fetch pages
  const { data: pages, isLoading: pagesLoading } = useQuery({
    queryKey: ['admin-pages'],
    queryFn: async () => {
      const response = await api.get('/admin/pages');
      return response.data.data;
    },
    enabled: activeTab === 'pages',
  });

  // Save mutation (Create/Update)
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      // Use blog API for posts, admin API for pages
      if (activeTab === 'posts') {
        if (selected) {
          const response = await api.put(`/blog/admin/${selected._id}`, data);
          return response.data;
        } else {
          const response = await api.post(`/blog/admin`, data);
          return response.data;
        }
      } else {
        if (selected) {
          const response = await api.put(`/admin/pages/${selected._id}`, data);
          return response.data;
        } else {
          const response = await api.post(`/admin/pages`, data);
          return response.data;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries([activeTab === 'posts' ? 'admin-posts' : 'admin-pages']);
      toast.success(`${activeTab === 'posts' ? 'Post' : 'Page'} ${selected ? 'updated' : 'created'} successfully`);
      setModalOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || `Failed to save ${activeTab === 'posts' ? 'post' : 'page'}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      // Use blog API for posts, admin API for pages
      const endpoint = activeTab === 'posts' ? '/blog/admin' : '/admin/pages';
      const response = await api.delete(`${endpoint}/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries([activeTab === 'posts' ? 'admin-posts' : 'admin-pages']);
      toast.success(`${activeTab === 'posts' ? 'Post' : 'Page'} deleted successfully`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || `Failed to delete ${activeTab === 'posts' ? 'post' : 'page'}`);
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      slug: '',
      content: '',
      excerpt: '',
      category: '',
      status: 'draft',
      published: false,
      featuredImage: '',
    });
    setSelected(null);
  };

  const handleCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setSelected(item);
    setFormData({
      title: item.title || '',
      slug: item.slug || '',
      content: item.content || '',
      excerpt: item.excerpt || '',
      category: item.category || '',
      status: item.status || 'draft',
      published: item.published || false,
      featuredImage: item.featuredImage || '',
    });
    setModalOpen(true);
  };

  const handleDelete = (id) => {
    if (confirm(`Are you sure you want to delete this ${activeTab === 'posts' ? 'post' : 'page'}?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleTitleChange = (e) => {
    const title = e.target.value;
    const autoSlug = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setFormData({
      ...formData,
      title,
      slug: !selected ? autoSlug : formData.slug
    });
  };

  const isLoading = activeTab === 'posts' ? postsLoading : pagesLoading;
  const items = activeTab === 'posts' ? (posts || []) : (pages || []);

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
          <h1 className="text-2xl font-bold text-gray-900">Content Management</h1>
          <p className="text-gray-700 mt-1">Manage blog posts and pages</p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create {activeTab === 'posts' ? 'Post' : 'Page'}
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('posts')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'posts'
                ? 'border-b-2 border-primary-600 text-blue-600'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            Blog Posts
          </button>
          <button
            onClick={() => setActiveTab('pages')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'pages'
                ? 'border-b-2 border-primary-600 text-blue-600'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            Pages
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No {activeTab} found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Slug
                  </th>
                  {activeTab === 'posts' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{item.title}</div>
                      {item.excerpt && (
                        <div className="text-xs text-gray-500 mt-1">{item.excerpt.substring(0, 60)}...</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700 font-mono">/{item.slug}</div>
                    </td>
                    {activeTab === 'posts' && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700">{item.category || 'Uncategorized'}</div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          (activeTab === 'posts' ? item.status === 'published' : item.published)
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        {(activeTab === 'posts' ? item.status === 'published' : item.published) ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Link
                          to={activeTab === 'posts' ? `/blog/${item.slug}` : `/${item.slug}`}
                          className="text-blue-600 hover:text-blue-700"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-gray-700 hover:text-gray-700"
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
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {selected ? 'Edit' : 'Create'} {activeTab === 'posts' ? 'Post' : 'Page'}
                </h2>
                <button
                  onClick={() => {
                    setModalOpen(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={handleTitleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
                  required
                />
              </div>

              {activeTab === 'posts' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Technology, Lifestyle, Business, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Excerpt</label>
                    <textarea
                      value={formData.excerpt}
                      onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      rows={2}
                      placeholder="Brief summary of the post..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Featured Image URL</label>
                    <input
                      type="text"
                      value={formData.featuredImage}
                      onChange={(e) => setFormData({ ...formData, featuredImage: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={12}
                  required
                  placeholder="Write your content here..."
                />
              </div>

              {/* Status selector for posts, checkbox for pages */}
              {activeTab === 'posts' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="published"
                    checked={formData.published}
                    onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-primary-500"
                  />
                  <label htmlFor="published" className="text-sm font-medium text-gray-700">
                    Publish immediately
                  </label>
                </div>
              )}

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
                  disabled={saveMutation.isLoading}
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

export default CMSManagement;
