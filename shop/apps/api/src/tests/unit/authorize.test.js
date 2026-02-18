// We only test the `authorize` middleware here (not `authenticate` which needs DB)
const { authorize } = require('../../middleware/auth');

describe('authorize Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { user: null };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  it('should allow access when no roles specified', () => {
    const middleware = authorize([]);
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should allow access when user has required role', () => {
    req.user = { _id: '123', role: 'admin' };
    const middleware = authorize(['admin']);
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should allow access when user role is in the list', () => {
    req.user = { _id: '123', role: 'vendor' };
    const middleware = authorize(['admin', 'vendor']);
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should deny access when user role is not in the list', () => {
    req.user = { _id: '123', role: 'customer' };
    const middleware = authorize(['admin', 'vendor']);
    middleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
    });
  });

  it('should return 401 when no user is set', () => {
    req.user = null;
    const middleware = authorize(['admin']);
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  });

  it('should return 401 when user has no role', () => {
    req.user = { _id: '123' };
    const middleware = authorize(['admin']);
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
