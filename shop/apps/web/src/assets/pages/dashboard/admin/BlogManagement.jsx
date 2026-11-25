// FILE: apps/web/src/pages/dashboard/admin/BlogManagement.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import Spinner from '@/components/common/Spinner';
import Pagination from '@/components/common/Pagination';
import CustomSelect from '@/components/common/CustomSelect';
import {
  Plus, Edit, Trash2, Eye, Video, FileText, Calendar,
  Search, Filter, BarChart3, X, RefreshCw, Download, Upload
} from 'lucide-react';
import GuideFields, { EMPTY_GUIDE, guideFromPost, cleanGuide, uploadToServer } from './GuideFields';
import { BLOG_LANGUAGES, languageLabel } from '@/utils/blogLanguages';

const CATEGORY_OPTIONS = ['Tech News', 'Product Reviews', 'How-To Guides', 'Industry Trends', 'Company News', 'Tips & Tricks', 'Free Guides', 'Business & Export']
  .map(c => ({ value: c, label: c }));

const EMPTY_FORM = {
  title: '',
  slug: '',
  content: '',
  excerpt: '',
  category: '',
  status: 'draft',
  featuredImage: '',
  type: 'post',
  language: 'en',
  translationKey: '',
  metaTitle: '',
  metaDescription: '',
  guide: EMPTY_GUIDE,
};

const slugify = (text) => text
  .toLowerCase()
  .replace(/[^\w\s-]/g, '')
  .replace(/[\s_-]+/g, '-')
  .replace(/^-+|-+$/g, '');
import { formatDate } from '@/utils/format';
import toast from 'react-hot-toast';
import { PLACEHOLDER_IMAGE_SM, handleImageError } from '@/utils/placeholders';

