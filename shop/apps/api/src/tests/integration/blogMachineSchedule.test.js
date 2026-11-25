// Machine Articles (gallery, products, FAQ) and scheduled posts (hidden until their publish time).
const request = require('supertest');
const app = require('../../app');
const User = require('../../models/User');
const { hashPassword } = require('../../utils/hash');
const { generateAccessToken } = require('../../utils/jwt');

const HOUR = 60 * 60 * 1000;

describe('Machine Articles and scheduled blog posts', () => {
  let token;
  beforeEach(async () => {
    const admin = await User.create({ name: 'Admin', email: 'blog-admin@test.com', password: await hashPassword('password123456'), role: 'admin', emailVerified: true });
    token = generateAccessToken(admin._id, 'admin');
  });
  const create = (body) => request(app).post('/api/blog/admin').set('Authorization', `Bearer ${token}`).send({
    type: 'post',
    category: 'Product Reviews',
    status: 'published',
    featuredImage: 'https://res.cloudinary.com/demo/image/upload/cover.jpg',
    content: '<h2>Why</h2><p>Text</p><img src="https://res.cloudinary.com/demo/image/upload/a.jpg" title="Caption">',
    ...body,
  });

  it('saves a Machine Article with its gallery and FAQs', async () => {
    const res = await create({
      title: 'Veg cutter for hotels', slug: 'veg-cutter-for-hotels', type: 'machine',
      images: ['https://res.cloudinary.com/demo/image/upload/1.jpg', 'https://res.cloudinary.com/demo/image/upload/2.jpg'],
      videoUrl: 'https://youtu.be/abc', videoProvider: 'youtube',
      faqs: [{ q: 'How many kg per hour?', a: 'About 300 kg.' }],
    });
    expect(res.status).toBe(201);
    const page = await request(app).get('/api/blog/veg-cutter-for-hotels');
    expect(page.body.data.type).toBe('machine');
    expect(page.body.data.images).toHaveLength(2);
    expect(page.body.data.faqs[0].a).toBe('About 300 kg.');
    expect(page.body.data.readingTime).toBeGreaterThan(0);
  });

  it('needs the article text for a Machine Article', async () => {
    const res = await create({ title: 'No text', slug: 'no-text', type: 'machine', content: undefined });
    expect(res.status).toBe(400);
  });

  it('hides a post scheduled for later from the blog until its time', async () => {
    await create({ title: 'Later', slug: 'later-post', publishedAt: new Date(Date.now() + 2 * HOUR).toISOString() });
    await create({ title: 'Now', slug: 'now-post' });

    const list = await request(app).get('/api/blog');
    expect(list.body.data.map(b => b.slug)).toEqual(['now-post']);
    expect((await request(app).get('/api/blog/later-post')).status).toBe(404);

    // Admin can still open it (preview)
    const admin = await request(app).get('/api/blog/admin/all').set('Authorization', `Bearer ${token}`);
    expect(admin.body.data.map(b => b.slug)).toContain('later-post');
  });
});
