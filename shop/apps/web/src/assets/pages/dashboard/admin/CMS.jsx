// FILE: apps/web/src/pages/dashboard/admin/CMS.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import CustomSelect from '@/components/common/CustomSelect';
import { formatDate } from '@/utils/format';
import { useToast } from '@/components/common/ToastContainer';
import {
  Edit, Trash2, Eye, FileText, RefreshCw, Download, Search,
  Plus, Image as ImageIcon, Calendar, Clock, CheckCircle, FileEdit,
  Archive, Send, BarChart2, TrendingUp, Users, Tag, ExternalLink,
  ChevronRight, AlertCircle
} from 'lucide-react';

// Status configuration
const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: FileEdit },
  pending: { label: 'Pending Review', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Calendar },
  published: { label: 'Published', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
  archived: { label: 'Archived', color: 'bg-gray-200 text-gray-600 border-gray-300', icon: Archive },
};

// Get SEO score color
const getSEOScoreColor = (score) => {
  if (score >= 80) return 'text-green-600 bg-green-50';
  if (score >= 60) return 'text-yellow-600 bg-yellow-50';
  if (score >= 40) return 'text-orange-600 bg-orange-50';
  return 'text-red-600 bg-red-50';
};

// Format views count
const formatViews = (views) => {
  if (!views) return '0';
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
  return views.toString();
};

