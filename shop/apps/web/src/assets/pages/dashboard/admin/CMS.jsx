// FILE: apps/web/src/pages/dashboard/admin/CMS.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import { formatDate } from '@/utils/format';
import { Edit, Trash2, Eye } from 'lucide-react';

const CMS = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('posts'); // 'posts' | 'pages'

  const {
    data: posts,
    isLoading: postsLoading,
  } = useQuery({
    queryKey: ['admin-posts'],
    queryFn: async () => {
      const response = await api.get('/admin/posts');
      return response.data.data;
    },
    enabled: activeTab === 'posts',
  });

  const {
    data: pages,
    isLoading: pagesLoading,
  } = useQuery({
    queryKey: ['admin-pages'],
    queryFn: async () => {
      const response = await api.get('/admin/pages');
      return response.data.data;
    },
    enabled: activeTab === 'pages',
  });

  const deletePostMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/posts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
      alert('Post deleted successfully');
    },
  });

  const deletePageMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/pages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pages'] });
      alert('Page deleted successfully');
    },
  });

  const handleDeletePost = (id) => {
    if (confirm('Are you sure you want to delete this post?')) {
      deletePostMutation.mutate(id);
    }
  };

  const handleDeletePage = (id) => {
    if (confirm('Are you sure you want to delete this page?')) {
      deletePageMutation.mutate(id);
    }
  };

  const isLoading = activeTab === 'posts' ? postsLoading : pagesLoading;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Content Management</h1>

        {activeTab === 'posts' ? (
          <Link to="/admin-dashboard/blog">
            <Button variant="primary">New Post</Button>
          </Link>
        ) : (
          <Link to="/admin-dashboard/cms">
            <Button variant="primary">New Page</Button>
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-3 mb-6 border-b">
        <button
          onClick={() => setActiveTab('posts')}
          className={`pb-3 px-4 font-medium transition-colors ${
            activeTab === 'posts'
              ? 'border-b-2 border-primary-600 text-blue-600'
              : 'text-gray-700 hover:text-gray-900'
          }`}
        >
          Blog Posts
        </button>
        <button
          onClick={() => setActiveTab('pages')}
          className={`pb-3 px-4 font-medium transition-colors ${
            activeTab === 'pages'
              ? 'border-b-2 border-primary-600 text-blue-600'
              : 'text-gray-700 hover:text-gray-900'
          }`}
        >
          Pages
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {activeTab === 'posts' ? (
            <table className="w-full">
              <thead className="bg-blue-100 border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Title</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Author</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Category</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Date</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(posts || []).map((post) => (
                  <tr key={post._id} className="border-b last:border-b-0">
                    <td className="py-3 px-3 sm:px-4">
                      <p className="font-medium">{post.title}</p>
                      {post.excerpt && (
                        <p className="text-sm text-gray-700">
                          {post.excerpt.substring(0, 60)}...
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm">{post.author?.name}</td>
                    <td className="py-3 px-4 text-sm">{post.category}</td>
                    <td className="py-3 px-3 sm:px-4">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                          post.published
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-gray-900'
                        }`}
                      >
                        {post.published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">{formatDate(post.createdAt)}</td>
                    <td className="py-3 px-3 sm:px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/blog/${post.slug}`}
                          className="text-blue-600 hover:text-blue-700"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/dashboard/admin/posts/${post._id}/edit`}
                          className="text-gray-700 hover:text-gray-700"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDeletePost(post._id)}
                          className="text-red-600 hover:text-red-700"
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
          ) : (
            <table className="w-full">
              <thead className="bg-blue-100 border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Title</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Slug</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Updated</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(pages || []).map((page) => (
                  <tr key={page._id} className="border-b last:border-b-0">
                    <td className="py-3 px-4 font-medium">{page.title}</td>
                    <td className="py-3 px-4 text-sm font-mono">/{page.slug}</td>
                    <td className="py-3 px-3 sm:px-4">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                          page.published
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-gray-900'
                        }`}
                      >
                        {page.published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">{formatDate(page.updatedAt)}</td>
                    <td className="py-3 px-3 sm:px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/${page.slug}`}
                          className="text-blue-600 hover:text-blue-700"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/dashboard/admin/pages/${page._id}/edit`}
                          className="text-gray-700 hover:text-gray-700"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDeletePage(page._id)}
                          className="text-red-600 hover:text-red-700"
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
          )}
        </div>
      )}
    </div>
  );
};

export default CMS;
