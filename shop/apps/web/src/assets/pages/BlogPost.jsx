// FILE: apps/web/src/pages/BlogPost.jsx
import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactPlayer from 'react-player';
import DOMPurify from 'dompurify';
import api from '@/utils/api';
import Spinner from '@/components/common/Spinner';
import AdBanner from '@/components/common/AdBanner';
import {
  Clock, Eye, Heart, Share2, Calendar, User, Tag, ArrowLeft,
  MessageCircle, Send
} from 'lucide-react';
import { formatDate } from '@/utils/format';
import useAuth from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import { PLACEHOLDER_IMAGE_MD, handleImageError } from '@/utils/placeholders';

const BlogPost = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null); // Stores { user, commentId }
  const [commentLikes, setCommentLikes] = useState({});

  // Fetch blog post
  const { data, isLoading } = useQuery({
    queryKey: ['blog', slug],
    queryFn: async () => {
      const response = await api.get(`/blog/${slug}`);
      return response.data.data;
    },
  });

  // Sponsor ads are now handled by AdBanner component
  // No need for separate query here

  // Fetch comments separately
  const { data: comments } = useQuery({
    queryKey: ['blog-comments', slug],
    queryFn: async () => {
      const response = await api.get(`/blog/${slug}/comments`);
      return response.data.data || [];
    },
    enabled: !!data,
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

  // Like blog mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/blog/${slug}/like`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['blog', slug]);
      toast.success('Blog liked!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Please login to like');
    },
  });

  // Share blog mutation
  const shareMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/blog/${slug}/share`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['blog', slug]);
    },
  });

  // Add comment mutation
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
      queryClient.invalidateQueries(['blog', slug]);
      setComment('');
      setReplyingTo(null);
      toast.success('Comment posted!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Please login to comment');
    },
  });

  // Like comment mutation
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
      // Update the like count in the UI
      queryClient.invalidateQueries(['blog-comments', slug]);
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

  const handleLike = () => {
    likeMutation.mutate();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: data.title,
          text: data.excerpt,
          url: window.location.href,
        });
        shareMutation.mutate();
      } catch (err) {
        // User cancelled share
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      shareMutation.mutate();
      toast.success('Link copied to clipboard!');
    }
  };

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
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

  const handleLikeComment = (commentId) => {
    if (!user) {
      toast.error('Please login to like comments');
      return;
    }
    likeCommentMutation.mutate(commentId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Blog post not found</h2>
          <Link to="/blog" className="text-blue-600 hover:text-blue-700">
            ← Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  const isVideo = data.type === 'video';

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <button
            onClick={() => navigate('/blog')}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Blog
          </button>

          {/* Category & Type */}
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-primary-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
              {data.category}
            </span>
            {isVideo && (
              <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
                Video
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">{data.title}</h1>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-4 text-gray-700">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5" />
              <span>{data.author?.name || 'Admin'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <span>{formatDate(data.publishedAt || data.createdAt)}</span>
            </div>
            {!isVideo && data.readingTime && (
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span>{data.readingTime} min read</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              <span>{data.views || 0} views</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row" style={{ gap: '150px' }}>
          {/* Main Column */}
          <div className="lg:flex-1 lg:max-w-4xl">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              {/* Video or Featured Image */}
              {isVideo ? (
                <div className="aspect-video bg-black">
                  <ReactPlayer
                    url={data.videoUrl}
                    width="100%"
                    height="100%"
                    controls
                    light={data.featuredImage}
                  />
                </div>
              ) : (
                <img
                  src={data.featuredImage}
                  alt={data.title}
                  className="w-full h-96 object-contain bg-blue-100"
                />
              )}

              {/* Content */}
              <div className="p-8">
                {/* Excerpt */}
                {data.excerpt && (
                  <p className="text-xl text-gray-700 mb-6 italic border-l-4 border-primary-500 pl-4">
                    {data.excerpt}
                  </p>
                )}

                {/* Ad Banner - In Content */}
                <div className="my-8">
                  <AdBanner placement="blog_in_content" position="center" />
                </div>

                {/* Main Content */}
                {!isVideo && (
                  <div
                    className="prose prose-lg max-w-none"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(data.content || '') }}
                  />
                )}

                {/* Tags */}
                {data.tags && data.tags.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Tag className="w-5 h-5 text-gray-500" />
                      {data.tags.map((tag) => (
                        <span
                          key={tag}
                          className="bg-blue-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleLike}
                      disabled={likeMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-blue-700 rounded-lg hover:bg-primary-100 transition-colors"
                    >
                      <Heart className="w-5 h-5" />
                      <span>{data.likes || 0} Likes</span>
                    </button>
                    <button
                      onClick={handleShare}
                      disabled={shareMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Share2 className="w-5 h-5" />
                      Share
                    </button>
                  </div>
                </div>

                {/* Comments Section - Instagram Style */}
                <div className="mt-12">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">
                    Comments ({comments?.length || 0})
                  </h3>

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
                              disabled={commentMutation.isPending || !comment.trim()}
                              className="flex items-center gap-2 px-4 py-1.5 sm:px-6 sm:py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                            >
                              <Send className="w-4 h-4" />
                              {commentMutation.isPending ? 'Posting...' : 'Post Comment'}
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
                      {comments.map((c) => {
                          const isLiked = commentLikes[c._id] || false;
                          const replies = c.replies || [];

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
                                  disabled={likeCommentMutation.isPending}
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
                                          disabled={likeCommentMutation.isPending}
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

                {/* Ad Banner - Bottom of Blog Post */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <AdBanner placement="blog_bottom" position="bottom" />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Ad Banners */}
          <aside className="lg:w-80 flex-shrink-0">
            <div className="sticky top-24 space-y-6">
              {/* AdBanner - Blog Sidebar */}
              <AdBanner placement="blog_sidebar" position="right" />

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

              {/* Related Products */}
              {data.relatedProducts && data.relatedProducts.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Related Products</h3>
                  <div className="space-y-4">
                    {data.relatedProducts.map((product) => (
                      <Link
                        key={product._id}
                        to={`/product/${product.slug}`}
                        className="flex gap-3 hover:bg-blue-100 p-2 rounded-lg transition-colors"
                      >
                        <img
                          src={product.images?.[0] || PLACEHOLDER_IMAGE_MD}
                          alt={product.title}
                          className="w-20 h-20 object-cover rounded"
                          onError={(e) => handleImageError(e, PLACEHOLDER_IMAGE_MD)}
                        />
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 line-clamp-2 text-sm">
                            {product.title}
                          </h4>
                          <p className="text-blue-600 font-bold mt-1">
                            ₹{product.price?.toLocaleString()}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default BlogPost;