const CMS = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('posts');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  const {
    data: postsData,
    isLoading: postsLoading,
    refetch: refetchPosts,
  } = useQuery({
    queryKey: ['admin-posts', searchTerm, statusFilter, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (categoryFilter) params.append('category', categoryFilter);
      const response = await api.get(`/admin/posts?${params}`);
      return response.data;
    },
    enabled: activeTab === 'posts',
  });

  const {
    data: pagesData,
    isLoading: pagesLoading,
    refetch: refetchPages,
  } = useQuery({
    queryKey: ['admin-pages', searchTerm, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      const response = await api.get(`/admin/pages?${params}`);
      return response.data;
    },
    enabled: activeTab === 'pages',
  });

  const deletePostMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/posts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
      toast.success('Post deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete post');
    },
  });

  const deletePageMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/pages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pages'] });
      toast.success('Page deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete page');
    },
  });

  const handleDeletePost = (id, title) => {
    if (confirm(`Are you sure you want to delete "${title}"?\n\nThis action cannot be undone.`)) {
      deletePostMutation.mutate(id);
    }
  };

  const handleDeletePage = (id, title) => {
    if (confirm(`Are you sure you want to delete "${title}"?\n\nThis action cannot be undone.`)) {
      deletePageMutation.mutate(id);
    }
  };

  // Toggle selection
  const toggleSelection = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Export to CSV
  const handleExportCSV = () => {
    const items = activeTab === 'posts' ? posts : pages;
    const csvData = activeTab === 'posts'
      ? [
          ['Title', 'Slug', 'Category', 'Author', 'Status', 'Views', 'Created', 'Updated'].join(','),
          ...(items || []).map(p => [
            p.title || '',
            p.slug || '',
            p.category || '',
            p.author?.name || '',
            p.published ? 'Published' : 'Draft',
            p.views || 0,
            new Date(p.createdAt).toLocaleDateString(),
            new Date(p.updatedAt).toLocaleDateString(),
          ].map(cell => `"${cell}"`).join(','))
        ].join('\n')
      : [
          ['Title', 'Slug', 'Status', 'Updated'].join(','),
          ...(items || []).map(p => [
            p.title || '',
            p.slug || '',
            p.published ? 'Published' : 'Draft',
            new Date(p.updatedAt).toLocaleDateString(),
          ].map(cell => `"${cell}"`).join(','))
        ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cms-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully!');
  };

  const isLoading = activeTab === 'posts' ? postsLoading : pagesLoading;
  const posts = postsData?.data || [];
  const pages = pagesData?.data || [];

  // Calculate stats
  const postStats = {
    total: posts.length,
    published: posts.filter(p => p.published).length,
    draft: posts.filter(p => !p.published).length,
    totalViews: posts.reduce((sum, p) => sum + (p.views || 0), 0),
  };

  const pageStats = {
    total: pages.length,
    published: pages.filter(p => p.published).length,
    draft: pages.filter(p => !p.published).length,
  };

  // Get unique categories from posts
  const categories = [...new Set(posts.map(p => p.category).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            Content Management
          </h1>
          <p className="text-gray-700 mt-1">Manage blog posts and static pages</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => activeTab === 'posts' ? refetchPosts() : refetchPages()}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          {activeTab === 'posts' ? (
            <Link to="/admin-dashboard/blog">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Post
              </Button>
            </Link>
          ) : (
            <Link to="/admin-dashboard/cms/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Page
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {activeTab === 'posts' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Posts</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{postStats.total}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Published</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{postStats.published}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Drafts</p>
                <p className="text-3xl font-bold text-gray-600 mt-1">{postStats.draft}</p>
              </div>
              <div className="bg-gray-100 p-3 rounded-lg">
                <FileEdit className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Views</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">{formatViews(postStats.totalViews)}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Pages</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{pageStats.total}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Published</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{pageStats.published}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Drafts</p>
                <p className="text-3xl font-bold text-gray-600 mt-1">{pageStats.draft}</p>
              </div>
              <div className="bg-gray-100 p-3 rounded-lg">
                <FileEdit className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs & Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => {
              setActiveTab('posts');
              setSelectedIds([]);
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'posts'
                ? 'bg-gray-800 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Blog Posts
            <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
              activeTab === 'posts' ? 'bg-white/20' : 'bg-black/10'
            }`}>
              {postStats.total}
            </span>
          </button>
          <button
            onClick={() => {
              setActiveTab('pages');
              setSelectedIds([]);
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'pages'
                ? 'bg-gray-800 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FileEdit className="w-4 h-4" />
            Pages
            <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
              activeTab === 'pages' ? 'bg-white/20' : 'bg-black/10'
            }`}>
              {pageStats.total}
            </span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 pt-4 border-t">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
          <CustomSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: '', label: 'All Status' },
              { value: 'published', label: 'Published' },
              { value: 'draft', label: 'Draft' },
            ]}
            placeholder="All Status"
            className="w-36"
          />
          {activeTab === 'posts' && categories.length > 0 && (
            <CustomSelect
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                { value: '', label: 'All Categories' },
                ...categories.map(c => ({ value: c, label: c }))
              ]}
              placeholder="All Categories"
              className="w-44"
            />
          )}
          {(searchTerm || statusFilter || categoryFilter) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setCategoryFilter('');
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Content Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {activeTab === 'posts' ? (
            /* Posts Table */
            posts.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No blog posts found</p>
                <p className="text-gray-400 text-sm mt-1">Create your first blog post to get started</p>
                <Link to="/admin-dashboard/blog" className="inline-block mt-4">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Post
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-gray-800 text-white">
                    <tr>
                      <th className="w-10 py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.length === posts.length && posts.length > 0}
                          onChange={() => {
                            if (selectedIds.length === posts.length) {
                              setSelectedIds([]);
                            } else {
                              setSelectedIds(posts.map(p => p._id));
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider">Post</th>
                      <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider">Author</th>
                      <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wider">Category</th>
                      <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wider">Status</th>
                      <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wider">Views</th>
                      <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wider">Date</th>
                      <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {posts.map((post) => (
                      <tr key={post._id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(post._id)}
                            onChange={() => toggleSelection(post._id)}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {/* Featured Image */}
                            <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                              {post.featuredImage ? (
                                <img
                                  src={post.featuredImage}
                                  alt={post.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="w-5 h-5 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">{post.title}</p>
                              <p className="text-xs text-gray-500 truncate font-mono">/{post.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-white">
                                {post.author?.name?.charAt(0)?.toUpperCase() || 'A'}
                              </span>
                            </div>
                            <span className="text-sm text-gray-700">{post.author?.name || 'Admin'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {post.category && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                              <Tag className="w-3 h-3" />
                              {post.category}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border ${
                              post.published
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : 'bg-gray-100 text-gray-700 border-gray-200'
                            }`}
                          >
                            {post.published ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <FileEdit className="w-3 h-3" />
                            )}
                            {post.published ? 'Published' : 'Draft'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Eye className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-700">{formatViews(post.views || 0)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div>
                            <p className="text-sm text-gray-900">{formatDate(post.createdAt)}</p>
                            {post.publishedAt && (
                              <p className="text-xs text-gray-500">
                                Published {formatDate(post.publishedAt)}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <Link
                              to={`/blog/${post.slug}`}
                              target="_blank"
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Post"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                            <Link
                              to={`/admin-dashboard/blog/${post._id}/edit`}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleDeletePost(post._id, post.title)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                              disabled={deletePostMutation.isPending}
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
            )
          ) : (
            /* Pages Table */
            pages.length === 0 ? (
              <div className="text-center py-16">
                <FileEdit className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No pages found</p>
                <p className="text-gray-400 text-sm mt-1">Create your first page to get started</p>
                <Link to="/admin-dashboard/cms/new" className="inline-block mt-4">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Page
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead className="bg-gray-800 text-white">
                    <tr>
                      <th className="w-10 py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.length === pages.length && pages.length > 0}
                          onChange={() => {
                            if (selectedIds.length === pages.length) {
                              setSelectedIds([]);
                            } else {
                              setSelectedIds(pages.map(p => p._id));
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider">Page</th>
                      <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider">Slug</th>
                      <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wider">Status</th>
                      <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wider">Updated</th>
                      <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pages.map((page) => (
                      <tr key={page._id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(page._id)}
                            onChange={() => toggleSelection(page._id)}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <FileEdit className="w-5 h-5 text-gray-500" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{page.title}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            /{page.slug}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border ${
                              page.published
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : 'bg-gray-100 text-gray-700 border-gray-200'
                            }`}
                          >
                            {page.published ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <FileEdit className="w-3 h-3" />
                            )}
                            {page.published ? 'Published' : 'Draft'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <p className="text-sm text-gray-700">{formatDate(page.updatedAt)}</p>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <Link
                              to={`/${page.slug}`}
                              target="_blank"
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Page"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                            <Link
                              to={`/admin-dashboard/cms/${page._id}/edit`}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleDeletePage(page._id, page.title)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                              disabled={deletePageMutation.isPending}
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
            )
          )}
        </div>
      )}

      {/* Bulk Actions Bar (when items selected) */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-4 z-50">
          <span className="font-medium">{selectedIds.length} selected</span>
          <div className="h-6 w-px bg-gray-600" />
          <button className="text-sm hover:text-red-400 transition-colors">
            Delete Selected
          </button>
          <button
            onClick={() => setSelectedIds([])}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default CMS;
