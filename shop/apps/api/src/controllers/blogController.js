// FILE: apps/api/src/controllers/blogController.js
const Blog = require('../models/Blog');
const BlogComment = require('../models/BlogComment');
const BlogLike = require('../models/BlogLike');
const CommentLike = require('../models/CommentLike');
const { getPaginationMeta, escapeRegex } = require('../utils/helpers');
const logger = require('../config/logger');
const AppError = require('../utils/AppError');

// Get all blogs (public)
exports.getBlogs = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      tag,
      type,
      featured,
      search,
      sort = '-publishedAt',
    } = req.query;

    const query = { status: 'published' };

    if (category) query.category = category;
    if (tag) query.tags = tag;
    if (type) query.type = type;
    if (featured === 'true') query.featured = true;
    if (search) {
      // SECURITY: Escape regex to prevent ReDoS attacks
      const escapedSearch = escapeRegex(search);
      query.$or = [
        { title: { $regex: escapedSearch, $options: 'i' } },
        { excerpt: { $regex: escapedSearch, $options: 'i' } },
        { tags: { $regex: escapedSearch, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [blogs, total] = await Promise.all([
      Blog.find(query)
        .select('-content') // Don't send full content in list
        .populate('author', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Blog.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: blogs,
      meta: getPaginationMeta(total, parseInt(page), parseInt(limit)),
    });
  } catch (error) {
    next(error);
  }
};

// Get single blog (public)
exports.getBlog = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const userId = req.user?._id; // Optional - user might not be logged in

    const blog = await Blog.findOne({ slug, status: 'published' })
      .populate('author', 'name email')
      .populate('relatedProducts', 'title slug price images')
      .lean();

    if (!blog) {
      throw new AppError('Blog post not found', 404, 'BLOG_NOT_FOUND');
    }

    // Increment views
    await Blog.incrementViews(blog._id);
    blog.views += 1;

    // Check if current user has liked this post
    let hasLiked = false;
    if (userId) {
      const like = await BlogLike.findOne({ blogId: blog._id, userId });
      hasLiked = !!like;
    }

    // Get comments
    const comments = await BlogComment.find({
      blogId: blog._id,
      status: 'approved',
      parentId: null,
    })
      .populate('userId', 'name')
      .sort('-createdAt')
      .limit(50)
      .lean();

    // Get replies for each comment
    for (let comment of comments) {
      comment.replies = await BlogComment.find({
        blogId: blog._id,
        parentId: comment._id,
        status: 'approved',
      })
        .populate('userId', 'name')
        .sort('createdAt')
        .lean();
    }

    res.json({
      success: true,
      data: { ...blog, comments, hasLiked },
    });
  } catch (error) {
    next(error);
  }
};

// Get blog categories with counts
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Blog.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      success: true,
      data: categories.map(c => ({ name: c._id, count: c.count })),
    });
  } catch (error) {
    next(error);
  }
};

// Get popular tags
exports.getTags = async (req, res, next) => {
  try {
    const tags = await Blog.aggregate([
      { $match: { status: 'published' } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);

    res.json({
      success: true,
      data: tags.map(t => ({ name: t._id, count: t.count })),
    });
  } catch (error) {
    next(error);
  }
};

// Add comment to blog
exports.addComment = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { content, comment, parentId } = req.body;

    const blog = await Blog.findOne({ slug, status: 'published' });

    if (!blog) {
      throw new AppError('Blog post not found', 404, 'BLOG_NOT_FOUND');
    }

    if (!blog.commentsEnabled) {
      throw new AppError('Comments are disabled for this post', 403, 'COMMENTS_DISABLED');
    }

    const newComment = await BlogComment.create({
      blogId: blog._id,
      userId: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      comment: content || comment, // Support both 'content' and 'comment' field names
      parentId: parentId || null,
    });

    await newComment.populate('userId', 'name avatar');

    logger.info(`Comment added to blog ${blog._id} by user ${req.user._id}`);

    res.status(201).json({
      success: true,
      data: newComment,
    });
  } catch (error) {
    next(error);
  }
};

