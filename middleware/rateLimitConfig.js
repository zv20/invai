/**
 * Rate Limiting Configuration
 * Provides multiple rate limiters for different security levels
 * 
 * v0.10.5: Increased limits to support normal user browsing patterns
 * - Read operations: 1000 requests per 15 min (allows dashboard refreshes)
 * - Write operations: 200 requests per 15 min (reasonable for data changes)
 */

const rateLimit = require('express-rate-limit');

/**
 * Strict limiter for authentication endpoints
 * - 5 attempts per 15 minutes
 * - Prevents brute force attacks
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: { 
    success: false, 
    error: { 
      message: 'Too many authentication attempts from this IP, please try again after 15 minutes',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429
    }
  },
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  validate: {trustProxy: false}, // Disable validation since we're behind a reverse proxy
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many authentication attempts from this IP, please try again after 15 minutes',
        code: 'RATE_LIMIT_EXCEEDED',
        statusCode: 429,
        retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
      }
    });
  }
});

/**
 * Read-only API limiter (GET requests)
 * - 1000 requests per 15 minutes (~66 requests/minute)
 * - Allows normal browsing, dashboard refreshes, and tab switching
 * - v0.10.5: Increased from 100 to 1000 to fix "too many requests" errors
 */
const readApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 GET requests per 15 min
  message: { 
    success: false, 
    error: { 
      message: 'Too many read requests, please slow down',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: {trustProxy: false},
  skip: (req) => {
    // Only apply to GET requests
    return req.method !== 'GET' || req.path === '/health';
  }
});

/**
 * Write API limiter (POST/PUT/DELETE/PATCH)
 * - 200 requests per 15 minutes
 * - Stricter for data modifications
 * - v0.10.5: New limiter to separate read/write operations
 */
const writeApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 write requests per 15 min
  message: { 
    success: false, 
    error: { 
      message: 'Too many write operations, please slow down',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: {trustProxy: false},
  skip: (req) => {
    // Only apply to write operations
    return !['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) || req.path === '/health';
  }
});

/**
 * Combined API limiter (applies both read and write limits)
 * - Use this as the main /api limiter in server.js
 * - v0.10.5: Replaces the old single apiLimiter
 */
const apiLimiter = (req, res, next) => {
  // Apply read limiter first
  readApiLimiter(req, res, (err) => {
    if (err) return next(err);
    // Then apply write limiter
    writeApiLimiter(req, res, next);
  });
};

/**
 * Strict limiter for sensitive operations
 * - 5 requests per minute
 * - For password changes, account modifications
 */
const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests
  message: { 
    success: false, 
    error: { 
      message: 'Too many sensitive operations from this IP, please wait before trying again',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: {trustProxy: false},
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many sensitive operations from this IP, please wait before trying again',
        code: 'RATE_LIMIT_EXCEEDED',
        statusCode: 429,
        retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
      }
    });
  }
});

/**
 * Moderate limiter for user management operations
 * - 20 requests per 15 minutes
 * - For creating/updating users, roles
 */
const userManagementLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests
  message: { 
    success: false, 
    error: { 
      message: 'Too many user management requests, please wait',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: {trustProxy: false}
});

module.exports = { 
  authLimiter, 
  apiLimiter,
  readApiLimiter,
  writeApiLimiter,
  strictLimiter,
  userManagementLimiter
};
