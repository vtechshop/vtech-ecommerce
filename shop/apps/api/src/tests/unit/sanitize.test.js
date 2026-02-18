// Only test xssSanitize (not mongoSanitize which is from express-mongo-sanitize)
const { xssSanitize } = require('../../middleware/sanitize');

describe('XSS Sanitize Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {}, query: {}, params: {} };
    res = {};
    next = jest.fn();
  });

  it('should call next()', () => {
    xssSanitize(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should remove script tags from body', () => {
    req.body = { name: 'Hello<script>alert("xss")</script>World' };
    xssSanitize(req, res, next);
    expect(req.body.name).toBe('HelloWorld');
  });

  it('should remove iframe tags', () => {
    req.body = { html: 'test<iframe src="evil.com"></iframe>more' };
    xssSanitize(req, res, next);
    expect(req.body.html).toBe('testmore');
  });

  it('should remove javascript: protocol', () => {
    req.body = { url: 'javascript:alert(1)' };
    xssSanitize(req, res, next);
    expect(req.body.url).toBe('alert(1)');
  });

  it('should remove inline event handlers', () => {
    req.body = { html: '<div onclick="alert(1)">test</div>' };
    xssSanitize(req, res, next);
    expect(req.body.html).not.toContain('onclick');
  });

  it('should preserve normal special characters (passwords)', () => {
    req.body = { password: 'P@$$w0rd!#%&*' };
    xssSanitize(req, res, next);
    expect(req.body.password).toBe('P@$$w0rd!#%&*');
  });

  it('should preserve email addresses', () => {
    req.body = { email: 'user@example.com' };
    xssSanitize(req, res, next);
    expect(req.body.email).toBe('user@example.com');
  });

  it('should sanitize query parameters', () => {
    req.query = { search: '<script>bad()</script>test' };
    xssSanitize(req, res, next);
    expect(req.query.search).toBe('test');
  });

  it('should sanitize URL params', () => {
    req.params = { id: '<script>x</script>123' };
    xssSanitize(req, res, next);
    expect(req.params.id).toBe('123');
  });

  it('should handle nested objects', () => {
    req.body = {
      user: {
        name: 'John<script>alert(1)</script>',
        address: {
          city: 'Chennai<iframe></iframe>',
        },
      },
    };
    xssSanitize(req, res, next);
    expect(req.body.user.name).toBe('John');
    expect(req.body.user.address.city).toBe('Chennai');
  });

  it('should handle arrays', () => {
    req.body = {
      tags: ['normal', '<script>evil()</script>safe', 'ok'],
    };
    xssSanitize(req, res, next);
    expect(req.body.tags).toEqual(['normal', 'safe', 'ok']);
  });

  it('should not modify non-string values', () => {
    req.body = { count: 42, active: true, data: null };
    xssSanitize(req, res, next);
    expect(req.body.count).toBe(42);
    expect(req.body.active).toBe(true);
    expect(req.body.data).toBeNull();
  });
});