// Get comments for a blog post
exports.getComments = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const userId = req.user?._id; // Optional - user might not be logged in

    const blog = await Blog.findOne({ slug, status: 'published' });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found',
      });
    }

    const comments = await BlogComment.find({
      blogId: blog._id,
      status: 'approved',
      parentId: null, // Only get top-level comments
    })
      .populate('userId', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // Get replies for each comment
    for (let comment of comments) {
      comment.replies = await BlogComment.find({
        blogId: blog._id,
        parentId: comment._id,
        status: 'approved',
      })
        .populate('userId', 'name avatar')
        .sort({ createdAt: 1 })
        .lean();
    }

    // If user is logged in, check which comments they've liked
    if (userId) {
      const commentIds = comments.map(c => c._id);
      // Also include reply IDs for like checking
      const replyIds = comments.flatMap(c => c.replies.map(r => r._id));
      const allCommentIds = [...commentIds, ...replyIds];

      const userLikes = await CommentLike.find({
        commentId: { $in: allCommentIds },
        userId,
      }).lean();

      const likedCommentIds = new Set(userLikes.map(like => like.commentId.toString()));

      // Add hasLiked field to each comment
      comments.forEach(comment => {
        comment.hasLiked = likedCommentIds.has(comment._id.toString());

        // Add hasLiked to replies as well
        if (comment.replies) {
          comment.replies.forEach(reply => {
            reply.hasLiked = likedCommentIds.has(reply._id.toString());
          });
        }
      });
    }

    res.json({
      success: true,
      data: comments,
    });
  } catch (error) {
    next(error);
  }
};

// Like/Unlike blog post
exports.likeBlog = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const userId = req.user._id;

    const blog = await Blog.findOne({ slug, status: 'published' });

    if (!blog) {
      throw new AppError('Blog post not found', 404, 'BLOG_NOT_FOUND');
    }

    // Check if user already liked this post
    const existingLike = await BlogLike.findOne({ blogId: blog._id, userId });

    if (existingLike) {
      // Unlike - remove the like
      await BlogLike.deleteOne({ _id: existingLike._id });
      await Blog.findByIdAndUpdate(blog._id, { $inc: { likes: -1 } });

      const updatedBlog = await Blog.findById(blog._id);

      logger.info(`User ${userId} unliked blog ${blog._id}`);

      return res.json({
        success: true,
        data: {
          liked: false,
          likes: updatedBlog.likes
        },
      });
    } else {
      // Like - create new like
      await BlogLike.create({ blogId: blog._id, userId });
      await Blog.findByIdAndUpdate(blog._id, { $inc: { likes: 1 } });

      const updatedBlog = await Blog.findById(blog._id);

      logger.info(`User ${userId} liked blog ${blog._id}`);

      return res.json({
        success: true,
        data: {
          liked: true,
          likes: updatedBlog.likes
        },
      });
    }
  } catch (error) {
    next(error);
  }
};

// Track blog share
exports.shareBlog = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const blog = await Blog.findOne({ slug, status: 'published' });

    if (!blog) {
      throw new AppError('Blog post not found', 404, 'BLOG_NOT_FOUND');
    }

    await Blog.incrementShares(blog._id);

    res.json({
      success: true,
      data: { shares: blog.shares + 1 },
    });
  } catch (error) {
    next(error);
  }
};

// ==================== ADMIN ROUTES ====================

// Get all blogs for admin
exports.adminGetBlogs = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      category,
      type,
      author,
      search,
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (category) query.category = category;
    if (type) query.type = type;
    if (author) query.author = author;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [blogs, total] = await Promise.all([
      Blog.find(query)
        .select('-content')
        .populate('author', 'name email')
        .sort('-createdAt')
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Blog.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: blogs,
      meta: getPaginationMeta(total, parseInt(page), parseInt(limit)),
    });
  } catch (error) {
    next(error);
  }
};

// Get single blog for admin
exports.adminGetBlog = async (req, res, next) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findById(id)
      .populate('author', 'name email')
      .populate('relatedProducts', 'title slug price images')
      .lean();

    if (!blog) {
      throw new AppError('Blog post not found', 404, 'BLOG_NOT_FOUND');
    }

    res.json({
      success: true,
      data: blog,
    });
  } catch (error) {
    next(error);
  }
};

// Create blog
exports.createBlog = async (req, res, next) => {
  try {
    // Remove empty string values to prevent validation errors
    Object.keys(req.body).forEach(key => {
      if (req.body[key] === '') {
        delete req.body[key];
      }
    });

    const blogData = {
      ...req.body,
      author: req.user._id,
      authorName: req.user.name,
    };

    // Handle file uploads if images were uploaded
    if (req.files) {
      if (req.files.featuredImage) {
        blogData.featuredImage = req.files.featuredImage[0].path;
      }
      if (req.files.images) {
        blogData.images = req.files.images.map(file => file.path);
      }
    }

    const blog = await Blog.create(blogData);

    logger.info(`Blog created: ${blog._id} by user ${req.user._id}`);

    res.status(201).json({
      success: true,
      data: blog,
    });
  } catch (error) {
    logger.error('Blog creation error:', error);
    next(error);
  }
};

