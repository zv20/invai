/**
 * Authentication & Authorization Middleware
 * Handles JWT token verification and role-based access control
 */

const jwt = require('jsonwebtoken');

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false,
      error: {
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
        statusCode: 401
      }
    });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false,
      error: {
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
        statusCode: 401
      }
    });
  }
};

/**
 * Authorization Middleware
 * Checks if user has required role(s)
 * 
 * @param {...string} allowedRoles - Roles that are allowed to access the route
 * @returns {Function} Express middleware
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        error: {
          message: 'Authentication required',
          code: 'AUTH_REQUIRED',
          statusCode: 401
        }
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        error: {
          message: 'Insufficient permissions',
          code: 'FORBIDDEN',
          statusCode: 403
        }
      });
    }
    
    next();
  };
};

module.exports = {
  authenticate,
  authorize
};
