/**
 * Authentication Routes
 * Handles user login, logout, token refresh, password changes, and session management
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../middleware/asyncHandler');
const { authenticate } = require('../middleware/auth');
const { validateSession } = require('../middleware/session');
const sessionManager = require('../utils/sessionManager');
const UserController = require('../controllers/userController');

module.exports = (db, logger) => {
  
  // Initialize sessionManager with db and logger
  sessionManager.initialize(db, logger);
  
  /**
   * POST /api/auth/login
   * Authenticates user and returns JWT token with session
   */
  router.post('/login', asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false,
        error: {
          message: 'Username and password required',
          code: 'MISSING_CREDENTIALS',
          statusCode: 400
        }
      });
    }
    
    // Get user from database
    const user = await db.get(
      'SELECT * FROM users WHERE username = ? AND is_active = 1',
      [username]
    );
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: {
          message: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS',
          statusCode: 401
        }
      });
    }
    
    // Compare password
    const match = await bcrypt.compare(password, user.password);
    
    if (!match) {
      return res.status(401).json({ 
        success: false,
        error: {
          message: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS',
          statusCode: 401
        }
      });
    }
    
    // Get client IP and user agent
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    
    // Create session in database
    const sessionId = await sessionManager.createSession(
      user.id,
      ipAddress,
      userAgent
    );
    
    // Update last login timestamp
    await UserController.updateLastLogin(user.id);
    
    // Generate JWT token with session ID
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role,
        sessionId // Include session ID in JWT
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    logger.info(`User logged in: ${username}`, {
      userId: user.id,
      ipAddress,
      sessionId: sessionId.substring(0, 8) + '...'
    });    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  }));
  
  /**
   * GET /api/auth/me
   * Returns authenticated user's information
   * Validates session before returning data
   */
  router.get('/me', authenticate, validateSession, asyncHandler(async (req, res) => {
    const user = await db.get(
      'SELECT id, username, email, role, last_login, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND',
          statusCode: 404
        }
      });
    }
    
    res.json({
      success: true,
      user
    });
  }));
  
  /**
   * POST /api/auth/change-password
   * Allows authenticated users to change their password
   */
  router.post('/change-password', authenticate, validateSession, asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false,
        error: {
          message: 'Current and new password required',
          code: 'MISSING_PASSWORDS',
          statusCode: 400
        }
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false,
        error: {
          message: 'New password must be at least 6 characters',
          code: 'PASSWORD_TOO_SHORT',
          statusCode: 400
        }
      });
    }
    
    // Get user from database
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND',
          statusCode: 404
        }
      });
    }
    
    // Verify current password
    const match = await bcrypt.compare(currentPassword, user.password);
    
    if (!match) {
      return res.status(401).json({ 
        success: false,
        error: {
          message: 'Current password is incorrect',
          code: 'INCORRECT_PASSWORD',
          statusCode: 401
        }
      });
    }
    
    // Hash new password
    const hash = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await db.run(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hash, req.user.id]
    );
    
    logger.info(`Password changed for user: ${user.username}`);
    
    // Invalidate all other sessions (force re-login)
    await sessionManager.invalidateAllUserSessions(req.user.id, req.user.sessionId);
    
    res.json({ 
      success: true,
      message: 'Password changed successfully. Other sessions have been logged out.' 
    });
  }));
  
  /**
   * POST /api/auth/logout
   * Invalidates current session
   */
  router.post('/logout', authenticate, validateSession, asyncHandler(async (req, res) => {
    // Invalidate current session
    await sessionManager.invalidateSession(
      req.user.sessionId,
      'user_logout'
    );
    
    logger.info(`User logged out: ${req.user.username}`, {
      sessionId: req.user.sessionId.substring(0, 8) + '...'
    });
    
    res.json({ 
      success: true,
      message: 'Logged out successfully' 
    });
  }));
  
  /**
   * GET /api/auth/sessions
   * Get all active sessions for the current user
   */
  router.get('/sessions', authenticate, validateSession, asyncHandler(async (req, res) => {
    const sessions = await sessionManager.getUserSessions(req.user.id);
    
    // Mark current session
    const sessionsWithCurrent = sessions.map(session => ({
      ...session,
      isCurrent: session.session_id === req.user.sessionId,
      // Hide full session ID for security
      session_id: session.session_id.substring(0, 8) + '...'
    }));
    
    res.json({
      success: true,
      data: {
        sessions: sessionsWithCurrent,
        count: sessionsWithCurrent.length
      }
    });
  }));
  
  /**
   * DELETE /api/auth/sessions/:sessionId
   * Terminate a specific session
   */
  router.delete('/sessions/:sessionId', authenticate, validateSession, asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    
    // Verify the session belongs to the current user
    const sessions = await sessionManager.getUserSessions(req.user.id);
    const targetSession = sessions.find(s => s.session_id.startsWith(sessionId));
    
    if (!targetSession) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Session not found',
          code: 'SESSION_NOT_FOUND',
          statusCode: 404
        }
      });
    }
    
    // Prevent terminating current session (use logout instead)
    if (targetSession.session_id === req.user.sessionId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Cannot terminate current session. Use /logout instead.',
          code: 'CANNOT_TERMINATE_CURRENT',
          statusCode: 400
        }
      });    }
    
    // Invalidate the session
    await sessionManager.invalidateSession(targetSession.session_id, 'user_terminated');
    
    logger.info(`Session terminated by user`, {
      userId: req.user.id,
      terminatedSession: sessionId
    });
    
    res.json({
      success: true,
      message: 'Session terminated successfully'
    });
  }));
  
  /**
   * DELETE /api/auth/sessions
   * Terminate all other sessions (keep current)
   */
  router.delete('/sessions', authenticate, validateSession, asyncHandler(async (req, res) => {
    // Invalidate all sessions except current
    await sessionManager.invalidateAllUserSessions(
      req.user.id,
      req.user.sessionId
    );
    
    logger.info(`All other sessions terminated by user`, {
      userId: req.user.id
    });
    
    res.json({
      success: true,
      message: 'All other sessions terminated successfully'
    });
  }));
  
  /**
   * GET /api/auth/session-info
   * Get information about current session
   */
  router.get('/session-info', authenticate, validateSession, asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: {
        session: {
          sessionId: req.session.session_id.substring(0, 8) + '...',
          ipAddress: req.session.ip_address,
          userAgent: req.session.user_agent,
          createdAt: req.session.created_at,
          lastActivity: req.session.last_activity,
          expiresAt: req.session.expires_at
        }
      }
    });
  }));  
  return router;
};
