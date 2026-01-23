const rateLimit = require('express-rate-limit');
const constants = require('../config/constants');

/**
 * Standard rate limiter for all API routes
 */
const standardLimiter = rateLimit({
  windowMs: constants.RATE_LIMIT.WINDOW_MS,
  max: constants.RATE_LIMIT.MAX_REQUESTS,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for health check
  skip: (req) => req.path === '/health' || req.path === '/api/health'
});

/**
 * Strict rate limiter for sensitive operations
 */
const strictLimiter = rateLimit({
  windowMs: constants.RATE_LIMIT.STRICT_WINDOW_MS,
  max: constants.RATE_LIMIT.STRICT_MAX_REQUESTS,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many attempts, please try again in a minute'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Authentication rate limiter
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_AUTH_ATTEMPTS',
      message: 'Too many login attempts, please try again after 15 minutes'
    }
  }
});

module.exports = {
  standardLimiter,
  strictLimiter,
  authLimiter
};