const BlogManagement = () => {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    category: '',
    search: '',
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBlog, setEditingBlog] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { blog: {...}, show: true }
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [uploadingCover, setUploadingCover] = useState(false);

  const queryClient = useQueryClient();

  // Fetch blogs
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-blogs', page, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', '10');
      if (filters.status) params.append('status', filters.status);
      if (filters.type) params.append('type', filters.type);
      if (filters.category) params.append('category', filters.category);
      if (filters.search) params.append('search', filters.search);

      const response = await api.get(`/blog/admin/all?${params}`);
      return response.data;
    },
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['blog-stats'],
    queryFn: async () => {
      const response = await api.get('/blog/admin/stats');
      return response.data.data;
    },
  });

  // Save mutation (Create/Update)
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingBlog) {
        const response = await api.put(`/blog/admin/${editingBlog._id}`, data);
        return response.data;
      } else {
        const response = await api.post(`/blog/admin`, data);
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blogs'] });
      queryClient.invalidateQueries({ queryKey: ['blog-stats'] });
      toast.success(`Blog post ${editingBlog ? 'updated' : 'created'} successfully`);
      setShowCreateModal(false);
      setEditingBlog(null);
      resetForm();
    },
    onError: (error) => {
      const err = error.response?.data?.error;
      const fields = err?.fields ? Object.values(err.fields).join(', ') : '';
      toast.error(fields || err?.message || error.response?.data?.message || 'Failed to save blog post');
    },
  });

  // Delete blog mutation
  const deleteMutation = useMutation({
    mutationFn: async (blogId) => {
      const response = await api.delete(`/blog/admin/${blogId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blogs'] });
      queryClient.invalidateQueries({ queryKey: ['blog-stats'] });
      toast.success('Blog deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete blog');
    },
  });

  const blogs = data?.data || [];
  const meta = data?.meta || {};

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setEditingBlog(null);
  };

  const handleCreate = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleEdit = async (blog) => {
    // Fetch full blog details including content (list view excludes content)
    try {
      const response = await api.get(`/blog/admin/${blog._id}`);
      const fullBlog = response.data.data;

      setEditingBlog(fullBlog);
      setFormData({
        title: fullBlog.title || '',
        slug: fullBlog.slug || '',
        content: fullBlog.content || '',
        excerpt: fullBlog.excerpt || '',
        category: fullBlog.category || '',
        status: fullBlog.status || 'draft',
        featuredImage: fullBlog.featuredImage || '',
        type: fullBlog.type || 'post',
        language: fullBlog.language || 'en',
        translationKey: fullBlog.translationKey || '',
        metaTitle: fullBlog.metaTitle || '',
        metaDescription: fullBlog.metaDescription || '',
        guide: guideFromPost(fullBlog.guide),
      });
      setShowCreateModal(true);
    } catch (error) {
      toast.error('Failed to load blog details');
    }
  };

  const handleDelete = (blog) => {
    setDeleteConfirm({ blog, show: true });
  };

  const confirmDelete = () => {
    if (deleteConfirm?.blog?._id) {
      deleteMutation.mutate(deleteConfirm.blog._id);
      setDeleteConfirm(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { guide, ...rest } = formData;
    const payload = { ...rest };
    if (formData.type === 'guide') {
      payload.guide = cleanGuide(guide);
      if (!payload.content) delete payload.content;
    }
    saveMutation.mutate(payload);
  };

  const handleTitleChange = (e) => {
    const title = e.target.value;
    const autoSlug = slugify(title);
    setFormData({
      ...formData,
      title,
      // Tamil/Malayalam/Kannada titles give an empty slug: keep the key-language slug then
      slug: !editingBlog && autoSlug ? autoSlug : formData.slug
    });
  };

  // Translations share a key; a new post gets the slug "<key>-<language>"
  const setTranslation = (changes) => {
    const next = { ...formData, ...changes };
    if (!editingBlog && next.translationKey) next.slug = `${slugify(next.translationKey)}-${next.language}`;
    setFormData(next);
  };

  const uploadCover = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingCover(true);
    try {
      const media = await uploadToServer(file, 'blog');
      setFormData(f => ({ ...f, featuredImage: media.url }));
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Image upload failed');
    } finally {
      setUploadingCover(false);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Blog Management</h1>
            <p className="text-gray-700">Manage your blog posts and videos</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refetch} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Plus className="w-5 h-5" />
              Create Blog Post
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Total Posts"
              value={stats.totalBlogs || 0}
              icon={<FileText className="w-6 h-6" />}
              color="bg-blue-100 text-blue-600"
            />
            <StatCard
              title="Published"
              value={stats.byStatus?.published || 0}
              icon={<Eye className="w-6 h-6" />}
              color="bg-green-100 text-green-600"
            />
            <StatCard
              title="Total Views"
              value={stats.totalViews || 0}
              icon={<BarChart3 className="w-6 h-6" />}
              color="bg-purple-100 text-purple-600"
            />
            <StatCard
              title="Total Comments"
              value={stats.totalComments || 0}
              icon={<FileText className="w-6 h-6" />}
              color="bg-orange-100 text-orange-600"
            />
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search blogs..."
                value={filters.search}
                onChange={(e) => {
                  setFilters({ ...filters, search: e.target.value });
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            </div>

            {/* Status Filter */}
            <CustomSelect
              value={filters.status}
              onChange={(value) => {
                setFilters({ ...filters, status: value });
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Status' },
                { value: 'draft', label: 'Draft' },
                { value: 'published', label: 'Published' },
                { value: 'archived', label: 'Archived' }
              ]}
              placeholder="All Status"
            />

            {/* Type Filter */}
            <CustomSelect
              value={filters.type}
              onChange={(value) => {
                setFilters({ ...filters, type: value });
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Types' },
                { value: 'post', label: 'Article' },
                { value: 'video', label: 'Video' },
                { value: 'guide', label: 'Free Guide' }
              ]}
              placeholder="All Types"
            />

            {/* Category Filter */}
            <CustomSelect
              value={filters.category}
              onChange={(value) => {
                setFilters({ ...filters, category: value });
                setPage(1);
              }}
              options={[{ value: '', label: 'All Categories' }, ...CATEGORY_OPTIONS]}
              placeholder="All Categories"
            />
          </div>
        </div>
      </div>

      {/* Blog List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : blogs.length > 0 ? (
        <>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-blue-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Blog Post
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stats
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {blogs.map((blog) => (
                  <tr key={blog._id} className="hover:bg-blue-100">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={blog.featuredImage || PLACEHOLDER_IMAGE_SM}
                          alt={blog.title}
                          className="w-16 h-16 object-cover rounded"
                          onError={(e) => handleImageError(e, PLACEHOLDER_IMAGE_SM)}
                        />
                        <div>
                          <div className="font-medium text-gray-900 line-clamp-1">
                            {blog.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            {blog.category}{blog.language && blog.language !== 'en' ? ` · ${languageLabel(blog.language)}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {blog.type === 'guide' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs">
                          <Download className="w-3 h-3" />
                          Free Guide
                        </span>
                      ) : blog.type === 'video' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                          <Video className="w-3 h-3" />
                          Video
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                          <FileText className="w-3 h-3" />
                          Article
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          blog.status === 'published'
                            ? 'bg-green-100 text-green-700'
                            : blog.status === 'draft'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-blue-100 text-gray-700'
                        }`}
                      >
                        {blog.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex flex-col gap-1">
                        <span>{blog.views || 0} views</span>
                        <span>{blog.likes || 0} likes</span>
                        <span>{blog.commentsCount || 0} comments</span>
                        {blog.type === 'guide' && <span className="font-medium text-amber-700">{blog.downloads || 0} downloads</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(blog.publishedAt || blog.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/blog/${blog.slug}`}
                          className="text-gray-700 hover:text-gray-900"
                          title="View"
                        >
                          <Eye className="w-5 h-5" />
                        </Link>
                        <button
                          onClick={() => handleEdit(blog)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(blog)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <Pagination
                currentPage={page}
                totalPages={meta.totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">No blog posts found</h3>
          <p className="text-gray-700 mb-4">
            {filters.search || filters.status || filters.type || filters.category
              ? 'Try adjusting your filters'
              : 'Create your first blog post to get started'}
          </p>
          <button
            onClick={handleCreate}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Create Blog Post
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingBlog ? 'Edit' : 'Create'} Blog Post
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <CustomSelect
                  value={formData.type}
                  onChange={(value) => setFormData({ ...formData, type: value })}
                  options={[
                    { value: 'post', label: 'Article' },
                    { value: 'video', label: 'Video' },
                    { value: 'guide', label: 'Free Guide (PDF landing page)' }
                  ]}
                  placeholder="Select type"
                  className="w-full"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                  <CustomSelect
                    value={formData.language}
                    onChange={(value) => setTranslation({ language: value })}
                    options={BLOG_LANGUAGES.map(l => ({ value: l.code, label: l.english }))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Translation key</label>
                  <input
                    type="text"
                    value={formData.translationKey}
                    onChange={(e) => setTranslation({ translationKey: e.target.value })}
                    placeholder="e.g. msme-export-guide"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">Use the same key for the Tamil, Malayalam, Kannada and English versions - the page then shows a language switch.</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <CustomSelect
                  value={formData.category}
                  onChange={(value) => setFormData({ ...formData, category: value })}
                  options={CATEGORY_OPTIONS}
                  placeholder="Select category"
                  className="w-full"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formData.type === 'guide' ? 'Cover image (e.g. the PDF front page) *' : 'Featured Image'}
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  {formData.featuredImage && (
                    <img src={formData.featuredImage} alt="" className="h-16 w-16 rounded object-cover border" onError={(e) => handleImageError(e, PLACEHOLDER_IMAGE_SM)} />
                  )}
                  <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 ${uploadingCover ? 'pointer-events-none opacity-60' : ''}`}>
                    <Upload className="h-4 w-4" /> {uploadingCover ? 'Uploading…' : 'Upload image'}
                    <input type="file" accept="image/*" className="sr-only" onChange={uploadCover} disabled={uploadingCover} />
                  </label>
                  <input
                    type="text"
                    value={formData.featuredImage}
                    onChange={(e) => setFormData({ ...formData, featuredImage: e.target.value })}
                    className="min-w-0 flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="or paste an image link"
                  />
                </div>
              </div>

              {formData.type === 'guide' && (
                <GuideFields guide={formData.guide} onChange={(guide) => setFormData(f => ({ ...f, guide }))} />
              )}

              {formData.type !== 'guide' && (
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
              )}

              <details className="rounded-lg border border-gray-200 p-4">
                <summary className="cursor-pointer text-sm font-semibold text-gray-800">Google / WhatsApp preview (SEO)</summary>
                <div className="mt-3 space-y-3">
                  <input
                    type="text"
                    value={formData.metaTitle}
                    onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                    placeholder="Title shown on Google (empty = post title)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <textarea
                    value={formData.metaDescription}
                    onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                    rows={2}
                    placeholder="Description shown on Google (empty = excerpt)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </details>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                <CustomSelect
                  value={formData.status}
                  onChange={(value) => setFormData({ ...formData, status: value })}
                  options={[
                    { value: 'draft', label: 'Draft' },
                    { value: 'published', label: 'Published' }
                  ]}
                  placeholder="Select status"
                  className="w-full"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="px-6 py-2 bg-blue-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isLoading}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {saveMutation.isLoading ? 'Saving...' : editingBlog ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm?.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Confirm Delete
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{deleteConfirm.blog?.title}"?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 bg-blue-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon, color }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-700 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
      </div>
    </div>
  );
};

export default BlogManagement;
