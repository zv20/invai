/**
 * CSRF Protection Middleware
 * 
 * Sprint 3 Phase 3: Security Headers & CSRF Protection
 * 
 * Protects against Cross-Site Request Forgery attacks by:
 * - Generating unique tokens per session
 * - Validating tokens on state-changing requests
 * - Rejecting requests with missing or invalid tokens
 * 
 * @version 0.8.4a
 * @date 2026-01-25
 */

const crypto = require('crypto');
const security = require('../config/security');

// Store CSRF tokens (in production, use Redis or database)
// For now, we'll use a simple in-memory store
const tokenStore = new Map();

/**
 * Generate a secure CSRF token
 * 
 * @returns {string} CSRF token
 */
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Get or create CSRF token for a user session
 * 
 * @param {string} sessionId - User session ID
 * @returns {string} CSRF token
 */
function getOrCreateToken(sessionId) {
  if (!sessionId) {
    throw new Error('Session ID required for CSRF token generation');
  }
  
  // Check if token already exists
  let tokenData = tokenStore.get(sessionId);
  
  // Create new token if doesn't exist or expired
  if (!tokenData || isTokenExpired(tokenData.createdAt)) {
    const token = generateToken();
    tokenData = {
      token,
      createdAt: new Date()
    };
    tokenStore.set(sessionId, tokenData);
  }
  
  return tokenData.token;
}

/**
 * Check if token is expired (24 hours)
 * 
 * @param {Date} createdAt - Token creation time
 * @returns {boolean} True if expired
 */
function isTokenExpired(createdAt) {
  const expirationMs = 24 * 60 * 60 * 1000; // 24 hours
  return (Date.now() - createdAt.getTime()) > expirationMs;
}

/**
 * Validate CSRF token
 * 
 * @param {string} sessionId - User session ID
 * @param {string} providedToken - Token from request
 * @returns {boolean} True if valid
 */
function validateToken(sessionId, providedToken) {
  if (!sessionId || !providedToken) {
    return false;
  }
  
  const tokenData = tokenStore.get(sessionId);
  
  if (!tokenData) {
    return false;
  }
  
  // Check if expired
  if (isTokenExpired(tokenData.createdAt)) {
    tokenStore.delete(sessionId);
    return false;
  }
  
  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(providedToken),
    Buffer.from(tokenData.token)
  );
}

/**
 * Clear CSRF token for a session (on logout)
 * 
 * @param {string} sessionId - User session ID
 */
function clearToken(sessionId) {
  tokenStore.delete(sessionId);
}

/**
 * Middleware to attach CSRF token to response
 * Call this on routes that need to provide tokens (e.g., login)
 */
function attachToken(req, res, next) {
  // Only attach token if CSRF is enabled
  if (!security.csrf.enabled) {
    return next();
  }
  
  try {
    // Get session ID from authenticated user
    const sessionId = req.user?.sessionId;
    
    if (!sessionId) {
      // No session yet, skip token attachment
      return next();
    }
    
    // Generate or get existing token
    const csrfToken = getOrCreateToken(sessionId);
    
    // Attach to response for client to use
    res.locals.csrfToken = csrfToken;
    
    // Also send in header for SPA convenience
    res.setHeader('X-CSRF-Token', csrfToken);
    
    next();
  } catch (error) {
    console.error('Error attaching CSRF token:', error);
    next(error);
  }
}

/**
 * Middleware to validate CSRF token on state-changing requests
 * Use this on POST, PUT, DELETE, PATCH routes
 */
function validateCSRF(req, res, next) {
  // Skip if CSRF protection is disabled
  if (!security.csrf.enabled) {
    return next();
  }
  
  // Only validate state-changing methods
  const methodsToProtect = ['POST', 'PUT', 'DELETE', 'PATCH'];
  if (!methodsToProtect.includes(req.method)) {
    return next();
  }
  
  // Skip validation for public routes (like login, which happens before session)
  // These routes should be explicitly excluded
  const publicRoutes = ['/api/auth/login', '/api/auth/register'];
  if (publicRoutes.includes(req.path)) {
    return next();
  }
  
  try {
    // Get session ID
    const sessionId = req.user?.sessionId;
    
    if (!sessionId) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'CSRF validation failed: No session found',
          code: 'CSRF_NO_SESSION',
          statusCode: 403
        }
      });
    }
    
    // Get token from header or body
    const providedToken = req.headers['x-csrf-token'] || req.body._csrf;
    
    if (!providedToken) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'CSRF validation failed: Token missing',
          code: 'CSRF_TOKEN_MISSING',
          statusCode: 403
        }
      });
    }
    
    // Validate token
    const isValid = validateToken(sessionId, providedToken);
    
    if (!isValid) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'CSRF validation failed: Invalid token',
          code: 'CSRF_TOKEN_INVALID',
          statusCode: 403
        }
      });
    }
    
    // Token is valid, proceed
    next();
  } catch (error) {
    console.error('Error validating CSRF token:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'CSRF validation error',
        code: 'CSRF_VALIDATION_ERROR',
        statusCode: 500
      }
    });
  }
}

/**
 * Cleanup expired tokens periodically
 */
function startCleanupSchedule() {
  setInterval(() => {
    let cleaned = 0;
    for (const [sessionId, tokenData] of tokenStore.entries()) {
      if (isTokenExpired(tokenData.createdAt)) {
        tokenStore.delete(sessionId);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired CSRF tokens`);
    }
  }, 60 * 60 * 1000); // Run every hour
  
  console.log('✅ CSRF token cleanup scheduler started');
}

module.exports = {
  generateToken,
  getOrCreateToken,
  validateToken,
  clearToken,
  attachToken,
  validateCSRF,
  startCleanupSchedule
};