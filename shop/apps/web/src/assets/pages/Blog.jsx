// FILE: apps/web/src/pages/Blog.jsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '@/utils/api';
import Spinner from '@/components/common/Spinner';
import Pagination from '@/components/common/Pagination';
import CustomSelect from '@/components/common/CustomSelect';
import AdBanner from '@/components/common/AdBanner';
import { Clock, Eye, Heart, Calendar, Video, FileText, Search } from 'lucide-react';
import { formatDate } from '@/utils/format';
import { PLACEHOLDER_BLOG, handleImageError } from '@/utils/placeholders';

const Blog = () => {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    category: '',
    type: '',
    search: '',
  });

  // Fetch blogs
  const { data, isLoading } = useQuery({
    queryKey: ['blogs', page, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', '12');
      if (filters.category) params.append('category', filters.category);
      if (filters.type) params.append('type', filters.type);
      if (filters.search) params.append('search', filters.search);

      const response = await api.get(`/blog?${params}`);
      return response.data;
    },
  });

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['blog-categories'],
    queryFn: async () => {
      const response = await api.get('/blog/categories');
      return response.data.data;
    },
  });

  const blogs = data?.data || [];
  const meta = data?.meta || {};
  const categories = categoriesData || [];

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-16 mb-8">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">Our Blog</h1>
            <p className="text-xl text-primary-100">
              Discover the latest tech news, product reviews, guides, and industry insights
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-8">
        {/* Ad Banner - Top of Blog */}
        <div className="mb-8">
          <AdBanner placement="blog_top" position="top" />
        </div>

        {/* Filters - Elevated Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-10 backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <form onSubmit={handleSearch} className="md:col-span-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search blogs..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                />
                <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
              </div>
            </form>

            {/* Category Filter */}
            <CustomSelect
              value={filters.category}
              onChange={(value) => {
                setFilters({ ...filters, category: value });
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Categories' },
                ...categories.map((cat) => ({
                  value: cat.name,
                  label: `${cat.name} (${cat.count})`
                }))
              ]}
              placeholder="All Categories"
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
                { value: 'post', label: 'Articles' },
                { value: 'video', label: 'Videos' }
              ]}
              placeholder="All Types"
            />
          </div>

          {/* Active Filters Display */}
          {(filters.search || filters.category || filters.type) && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-700 font-medium">Active filters:</span>
              {filters.search && (
                <span className="inline-flex items-center gap-1 bg-primary-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                  Search: "{filters.search}"
                  <button
                    onClick={() => setFilters({ ...filters, search: '' })}
                    className="ml-1 hover:text-primary-900"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.category && (
                <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                  {filters.category}
                  <button
                    onClick={() => setFilters({ ...filters, category: '' })}
                    className="ml-1 hover:text-blue-900"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.type && (
                <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm">
                  {filters.type === 'post' ? 'Articles' : 'Videos'}
                  <button
                    onClick={() => setFilters({ ...filters, type: '' })}
                    className="ml-1 hover:text-purple-900"
                  >
                    ×
                  </button>
                </span>
              )}
              <button
                onClick={() => {
                  setFilters({ category: '', type: '', search: '' });
                  setPage(1);
                }}
                className="text-sm text-red-600 hover:text-red-700 font-medium ml-2"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        )}

        {/* Results Count */}
        {!isLoading && blogs.length > 0 && (
          <div className="mb-6">
            <p className="text-gray-700">
              Showing <span className="font-semibold text-gray-900">{meta.from || 1}</span> to{' '}
              <span className="font-semibold text-gray-900">{meta.to || blogs.length}</span> of{' '}
              <span className="font-semibold text-gray-900">{meta.total || 0}</span> results
            </p>
          </div>
        )}

        {/* Main Content with Sidebar */}
        {!isLoading && blogs.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-12">
            {/* Blog Grid - Main Area */}
            <div className="lg:col-span-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
                {blogs.map((blog) => (
                  <BlogCard key={blog._id} blog={blog} />
                ))}
              </div>
            </div>

            {/* Sidebar - Ad Banner */}
            <div className="lg:col-span-1">
              <div className="sticky top-4 space-y-6">
                <AdBanner placement="blog_sidebar" position="right" />
              </div>
            </div>
          </div>
        )}

        {/* Blog Grid (keeping original for when loading/empty) */}
        {!isLoading && blogs.length > 0 && (
          <>

            {/* Pagination */}
            {meta.totalPages > 1 && (
              <div className="flex justify-center pb-12">
                <Pagination
                  currentPage={page}
                  totalPages={meta.totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!isLoading && blogs.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
            <div className="w-24 h-24 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-12 h-12 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No blogs found</h3>
            <p className="text-gray-700 mb-6 max-w-md mx-auto">
              {filters.search || filters.category || filters.type
                ? 'Try adjusting your search criteria or filters to find what you are looking for'
                : 'Check back soon for new content and exciting updates'}
            </p>
            {(filters.search || filters.category || filters.type) && (
              <button
                onClick={() => {
                  setFilters({ category: '', type: '', search: '' });
                  setPage(1);
                }}
                className="px-4 py-2 sm:px-6 sm:py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-medium transition-colors text-sm sm:text-base"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Blog Card Component
const BlogCard = ({ blog }) => {
  const isVideo = blog.type === 'video';

  return (
    <Link
      to={`/blog/${blog.slug}`}
      className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group transform hover:-translate-y-2 border border-gray-100"
    >
      {/* Featured Image */}
      <div className="relative h-56 overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300">
        <img
          src={blog.featuredImage || PLACEHOLDER_BLOG}
          alt={blog.title}
          className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
          onError={(e) => handleImageError(e, PLACEHOLDER_BLOG)}
        />

        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Type Badge */}
        <div className="absolute top-4 right-4 z-10">
          {isVideo ? (
            <span className="flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-red-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg">
              <Video className="w-3.5 h-3.5" />
              Video
            </span>
          ) : (
            <span className="flex items-center gap-1.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg">
              <FileText className="w-3.5 h-3.5" />
              Article
            </span>
          )}
        </div>

        {/* Category Badge */}
        <div className="absolute bottom-4 left-4 z-10">
          <span className="bg-white/95 backdrop-blur-md text-gray-900 px-4 py-1.5 rounded-full text-xs font-semibold shadow-lg">
            {blog.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-gray-600 transition-colors leading-tight">
          {blog.title}
        </h3>

        {/* Excerpt */}
        {blog.excerpt && (
          <p className="text-gray-700 text-sm mb-5 line-clamp-3 leading-relaxed">{blog.excerpt}</p>
        )}

        {/* Meta Info */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(blog.publishedAt || blog.createdAt)}
              </span>
              {!isVideo && blog.readingTime && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {blog.readingTime} min
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded-full">
                <Eye className="w-3.5 h-3.5" />
                {blog.views || 0}
              </span>
              <span className="flex items-center gap-1.5 bg-red-50 text-red-600 px-2 py-1 rounded-full">
                <Heart className="w-3.5 h-3.5" />
                {blog.likes || 0}
              </span>
            </div>
          </div>

          {/* Author */}
          {blog.author && (
            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold text-sm shadow-md">
                  {blog.author.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{blog.author.name}</p>
                  <p className="text-xs text-gray-500">Author</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Read More Indicator */}
      <div className="px-6 pb-6">
        <div className="flex items-center justify-between text-sm font-semibold text-blue-600 group-hover:text-blue-700">
          <span>Read more</span>
          <span className="transform group-hover:translate-x-2 transition-transform">→</span>
        </div>
      </div>
    </Link>
  );
};

export default Blog;
