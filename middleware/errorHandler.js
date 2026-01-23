/**
 * Standardized Error Handling Middleware
 * Phase 1: Consistent error responses across all endpoints
 */

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  const { statusCode = 500, message, code } = err;
  
  const response = {
    success: false,
    error: {
      code: code || 'INTERNAL_ERROR',
      message: err.isOperational ? message : 'Internal server error',
    }
  };

  // Include stack trace in development
  if (process.env.NODE_ENV !== 'production' && !err.isOperational) {
    response.error.stack = err.stack;
  }

  if (err.statusCode) {
    res.status(statusCode).json(response);
  } else {
    console.error('UNHANDLED ERROR:', err);
    res.status(500).json(response);
  }
};

module.exports = { AppError, errorHandler };
