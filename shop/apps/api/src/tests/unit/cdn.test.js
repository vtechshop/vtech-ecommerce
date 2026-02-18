// Mock env module before requiring cdn
jest.mock('../../config/env', () => ({
  CDN_URL: '',
  APP_URL: 'http://localhost:8080',
}));

const env = require('../../config/env');
const { getCdnUrl, addCdnToProduct } = require('../../utils/cdn');

describe('CDN Utils', () => {
  describe('getCdnUrl', () => {
    afterEach(() => {
      env.CDN_URL = '';
      env.APP_URL = 'http://localhost:8080';
    });

    it('should return empty string for falsy path', () => {
      expect(getCdnUrl('')).toBe('');
      expect(getCdnUrl(null)).toBe('');
      expect(getCdnUrl(undefined)).toBe('');
    });

    it('should use APP_URL when CDN is not configured', () => {
      env.CDN_URL = '';
      const url = getCdnUrl('/uploads/image.jpg');
      expect(url).toBe('http://localhost:8080/uploads/image.jpg');
    });

    it('should add leading slash if missing when no CDN', () => {
      env.CDN_URL = '';
      const url = getCdnUrl('uploads/image.jpg');
      expect(url).toBe('http://localhost:8080/uploads/image.jpg');
    });

    it('should use CDN_URL when configured', () => {
      env.CDN_URL = 'https://cdn.example.com';
      const url = getCdnUrl('/uploads/image.jpg');
      expect(url).toBe('https://cdn.example.com/uploads/image.jpg');
    });

    it('should handle CDN_URL with trailing slash', () => {
      env.CDN_URL = 'https://cdn.example.com/';
      const url = getCdnUrl('/uploads/image.jpg');
      expect(url).toBe('https://cdn.example.com/uploads/image.jpg');
    });

    it('should handle path without leading slash with CDN', () => {
      env.CDN_URL = 'https://cdn.example.com';
      const url = getCdnUrl('uploads/image.jpg');
      expect(url).toBe('https://cdn.example.com/uploads/image.jpg');
    });
  });

  describe('addCdnToProduct', () => {
    afterEach(() => {
      env.CDN_URL = '';
    });

    it('should return falsy product as-is', () => {
      expect(addCdnToProduct(null)).toBeNull();
      expect(addCdnToProduct(undefined)).toBeUndefined();
    });

    it('should transform image URLs', () => {
      env.CDN_URL = 'https://cdn.example.com';
      const product = {
        title: 'Test Product',
        images: [
          { url: '/uploads/img1.jpg', alt: 'Image 1' },
          { url: '/uploads/img2.jpg', alt: 'Image 2' },
        ],
      };

      const result = addCdnToProduct(product);
      expect(result.images[0].url).toBe('https://cdn.example.com/uploads/img1.jpg');
      expect(result.images[1].url).toBe('https://cdn.example.com/uploads/img2.jpg');
      expect(result.images[0].alt).toBe('Image 1');
    });

    it('should handle product without images', () => {
      const product = { title: 'Test Product' };
      const result = addCdnToProduct(product);
      expect(result.title).toBe('Test Product');
    });

    it('should handle product with empty images array', () => {
      const product = { title: 'Test', images: [] };
      const result = addCdnToProduct(product);
      expect(result.images).toEqual([]);
    });

    it('should not mutate original product', () => {
      env.CDN_URL = 'https://cdn.example.com';
      const product = {
        images: [{ url: '/img.jpg' }],
      };
      addCdnToProduct(product);
      expect(product.images[0].url).toBe('/img.jpg');
    });
  });
});
