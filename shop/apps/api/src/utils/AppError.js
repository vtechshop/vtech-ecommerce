class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.details = details; // Additional error details for debugging

    Error.captureStackTrace(this, this.constructor);
  }
}

// Common error factory methods for better error messages
AppError.badRequest = (message, code = 'BAD_REQUEST', details = null) => {
  return new AppError(message, 400, code, details);
};

AppError.unauthorized = (message = 'Authentication required', code = 'UNAUTHORIZED') => {
  return new AppError(message, 401, code);
};

AppError.forbidden = (message = 'You do not have permission to perform this action', code = 'FORBIDDEN') => {
  return new AppError(message, 403, code);
};

AppError.notFound = (resource = 'Resource', code = 'NOT_FOUND') => {
  return new AppError(`${resource} not found`, 404, code);
};

AppError.conflict = (message, code = 'CONFLICT', details = null) => {
  return new AppError(message, 409, code, details);
};

AppError.validationError = (message, details = null) => {
  return new AppError(message, 400, 'VALIDATION_ERROR', details);
};

AppError.internalError = (message = 'An unexpected error occurred', code = 'INTERNAL_ERROR') => {
  return new AppError(message, 500, code);
};

module.exports = AppError;
