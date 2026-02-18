// Mock logger
jest.mock('../../config/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}));

const Joi = require('joi');
const mongoose = require('mongoose');
const { validate, validateObjectId, validateObjectIds } = require('../../middleware/validate');

describe('Validate Middleware (Joi)', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {}, query: {}, params: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe('validate()', () => {
    const schema = Joi.object({
      name: Joi.string().min(2).required(),
      email: Joi.string().email().required(),
    });

    it('should call next() for valid data', () => {
      req.body = { name: 'John', email: 'john@test.com' };
      validate(schema)(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should replace body with validated value (strips unknown)', () => {
      req.body = { name: 'John', email: 'john@test.com', extra: 'field' };
      validate(schema)(req, res, next);
      expect(req.body).not.toHaveProperty('extra');
      expect(req.body.name).toBe('John');
    });

    it('should return 400 for invalid data', () => {
      req.body = { name: 'J', email: 'bad' };
      validate(schema)(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: expect.any(Array),
          }),
        })
      );
    });

    it('should show all validation errors (abortEarly: false)', () => {
      req.body = {};
      validate(schema)(req, res, next);
      const response = res.json.mock.calls[0][0];
      expect(response.error.details.length).toBeGreaterThanOrEqual(2);
    });

    it('should validate query params when property is "query"', () => {
      const querySchema = Joi.object({
        page: Joi.number().integer().min(1),
      });
      req.query = { page: 0 };
      validate(querySchema, 'query')(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should validate params when property is "params"', () => {
      const paramsSchema = Joi.object({
        id: Joi.string().required(),
      });
      req.params = {};
      validate(paramsSchema, 'params')(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateObjectId()', () => {
    it('should call next() for valid ObjectId', () => {
      req.params = { id: new mongoose.Types.ObjectId().toString() };
      validateObjectId()(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('should call next(error) for invalid ObjectId', () => {
      req.params = { id: 'invalid-id' };
      validateObjectId()(req, res, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          code: 'INVALID_OBJECT_ID',
        })
      );
    });

    it('should validate custom param name', () => {
      req.params = { productId: 'not-valid' };
      validateObjectId('productId')(req, res, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('productId'),
        })
      );
    });
  });

  describe('validateObjectIds()', () => {
    it('should call next() when all IDs are valid', () => {
      const validId = new mongoose.Types.ObjectId().toString();
      req.params = { userId: validId };
      req.body = { productId: validId };
      validateObjectIds(['userId', 'productId'])(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('should call next(error) when any ID is invalid', () => {
      req.body = { productId: 'bad-id' };
      validateObjectIds(['productId'])(req, res, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'INVALID_OBJECT_ID',
        })
      );
    });

    it('should skip missing IDs', () => {
      // If an ID is not present in any source, it's fine
      validateObjectIds(['missingId'])(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });
  });
});
