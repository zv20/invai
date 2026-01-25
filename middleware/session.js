/**
 * Session Validation Middleware
 * 
 * Validates user sessions on every authenticated request.
 * Works in conjunction with JWT authentication to provide
 * database-backed session management.
 * 
 * Created: 2026-01-25
 */

const sessionManager = require('../utils/sessionManager');
const logger = require('../utils/logger');

/**
 * Validate session middleware
 * 
 * Checks if the session ID from JWT is still valid in the database.
 * Enforces session expiration and inactivity timeouts.
 * 
 * Should be used AFTER the authenticate middleware which verifies JWT.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
async function validateSession(req, res, next) {
    try {
        // Extract session ID from JWT payload (set by authenticate middleware)
        const sessionId = req.user?.sessionId;
        
        if (!sessionId) {
            logger.warn('No session ID found in request', {
                path: req.path,
                userId: req.user?.id
            });
            
            return res.status(401).json({
                success: false,
                error: {
                    code: 'NO_SESSION',
                    message: 'No active session found. Please log in again.'
                }
            });
        }
        
        // Validate session in database
        const session = await sessionManager.validateSession(sessionId);
        
        if (!session) {
            logger.info('Invalid or expired session', {
                sessionId: sessionId.substring(0, 8) + '...',
                path: req.path
            });
            
            return res.status(401).json({
                success: false,
                error: {
                    code: 'SESSION_EXPIRED',
                    message: 'Your session has expired. Please log in again.'
                }
            });
        }
        
        // Attach full session data to request
        req.session = session;
        
        // Verify user from session matches JWT
        if (session.user_id !== req.user.id) {
            logger.error('Session user mismatch', {
                jwtUserId: req.user.id,
                sessionUserId: session.user_id
            });
            
            return res.status(401).json({
                success: false,
                error: {
                    code: 'SESSION_MISMATCH',
                    message: 'Session validation failed. Please log in again.'
                }
            });
        }
        
        // Continue to next middleware
        next();
        
    } catch (error) {
        logger.error('Session validation error:', error);
        
        return res.status(500).json({
            success: false,
            error: {
                code: 'SESSION_VALIDATION_ERROR',
                message: 'Error validating session'
            }
        });
    }
}

/**
 * Optional session validation
 * 
 * Validates session if present, but doesn't fail if missing.
 * Useful for endpoints that work with or without authentication.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
async function validateSessionOptional(req, res, next) {
    try {
        const sessionId = req.user?.sessionId;
        
        if (sessionId) {
            const session = await sessionManager.validateSession(sessionId);
            if (session) {
                req.session = session;
            }
        }
        
        next();
        
    } catch (error) {
        logger.error('Optional session validation error:', error);
        // Don't fail the request, just continue without session
        next();
    }
}

module.exports = {
    validateSession,
    validateSessionOptional
};
