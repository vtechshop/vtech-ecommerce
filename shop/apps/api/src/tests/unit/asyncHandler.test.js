const asyncHandler = require('../../middleware/asyncHandler');

describe('asyncHandler Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  it('should call the wrapped function', async () => {
    const fn = jest.fn().mockResolvedValue(undefined);
    const handler = asyncHandler(fn);

    await handler(req, res, next);

    expect(fn).toHaveBeenCalledWith(req, res, next);
  });

  it('should pass errors to next()', async () => {
    const error = new Error('Something went wrong');
    const fn = jest.fn().mockRejectedValue(error);
    const handler = asyncHandler(fn);

    await handler(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('should handle errors thrown inside async functions', async () => {
    const error = new Error('Async throw error');
    const fn = jest.fn().mockImplementation(async () => {
      throw error;
    });
    const handler = asyncHandler(fn);

    await handler(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('should not call next() on success', async () => {
    const fn = jest.fn().mockImplementation((req, res) => {
      res.json({ success: true });
    });
    const handler = asyncHandler(fn);

    await handler(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });
});
