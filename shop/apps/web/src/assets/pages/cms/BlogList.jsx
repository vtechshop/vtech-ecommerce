// FILE: apps/web/src/pages/cms/BlogList.jsx
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import Pagination from '@/components/common/Pagination';
import Spinner from '@/components/common/Spinner';
import { formatDate } from '@/utils/format';

const BlogList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1');

  const { data, isLoading } = useQuery({
    queryKey: ['blog-posts', page],
    queryFn: async () => {
      const response = await api.get(`/cms/posts?page=${page}&limit=12`);
      return response.data;
    },
  });

  const handlePageChange = (newPage) => {
    setSearchParams({ page: newPage });
    window.scrollTo(0, 0);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  const posts = data?.data || [];
  const totalPages = Math.ceil((data?.meta?.total || 0) / 12);

  return (
    <div className="min-h-screen pt-[50px] pb-[50px]">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 max-w-7xl">
      <div>
        <h1 className="text-3xl font-bold mb-2">Blog</h1>
        <p className="text-gray-700 mb-6">
          Stay updated with the latest news, tips, and insights
        </p>

        {posts.length === 0 ? (
          <div className="text-center py-12 text-gray-700">
            No blog posts available
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {posts.map((post) => (
                <article key={post._id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                  <Link to={`/blog/${post.slug}`}>
                    {post.featuredImage && (
                      <img
                        src={post.featuredImage}
                        alt={post.title}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="p-5">
                      <div className="flex items-center gap-3 text-sm text-gray-700 mb-3">
                        <span>{formatDate(post.publishedAt || post.createdAt)}</span>
                        {post.category && (
                          <>
                            <span>•</span>
                            <span className="text-blue-600">{post.category}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{post.readTime || 5} min read</span>
                      </div>
                      <h2 className="text-2xl font-bold mb-3 hover:text-gray-600 transition-colors">
                        {post.title}
                      </h2>
                      <p className="text-gray-700 mb-4 line-clamp-3">
                        {post.excerpt || post.content?.substring(0, 200) + '...'}
                      </p>
                      <div className="flex items-center gap-3">
                        {post.author?.avatar ? (
                          <img
                            src={post.author.avatar}
                            alt={post.author.name}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-700 font-semibold">
                            {post.author?.name?.charAt(0) || 'A'}
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{post.author?.name || 'Admin'}</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-6">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </div>
      </div>
    </div>
  );
};

export default BlogList;