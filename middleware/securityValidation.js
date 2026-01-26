/**
 * Security Validation Middleware
 * Additional security checks for requests
 */

/**
 * Validate security headers and request parameters
 */
function validateSecurityHeaders(req, res, next) {
  // Validate Content-Type for POST/PUT/PATCH requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('Content-Type');
    
    // Allow these content types
    const allowedTypes = [
      'application/json',
      'text/csv',
      'multipart/form-data',
      'application/x-www-form-urlencoded'
    ];
    
    // Check if content-type is present and valid
    if (!contentType) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Content-Type header is required',
          code: 'MISSING_CONTENT_TYPE',
          statusCode: 400
        }
      });
    }
    
    const isValid = allowedTypes.some(type => contentType.includes(type));
    
    if (!isValid) {
      return res.status(415).json({
        success: false,
        error: {
          message: 'Unsupported Media Type',
          code: 'INVALID_CONTENT_TYPE',
          statusCode: 415,
          allowedTypes
        }
      });
    }
  }
  
  // Prevent prototype pollution attacks
  const suspiciousParams = ['__proto__', 'constructor', 'prototype'];
  const allParams = { ...req.query, ...req.body, ...req.params };
  
  for (const key of Object.keys(allParams)) {
    if (suspiciousParams.includes(key)) {
      console.warn('🚨 Suspicious parameter detected:', key, 'from IP:', req.ip);
      
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid parameter detected',
          code: 'INVALID_PARAMETER',
          statusCode: 400
        }
      });
    }
    
    // Also check nested objects
    if (typeof allParams[key] === 'object' && allParams[key] !== null) {
      const nestedKeys = Object.keys(allParams[key]);
      for (const nestedKey of nestedKeys) {
        if (suspiciousParams.includes(nestedKey)) {
          console.warn('🚨 Suspicious nested parameter detected:', nestedKey, 'from IP:', req.ip);
          
          return res.status(400).json({
            success: false,
            error: {
              message: 'Invalid parameter detected',
              code: 'INVALID_PARAMETER',
              statusCode: 400
            }
          });
        }
      }
    }
  }
  
  next();
}

/**
 * Validate request origin (additional CORS validation)
 */
function validateOrigin(req, res, next) {
  const origin = req.get('origin');
  
  // Skip if no origin (same-origin requests)
  if (!origin) {
    return next();
  }
  
  // In production, validate against allowed origins
  if (process.env.NODE_ENV === 'production' && process.env.ALLOWED_ORIGINS) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
    
    if (!allowedOrigins.includes(origin)) {
      console.warn('🚨 Unauthorized origin:', origin, 'from IP:', req.ip);
      
      return res.status(403).json({
        success: false,
        error: {
          message: 'Origin not allowed',
          code: 'ORIGIN_NOT_ALLOWED',
          statusCode: 403
        }
      });
    }
  }
  
  next();
}

/**
 * Prevent path traversal attacks
 */
function preventPathTraversal(req, res, next) {
  const suspiciousPatterns = [
    '../',
    '..\\',
    '%2e%2e',
    '%252e%252e',
    '..%2f',
    '..%5c'
  ];
  
  const fullUrl = req.url.toLowerCase();
  
  for (const pattern of suspiciousPatterns) {
    if (fullUrl.includes(pattern)) {
      console.warn('🚨 Path traversal attempt detected:', req.url, 'from IP:', req.ip);
      
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid request path',
          code: 'INVALID_PATH',
          statusCode: 400
        }
      });
    }
  }
  
  next();
}

module.exports = {
  validateSecurityHeaders,
  validateOrigin,
  preventPathTraversal
};
