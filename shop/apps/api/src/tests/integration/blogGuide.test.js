// Free Guide posts: admin creates them per language, the public page links translations,
// and downloads are counted.
const request = require('supertest');
const app = require('../../app');
const User = require('../../models/User');
const Blog = require('../../models/Blog');
const { hashPassword } = require('../../utils/hash');
const { generateAccessToken } = require('../../utils/jwt');

const PDF = 'https://res.cloudinary.com/demo/raw/upload/v1/vtech/guides/guide.pdf';

const guideBody = (language, extra = {}) => ({
  title: `MSME Export Guide ${language}`,
  slug: `msme-export-guide-${language}`,
  type: 'guide',
  category: 'Free Guides',
  status: 'published',
  featuredImage: 'https://res.cloudinary.com/demo/image/upload/cover.jpg',
  language,
  translationKey: 'msme-export-guide',
  guide: {
    headline: 'உங்க product-ஐ வெளிநாட்டுக்கு விக்கலாமா?',
    pdfUrl: PDF,
    pdfPages: 20,
    questions: [{ icon: '🌍', title: 'எந்த நாட்டுக்கு?', desc: 'Markets', page: '5' }],
  },
  ...extra,
});

describe('Free Guide blog posts', () => {
  let token;
  beforeEach(async () => {
    const admin = await User.create({ name: 'Admin', email: 'guide-admin@test.com', password: await hashPassword('password123456'), role: 'admin', emailVerified: true });
    token = generateAccessToken(admin._id, 'admin');
  });
  const create = (body) => request(app).post('/api/blog/admin').set('Authorization', `Bearer ${token}`).send(body);

  it('creates a guide without article content and links its translations', async () => {
    expect((await create(guideBody('ta'))).status).toBe(201);
    expect((await create(guideBody('en'))).status).toBe(201);

    const res = await request(app).get('/api/blog/msme-export-guide-ta');
    expect(res.status).toBe(200);
    expect(res.body.data.type).toBe('guide');
    expect(res.body.data.guide.questions[0].page).toBe('5');
    expect(res.body.data.translations.map(t => t.language).sort()).toEqual(['en', 'ta']);
  });

  it('filters the list by language and leaves the guide body out of it', async () => {
    await create(guideBody('ta'));
    await create(guideBody('kn'));
    const res = await request(app).get('/api/blog?language=kn');
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].language).toBe('kn');
    expect(res.body.data[0].guide).toBeUndefined();
  });

  it('counts downloads and returns the PDF link', async () => {
    await create(guideBody('ta'));
    const first = await request(app).post('/api/blog/msme-export-guide-ta/download');
    expect(first.status).toBe(200);
    expect(first.body.data.pdfUrl).toBe(PDF);
    await request(app).post('/api/blog/msme-export-guide-ta/download');
    expect((await Blog.findOne({ slug: 'msme-export-guide-ta' })).downloads).toBe(2);
  });

  it('refuses a PDF link that is not https', async () => {
    const res = await create(guideBody('ml', { guide: { pdfUrl: 'javascript:alert(1)' } }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_PDF_URL');
  });
});
