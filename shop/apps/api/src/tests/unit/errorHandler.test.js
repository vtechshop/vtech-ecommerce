// Mock logger to prevent actual logging during tests
jest.mock('../../config/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}));

const errorHandler = require('../../middleware/errorHandler');

describe('errorHandler Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      url: '/api/test',
      method: 'GET',
      ip: '127.0.0.1',
      user: null,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  it('should handle Mongoose ValidationError', () => {
    const err = {
      name: 'ValidationError',
      message: 'Validation failed',
      errors: {
        email: { message: 'Email is required' },
        name: { message: 'Name is required' },
      },
    };

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: ['Email is required', 'Name is required'],
      },
    });
  });

  it('should handle Mongoose duplicate key error (code 11000)', () => {
    const err = {
      code: 11000,
      message: 'duplicate key',
      keyPattern: { email: 1 },
    };

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'DUPLICATE_ERROR',
        message: 'email already exists',
      },
    });
  });

  it('should handle Mongoose CastError', () => {
    const err = {
      name: 'CastError',
      message: 'Cast to ObjectId failed',
    };

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: 'Invalid ID format',
      },
    });
  });

  it('should handle JsonWebTokenError', () => {
    const err = {
      name: 'JsonWebTokenError',
      message: 'jwt malformed',
    };

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid token',
      },
    });
  });

  it('should handle TokenExpiredError', () => {
    const err = {
      name: 'TokenExpiredError',
      message: 'jwt expired',
    };

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Token expired',
      },
    });
  });

  it('should handle operational errors with statusCode', () => {
    const err = {
      message: 'Not Found',
      statusCode: 404,
      code: 'NOT_FOUND',
    };

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'NOT_FOUND',
          message: 'Not Found',
        }),
      })
    );
  });

  it('should default to 500 for unknown errors', () => {
    const err = new Error('Something broke');

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          message: 'Something broke',
        }),
      })
    );
  });

  it('should default error message to "Internal server error"', () => {
    const err = {};

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
