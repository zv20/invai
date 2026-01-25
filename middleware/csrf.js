/**
 * CSRF Protection Middleware
 * 
 * Sprint 3 Phase 3: Security Headers & CSRF Protection
 * 
 * Implements Cross-Site Request Forgery (CSRF) protection using:
 * - Double-submit cookie pattern (stateless)
 * - Secure token generation
 * - Token validation on state-changing requests
 * - Automatic token refresh
 * 
 * @version 0.8.4a
 * @date 2026-01-25
 */

const crypto = require('crypto');

/**
 * Generate a cryptographically secure CSRF token
 * 
 * @returns {string} Random token (32 bytes, hex encoded)
 */
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate CSRF token and set cookie
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 */
function generateCsrfToken(req, res, next) {
  // Generate new token
  const token = generateToken();
  
  // Set token in cookie (HttpOnly for security)
  res.cookie('csrf_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000 // 8 hours (match session timeout)
  });
  
  // Also attach token to request for easy access
  req.csrfToken = token;
  
  next();
}

/**
 * Validate CSRF token from request header against cookie
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 */
function validateCsrfToken(req, res, next) {
  // Skip validation for safe methods (GET, HEAD, OPTIONS)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Skip validation for public endpoints (login, health check)
  const publicPaths = ['/api/auth/login', '/api/auth/csrf-token', '/health'];
  if (publicPaths.includes(req.path)) {
    return next();
  }
  
  // Get token from cookie
  const cookieToken = req.cookies?.csrf_token;
  
  // Get token from header (sent by client)
  const headerToken = req.headers['x-csrf-token'];
  
  // Validate both tokens exist
  if (!cookieToken || !headerToken) {
    return res.status(403).json({
      success: false,
      error: {
        message: 'CSRF token missing',
        code: 'CSRF_TOKEN_MISSING',
        statusCode: 403
      }
    });
  }
  
  // Validate tokens match (constant-time comparison to prevent timing attacks)
  if (!crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
    return res.status(403).json({
      success: false,
      error: {
        message: 'Invalid CSRF token',
        code: 'CSRF_TOKEN_INVALID',
        statusCode: 403
      }
    });
  }
  
  // Token is valid, proceed
  next();
}

/**
 * Middleware to provide CSRF token to authenticated users
 * This generates a new token on each request for maximum security
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 */
function refreshCsrfToken(req, res, next) {
  // Only refresh for authenticated users
  if (req.user) {
    const token = generateToken();
    
    res.cookie('csrf_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000
    });
    
    req.csrfToken = token;
  }
  
  next();
}

/**
 * Get current CSRF token from request
 * 
 * @param {Object} req - Express request object
 * @returns {string|null} CSRF token or null
 */
function getCsrfToken(req) {
  return req.csrfToken || req.cookies?.csrf_token || null;
}

/**
 * Clear CSRF token (logout)
 * 
 * @param {Object} res - Express response object
 */
function clearCsrfToken(res) {
  res.clearCookie('csrf_token');
}

module.exports = {
  generateToken,
  generateCsrfToken,
  validateCsrfToken,
  refreshCsrfToken,
  getCsrfToken,
  clearCsrfToken
};