// Update blog
exports.updateBlog = async (req, res, next) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findById(id);

    if (!blog) {
      throw new AppError('Blog post not found', 404, 'BLOG_NOT_FOUND');
    }

    // Check authorization (admin or author)
    if (req.user.role !== 'admin' && blog.author.toString() !== req.user._id.toString()) {
      throw new AppError('Not authorized to update this blog post', 403, 'UNAUTHORIZED');
    }

    // Handle file uploads
    if (req.files) {
      if (req.files.featuredImage) {
        req.body.featuredImage = req.files.featuredImage[0].path;
      }
      if (req.files.images) {
        req.body.images = req.files.images.map(file => file.path);
      }
    }

    // Remove empty string values to prevent validation errors
    Object.keys(req.body).forEach(key => {
      if (req.body[key] === '') {
        delete req.body[key];
      }
    });

    Object.assign(blog, req.body);
    await blog.save({ validateModifiedOnly: true });

    logger.info(`Blog updated successfully: ${blog._id} by user ${req.user._id}`);

    res.json({
      success: true,
      data: blog,
    });
  } catch (error) {
    logger.error(`Blog update error for ID ${req.params.id}:`, error);
    next(error);
  }
};

// Delete blog
exports.deleteBlog = async (req, res, next) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findById(id);

    if (!blog) {
      throw new AppError('Blog post not found', 404, 'BLOG_NOT_FOUND');
    }

    // Check authorization (admin or author)
    if (req.user.role !== 'admin' && blog.author.toString() !== req.user._id.toString()) {
      throw new AppError('Not authorized to delete this blog post', 403, 'UNAUTHORIZED');
    }

    await blog.deleteOne();

    // Delete all comments
    await BlogComment.deleteMany({ blogId: id });

    logger.info(`Blog deleted: ${id} by user ${req.user._id}`);

    res.json({
      success: true,
      message: 'Blog post deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get blog statistics
exports.getBlogStats = async (req, res, next) => {
  try {
    const [
      totalBlogs,
      publishedBlogs,
      draftBlogs,
      totalViews,
      totalComments,
      recentBlogs,
    ] = await Promise.all([
      Blog.countDocuments(),
      Blog.countDocuments({ status: 'published' }),
      Blog.countDocuments({ status: 'draft' }),
      Blog.aggregate([
        { $group: { _id: null, total: { $sum: '$views' } } },
      ]),
      BlogComment.countDocuments({ status: 'approved' }),
      Blog.find({ status: 'published' })
        .sort('-publishedAt')
        .limit(5)
        .select('title slug views likes publishedAt')
        .lean(),
    ]);

    res.json({
      success: true,
      data: {
        totalBlogs,
        publishedBlogs,
        draftBlogs,
        totalViews: totalViews[0]?.total || 0,
        totalComments,
        recentBlogs,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Moderate comment
exports.moderateComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected', 'spam'].includes(status)) {
      throw new AppError('Invalid comment status', 400, 'INVALID_STATUS');
    }

    const comment = await BlogComment.findByIdAndUpdate(
      commentId,
      { status },
      { new: true }
    );

    if (!comment) {
      throw new AppError('Comment not found', 404, 'COMMENT_NOT_FOUND');
    }

    // Update blog comments count
    const count = await BlogComment.countDocuments({
      blogId: comment.blogId,
      status: 'approved',
    });

    await Blog.findByIdAndUpdate(comment.blogId, { commentsCount: count });

    logger.info(`Comment ${commentId} moderated to ${status} by ${req.user._id}`);

    res.json({
      success: true,
      data: comment,
    });
  } catch (error) {
    next(error);
  }
};

// Delete comment
exports.deleteComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;

    const comment = await BlogComment.findById(commentId);

    if (!comment) {
      throw new AppError('Comment not found', 404, 'COMMENT_NOT_FOUND');
    }

    // Delete the comment and all its replies
    await BlogComment.deleteMany({
      $or: [{ _id: commentId }, { parentId: commentId }],
    });

    logger.info(`Comment ${commentId} deleted by ${req.user._id}`);

    res.json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Like/Unlike a comment
exports.likeComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;

    // Check if comment exists
    const comment = await BlogComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found',
      });
    }

    // Check if user has already liked this comment
    const existingLike = await CommentLike.findOne({ commentId, userId });

    if (existingLike) {
      // Unlike - remove the like
      await CommentLike.deleteOne({ _id: existingLike._id });

      // Decrement likes count
      const updatedComment = await BlogComment.findByIdAndUpdate(
        commentId,
        { $inc: { likes: -1 } },
        { new: true }
      );

      logger.info(`Comment ${commentId} unliked by user ${userId}`);

      return res.json({
        success: true,
        data: {
          liked: false,
          likes: updatedComment.likes,
        },
      });
    } else {
      // Like - add the like
      await CommentLike.create({ commentId, userId });

      // Increment likes count
      const updatedComment = await BlogComment.findByIdAndUpdate(
        commentId,
        { $inc: { likes: 1 } },
        { new: true }
      );

      logger.info(`Comment ${commentId} liked by user ${userId}`);

      return res.json({
        success: true,
        data: {
          liked: true,
          likes: updatedComment.likes,
        },
      });
    }
  } catch (error) {
    next(error);
  }
};
