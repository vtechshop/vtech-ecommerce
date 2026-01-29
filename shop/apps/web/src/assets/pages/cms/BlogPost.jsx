// FILE: apps/web/src/pages/cms/BlogPost.jsx
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import { Heart, Share2, MessageCircle, Send, ThumbsUp, Reply } from 'lucide-react';
import api from '@/utils/api';
import Spinner from '@/components/common/Spinner';
import { formatDate } from '@/utils/format';
import { updateMetaTags, injectJSONLD } from '@/utils/seo';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

const BlogPost = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [hasLiked, setHasLiked] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null); // Stores { user, commentId }
  const [commentLikes, setCommentLikes] = useState({});

  const { data: post, isLoading, isError, error } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn: async () => {
      const response = await api.get(`/blog/${slug}`);
      return response.data.data;
    },
    retry: 2,
    onSuccess: (data) => {
      // Set initial like state from backend
      if (data.hasLiked !== undefined) {
        setHasLiked(data.hasLiked);
      }
    },
  });

  // Fetch comments
  const { data: comments } = useQuery({
    queryKey: ['blog-comments', slug],
    queryFn: async () => {
      const response = await api.get(`/blog/${slug}/comments`);
      return response.data.data || [];
    },
    enabled: !!post,
    onSuccess: (data) => {
      // Initialize comment likes state from backend data
      const likes = {};
      data.forEach(comment => {
        if (comment.hasLiked !== undefined) {
          likes[comment._id] = comment.hasLiked;
        }
      });
      setCommentLikes(likes);
    },
  });

  // Fetch sponsor ads for blog sidebar
  const { data: sponsorAds } = useQuery({
    queryKey: ['blog-sponsor-ads'],
    queryFn: async () => {
      try {
        const response = await api.get('/ads/sponsored', {
          params: {
            placement: 'blog_sidebar',
            limit: 3
          }
        });
        return response.data.data?.ads || [];
      } catch (error) {
        console.error('Failed to fetch sponsor ads:', error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Like/Unlike mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/blog/${slug}/like`);
      return response.data;
    },
    onSuccess: (data) => {
      // Toggle like state based on response
      setHasLiked(data.data.liked);
      queryClient.invalidateQueries(['blog-post', slug]);
      toast.success(data.data.liked ? 'Post liked!' : 'Like removed');
    },
    onError: (error) => {
      if (error.response?.status === 401) {
        toast.error('Please login to like posts');
      } else {
        toast.error(error.response?.data?.message || 'Failed to like post');
      }
    },
  });

  // Share mutation
  const shareMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/blog/${slug}/share`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['blog-post', slug]);
      toast.success('Share count updated!');
    },
  });

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: async ({ content, parentId }) => {
      const response = await api.post(`/blog/${slug}/comments`, {
        content,
        parentId: parentId || null
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['blog-comments', slug]);
      queryClient.invalidateQueries(['blog-post', slug]);
      setComment('');
      setReplyingTo(null);
      toast.success('Comment posted!');
    },
    onError: (error) => {
      if (error.response?.status === 401) {
        toast.error('Please login to comment');
      } else {
        toast.error(error.response?.data?.message || 'Failed to post comment');
      }
    },
  });

  const handleLike = () => {
    if (!user) {
      toast.error('Please login to like posts');
      return;
    }
    // Allow toggling like/unlike
    likeMutation.mutate();
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: post.title,
          text: post.excerpt,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      }
      shareMutation.mutate();
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Share failed:', error);
      }
    }
  };

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please login to comment');
      return;
    }
    if (!comment.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }
    commentMutation.mutate({
      content: comment.trim(),
      parentId: replyingTo?.commentId
    });
  };

  const handleReply = (commentUser, commentId) => {
    setReplyingTo({ user: commentUser, commentId });
    setComment(`@${commentUser.name} `);
    // Focus the textarea
    document.querySelector('textarea')?.focus();
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
    setComment('');
  };

  const likeCommentMutation = useMutation({
    mutationFn: async (commentId) => {
      const response = await api.post(`/blog/comments/${commentId}/like`);
      return response.data;
    },
    onSuccess: (data, commentId) => {
      setCommentLikes(prev => ({
        ...prev,
        [commentId]: data.data.liked
      }));
      toast.success(data.data.liked ? 'Comment liked!' : 'Like removed');
    },
    onError: (error) => {
      if (error.response?.status === 401) {
        toast.error('Please login to like comments');
      } else {
        toast.error('Failed to like comment');
      }
    },
  });

  const handleLikeComment = (commentId) => {
    if (!user) {
      toast.error('Please login to like comments');
      return;
    }
    likeCommentMutation.mutate(commentId);
  };

  useEffect(() => {
    if (post) {
      updateMetaTags({
        title: `${post.title} - V-Tech Blog`,
        description: post.excerpt || post.content?.substring(0, 160),
        canonical: `${window.location.origin}/blog/${slug}`,
        ogTitle: post.title,
        ogDescription: post.excerpt || post.content?.substring(0, 160),
        ogImage: post.featuredImage,
        ogUrl: `${window.location.origin}/blog/${slug}`,
      });

      // JSON-LD for BlogPosting
      injectJSONLD({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        'headline': post.title,
        'image': post.featuredImage,
        'datePublished': post.publishedAt || post.createdAt,
        'dateModified': post.updatedAt,
        'author': {
          '@type': 'Person',
          'name': post.author?.name || 'Shop Team',
        },
        'publisher': {
          '@type': 'Organization',
          'name': 'Shop',
          'logo': {
            '@type': 'ImageObject',
            'url': `${window.location.origin}/logo.png`,
          },
        },
        'description': post.excerpt || post.content?.substring(0, 160),
      });
    }
  }, [post, slug]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4 text-red-600">Error Loading Post</h1>
        <p className="text-gray-700 mb-4">
          {error?.message || 'Failed to load the blog post. Please try again later.'}
        </p>
        <Link to="/blog" className="text-blue-600 hover:underline">
          Back to Blog
        </Link>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Post not found</h1>
        <Link to="/blog" className="text-blue-600 hover:underline">
          Back to Blog
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-[50px] pb-[50px] bg-white">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 max-w-7xl">
        <div className="flex flex-col lg:flex-row" style={{ gap: '150px' }}>
          {/* Main Content */}
          <article className="flex-1 lg:max-w-4xl bg-white rounded-xl shadow-sm p-6 md:p-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-gray-700">
          <Link to="/" className="hover:text-gray-600">Home</Link>
          <span className="mx-2">/</span>
          <Link to="/blog" className="hover:text-gray-600">Blog</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{post.title}</span>
        </nav>

        {/* Featured Image */}
        {post.featuredImage && (
          <img
            src={post.featuredImage}
            alt={post.title}
            className="w-full h-64 object-cover rounded-lg mb-6"
          />
        )}

        {/* Meta */}
        <div className="flex items-center gap-4 text-sm text-gray-700 mb-4">
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

        {/* Title */}
        <h1 className="text-3xl font-bold mb-4">{post.title}</h1>

        {/* Author */}
        <div className="flex items-center gap-3 mb-6 pb-6 border-b">
          {post.author?.avatar ? (
            <img
              src={post.author.avatar}
              alt={post.author.name}
              className="w-12 h-12 rounded-full"
            />
          ) : (
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-700 font-semibold text-lg">
              {post.author?.name?.charAt(0) || 'A'}
            </div>
          )}
          <div>
            <p className="font-semibold">{post.author?.name || 'Admin'}</p>
            {post.author?.bio && (
              <p className="text-sm text-gray-700">{post.author.bio}</p>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-lg max-w-none">
          <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content || '') }} />
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-8 pt-6 border-t">
            <h3 className="font-semibold mb-3">Tags:</h3>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-blue-100 text-gray-700 rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Like and Share */}
        <div className="mt-8 pt-6 border-t flex items-center gap-6">
          <button
            onClick={handleLike}
            disabled={likeMutation.isLoading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              hasLiked
                ? 'bg-red-50 text-red-600'
                : 'bg-blue-100 text-gray-700 hover:bg-red-50 hover:text-red-600'
            } disabled:opacity-50`}
          >
            <Heart className={`w-5 h-5 ${hasLiked ? 'fill-current' : ''}`} />
            <span className="font-medium">
              {post.likes || 0} {hasLiked ? 'Liked' : 'Likes'}
            </span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-100 text-gray-700 hover:bg-blue-50 hover:text-gray-600 transition-colors"
          >
            <Share2 className="w-5 h-5" />
            <span className="font-medium">{post.shares || 0} Shares</span>
          </button>

          <div className="flex items-center gap-2 text-gray-700">
            <MessageCircle className="w-5 h-5" />
            <span className="font-medium">{post.commentsCount || 0} Comments</span>
          </div>
        </div>

        {/* Comments Section */}
        {post.commentsEnabled !== false && (
          <div className="mt-8 pt-6 border-t">
            <h3 className="text-2xl font-bold mb-6">Comments ({comments?.length || 0})</h3>

            {/* Comment Form */}
            {user ? (
              <form onSubmit={handleCommentSubmit} className="mb-8">
                {replyingTo && (
                  <div className="mb-2 flex items-center justify-between bg-blue-50 px-3 py-2 rounded-lg">
                    <span className="text-sm text-blue-800">
                      Replying to <strong>@{replyingTo.user.name}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={handleCancelReply}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                )}
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                        {user?.name?.charAt(0) || 'U'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Write your comment..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                      rows={3}
                    />
                    <div className="mt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={commentMutation.isLoading || !comment.trim()}
                        className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Send className="w-4 h-4" />
                        {commentMutation.isLoading ? 'Posting...' : 'Post Comment'}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            ) : (
              <div className="mb-8 p-6 bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-200 rounded-lg text-center">
                <MessageCircle className="w-12 h-12 text-primary-400 mx-auto mb-3" />
                <p className="text-gray-700 font-medium mb-2">Join the conversation!</p>
                <p className="text-gray-700 mb-4">
                  <Link to="/login" className="text-blue-600 hover:underline font-medium">
                    Login
                  </Link>
                  {' '}or{' '}
                  <Link to="/register" className="text-blue-600 hover:underline font-medium">
                    Sign up
                  </Link>
                  {' '}to post a comment
                </p>
              </div>
            )}

            {/* Comments List - Instagram Style with Nested Replies */}
            {comments && comments.length > 0 ? (
              <div className="space-y-6">
                {comments
                  .filter(c => !c.parentId) // Show only top-level comments
                  .map((c) => {
                    const isLiked = commentLikes[c._id] || false;
                    const replies = comments.filter(reply => reply.parentId === c._id);

                    return (
                      <div key={c._id}>
                        {/* Parent Comment */}
                        <div className="flex gap-3 items-start">
                          {/* Avatar - 32x32 */}
                          <div className="flex-shrink-0 mt-0.5">
                            {c.userId?.avatar ? (
                              <img
                                src={c.userId.avatar}
                                alt={c.userId.name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                                {c.userId?.name?.charAt(0)?.toUpperCase() || 'U'}
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            {/* Username and Comment Text */}
                            <div className="text-sm leading-relaxed">
                              <span className="font-semibold text-gray-900">
                                {c.userId?.name || 'Anonymous'}
                              </span>
                              {' '}
                              <span className="text-gray-700">
                                {c.comment || c.content}
                              </span>
                            </div>

                            {/* Actions - Instagram style */}
                            <div className="flex items-center gap-3 mt-2 text-xs">
                              <span className="text-gray-500">{formatDate(c.createdAt)}</span>
                              {c.likes > 0 && (
                                <span className="text-gray-500 font-semibold">
                                  {c.likes} {c.likes === 1 ? 'like' : 'likes'}
                                </span>
                              )}
                              {user && (
                                <button
                                  onClick={() => handleReply(c.userId, c._id)}
                                  className="text-gray-500 font-semibold hover:text-gray-700 transition-colors"
                                >
                                  Reply
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Like Button - Heart icon aligned to top */}
                          <button
                            onClick={() => handleLikeComment(c._id)}
                            disabled={likeCommentMutation.isLoading}
                            className="flex-shrink-0 mt-0.5 disabled:opacity-50 transition-transform hover:scale-110"
                          >
                            {isLiked ? (
                              <Heart className="w-[14px] h-[14px] text-red-500 fill-current" />
                            ) : (
                              <Heart className="w-[14px] h-[14px] text-gray-400 hover:text-gray-700" />
                            )}
                          </button>
                        </div>

                        {/* Nested Replies */}
                        {replies.length > 0 && (
                          <div className="ml-11 mt-4 space-y-4">
                            {replies.map((reply) => {
                              const isReplyLiked = commentLikes[reply._id] || false;
                              return (
                                <div key={reply._id} className="flex gap-3 items-start">
                                  {/* Reply Avatar - 28x28 (slightly smaller) */}
                                  <div className="flex-shrink-0 mt-0.5">
                                    {reply.userId?.avatar ? (
                                      <img
                                        src={reply.userId.avatar}
                                        alt={reply.userId.name}
                                        className="w-7 h-7 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-7 h-7 bg-gradient-to-br from-primary-300 to-blue-400 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                                        {reply.userId?.name?.charAt(0)?.toUpperCase() || 'U'}
                                      </div>
                                    )}
                                  </div>

                                  {/* Reply Content */}
                                  <div className="flex-1 min-w-0">
                                    {/* Username and Reply Text */}
                                    <div className="text-sm leading-relaxed">
                                      <span className="font-semibold text-gray-900">
                                        {reply.userId?.name || 'Anonymous'}
                                      </span>
                                      {' '}
                                      <span className="text-gray-700">
                                        {reply.comment || reply.content}
                                      </span>
                                    </div>

                                    {/* Reply Actions */}
                                    <div className="flex items-center gap-3 mt-2 text-xs">
                                      <span className="text-gray-500">{formatDate(reply.createdAt)}</span>
                                      {reply.likes > 0 && (
                                        <span className="text-gray-500 font-semibold">
                                          {reply.likes} {reply.likes === 1 ? 'like' : 'likes'}
                                        </span>
                                      )}
                                      {user && (
                                        <button
                                          onClick={() => handleReply(reply.userId, c._id)}
                                          className="text-gray-500 font-semibold hover:text-gray-700 transition-colors"
                                        >
                                          Reply
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Reply Like Button */}
                                  <button
                                    onClick={() => handleLikeComment(reply._id)}
                                    disabled={likeCommentMutation.isLoading}
                                    className="flex-shrink-0 mt-0.5 disabled:opacity-50 transition-transform hover:scale-110"
                                  >
                                    {isReplyLiked ? (
                                      <Heart className="w-[12px] h-[12px] text-red-500 fill-current" />
                                    ) : (
                                      <Heart className="w-[12px] h-[12px] text-gray-400 hover:text-gray-700" />
                                    )}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-12">
                <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium mb-2">No comments yet</p>
                <p className="text-gray-400">Be the first to share your thoughts!</p>
              </div>
            )}
          </div>
        )}

        {/* Back to Blog */}
        <div className="mt-8 text-center">
          <Link to="/blog" className="text-blue-600 hover:underline font-medium">
            ← Back to Blog
          </Link>
        </div>
      </article>

      {/* Sidebar - Sponsor Ads */}
      <aside className="lg:w-80 flex-shrink-0">
        <div className="sticky top-24 space-y-16">
          {/* Dynamic Sponsor Ads */}
          {sponsorAds && sponsorAds.length > 0 ? (
            sponsorAds.map((ad, index) => {
              const colors = [
                { from: 'from-purple-500', to: 'to-pink-500', bgFrom: 'from-purple-100', bgTo: 'to-pink-100', btnFrom: 'from-purple-600', btnTo: 'to-pink-600' },
                { from: 'from-blue-500', to: 'to-cyan-500', bgFrom: 'from-blue-100', bgTo: 'to-cyan-100', btnFrom: 'from-blue-600', btnTo: 'to-cyan-600' },
                { from: 'from-orange-500', to: 'to-red-500', bgFrom: 'from-orange-100', bgTo: 'to-red-100', btnFrom: 'from-orange-600', btnTo: 'to-red-600' }
              ];
              const color = colors[index % colors.length];

              return (
                <div key={ad._id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className={`bg-gradient-to-r ${color.from} ${color.to} px-4 py-2`}>
                    <p className="text-white text-xs font-semibold uppercase tracking-wide">Sponsored</p>
                  </div>
                  <div className="p-6">
                    {ad.bannerImage ? (
                      <img
                        src={ad.bannerImage}
                        alt={ad.name}
                        className="w-full h-64 object-cover rounded-lg mb-4"
                      />
                    ) : (
                      <div className={`bg-gradient-to-br ${color.bgFrom} ${color.bgTo} rounded-lg h-64 flex items-center justify-center mb-4`}>
                        <div className="text-center">
                          <div className="text-4xl md:text-5xl lg:text-6xl mb-2">
                            {index === 0 ? '📱' : index === 1 ? '💻' : '🎯'}
                          </div>
                          <p className="text-gray-700 font-medium">Advertisement Space</p>
                          <p className="text-sm text-gray-500">300 x 250</p>
                        </div>
                      </div>
                    )}
                    <h3 className="font-bold text-gray-900 mb-2">{ad.name}</h3>
                    <p className="text-sm text-gray-700 mb-4">
                      {ad.targeting?.keywords?.slice(0, 3).map(k => k.keyword).join(', ') || 'Sponsored Advertisement'}
                    </p>
                    <a
                      href={ad.targetUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        // Track click
                        api.post(`/ads/${ad._id}/click`).catch(err => console.error('Failed to track click:', err));
                      }}
                      className={`block w-full px-4 py-2 bg-gradient-to-r ${color.btnFrom} ${color.btnTo} text-white rounded-lg hover:opacity-90 transition-all font-medium text-center`}
                    >
                      Learn More
                    </a>
                  </div>
                </div>
              );
            })
          ) : (
            // Fallback placeholders if no ads available
            <>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2">
                  <p className="text-white text-xs font-semibold uppercase tracking-wide">Sponsored</p>
                </div>
                <div className="p-6">
                  <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg h-64 flex items-center justify-center mb-4">
                    <div className="text-center">
                      <div className="text-4xl md:text-5xl lg:text-6xl mb-2">📱</div>
                      <p className="text-gray-700 font-medium">Advertisement Space</p>
                      <p className="text-sm text-gray-500">300 x 250</p>
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">Featured Product</h3>
                  <p className="text-sm text-gray-700 mb-4">Discover amazing deals on the latest tech products.</p>
                  <button className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-medium">
                    Learn More
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Newsletter Signup */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-lg p-6 text-white">
            <h3 className="font-bold text-xl mb-2">Stay Updated</h3>
            <p className="text-gray-300 text-sm mb-4">Subscribe to our newsletter for the latest tech news and exclusive offers.</p>
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 mb-3 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
            <button className="w-full px-4 py-2 bg-white text-gray-900 rounded-lg hover:bg-blue-100 transition-colors font-medium">
              Subscribe
            </button>
          </div>
        </div>
      </aside>

      </div>
      </div>
    </div>
  );
};

export default BlogPost;