const AppError = require('../../utils/AppError');

describe('AppError', () => {
  describe('constructor', () => {
    it('should create error with default values', () => {
      const error = new AppError('Something went wrong');
      expect(error.message).toBe('Something went wrong');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.status).toBe('error');
      expect(error.isOperational).toBe(true);
      expect(error.details).toBeNull();
      expect(error).toBeInstanceOf(Error);
    });

    it('should create error with custom values', () => {
      const error = new AppError('Not found', 404, 'NOT_FOUND', { field: 'id' });
      expect(error.message).toBe('Not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.status).toBe('fail');
      expect(error.details).toEqual({ field: 'id' });
    });

    it('should set status to "fail" for 4xx errors', () => {
      expect(new AppError('Bad', 400).status).toBe('fail');
      expect(new AppError('Unauthorized', 401).status).toBe('fail');
      expect(new AppError('Forbidden', 403).status).toBe('fail');
      expect(new AppError('Not Found', 404).status).toBe('fail');
      expect(new AppError('Conflict', 409).status).toBe('fail');
    });

    it('should set status to "error" for 5xx errors', () => {
      expect(new AppError('Server Error', 500).status).toBe('error');
      expect(new AppError('Bad Gateway', 502).status).toBe('error');
      expect(new AppError('Service Unavailable', 503).status).toBe('error');
    });

    it('should have stack trace', () => {
      const error = new AppError('test');
      expect(error.stack).toBeDefined();
    });
  });

  describe('factory methods', () => {
    it('badRequest should create 400 error', () => {
      const error = AppError.badRequest('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('BAD_REQUEST');
      expect(error.message).toBe('Invalid input');
    });

    it('badRequest should accept custom code and details', () => {
      const error = AppError.badRequest('Invalid', 'CUSTOM_CODE', { field: 'email' });
      expect(error.code).toBe('CUSTOM_CODE');
      expect(error.details).toEqual({ field: 'email' });
    });

    it('unauthorized should create 401 error with default message', () => {
      const error = AppError.unauthorized();
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.message).toBe('Authentication required');
    });

    it('unauthorized should accept custom message', () => {
      const error = AppError.unauthorized('Token expired');
      expect(error.message).toBe('Token expired');
    });

    it('forbidden should create 403 error with default message', () => {
      const error = AppError.forbidden();
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
      expect(error.message).toBe('You do not have permission to perform this action');
    });

    it('notFound should create 404 error with resource name', () => {
      const error = AppError.notFound('Product');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('Product not found');
    });

    it('notFound should use default resource name', () => {
      const error = AppError.notFound();
      expect(error.message).toBe('Resource not found');
    });

    it('conflict should create 409 error', () => {
      const error = AppError.conflict('Already exists');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
    });

    it('validationError should create 400 error with VALIDATION_ERROR code', () => {
      const error = AppError.validationError('Invalid email', [{ field: 'email' }]);
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual([{ field: 'email' }]);
    });

    it('internalError should create 500 error with default message', () => {
      const error = AppError.internalError();
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('An unexpected error occurred');
    });
  });
});
