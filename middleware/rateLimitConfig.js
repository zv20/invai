/**
 * Rate Limiting Configuration
 * Provides multiple rate limiters for different security levels
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
 * Standard API limiter
 * - 100 requests per 15 minutes
 * - Prevents API abuse
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 min
  message: { 
    success: false, 
    error: { 
      message: 'Too many requests from this IP, please slow down',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  }
});

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
  legacyHeaders: false
});

module.exports = { 
  authLimiter, 
  apiLimiter, 
  strictLimiter,
  userManagementLimiter
};
