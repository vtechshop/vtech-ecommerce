const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('dotenv').config();

const Post = require('../src/models/Post');
const Blog = require('../src/models/Blog');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/shop';

(async () => {
  await mongoose.connect(MONGO_URI);
  console.log('[migrate] Connected:', MONGO_URI);

  const posts = await Post.find({}).lean();
  console.log(`Found ${posts.length} posts to migrate`);

  for (const post of posts) {
    const blogData = {
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt,
      category: post.category,
      readTime: post.readTime,
      status: post.published ? 'published' : 'draft',
      publishedAt: post.publishedAt || post.createdAt,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      commentsEnabled: true,
      views: post.viewCount || 0,
      likes: 0,
      shares: 0,
      commentsCount: 0,
    };

    await Blog.updateOne({ slug: post.slug }, { $set: blogData }, { upsert: true });
    console.log('✅ Migrated:', post.title);
  }

  console.log('✅ Migration complete');
  await mongoose.disconnect();
  process.exit(0);
})();
