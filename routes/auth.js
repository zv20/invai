/**
 * Authentication Routes
 * Handles user registration, login, logout, token refresh, password changes, and session management
 * 
 * SECURITY PATCHES APPLIED:
 * - PATCH 2: bcrypt salt rounds increased to 12
 * - PATCH 3: JWT expiration reduced to 2h (configurable)
 * - PATCH 8: Rate limiting on auth endpoints
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../middleware/asyncHandler');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { validateSession } = require('../middleware/session');
const sessionManager = require('../utils/sessionManager');
const passwordValidator = require('../utils/passwordValidator');
const accountLockout = require('../utils/accountLockout');
const { getCsrfToken } = require('../middleware/csrf');

// PATCH 8: Rate limiting
const { authLimiter, strictLimiter } = require('../middleware/rateLimitConfig');

module.exports = (db, logger) => {
  
  // Initialize sessionManager with db and logger
  sessionManager.initialize(db, logger);
  
  /**
   * GET /api/auth/csrf-token
   * Get CSRF token for client-side requests
   * PUBLIC endpoint (no authentication required)
   */
  router.get('/csrf-token', (req, res) => {
    const token = getCsrfToken(req);
    
    if (!token) {
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to generate CSRF token',
          code: 'CSRF_TOKEN_ERROR',
          statusCode: 500
        }
      });
    }
    
    res.json({
      success: true,
      csrfToken: token
    });
  });
  
  /**
   * POST /api/auth/register
   * Register the first user (becomes owner)
   * PUBLIC endpoint - only works if no users exist
   * PATCH 8: Rate limited
   */
  router.post('/register', authLimiter, asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;
    
    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false,
        error: {
          message: 'Username, email, and password are required',
          code: 'MISSING_FIELDS',
          statusCode: 400
        }
      });
    }
    
    // Check if any users exist
    const userCount = await db.get('SELECT COUNT(*) as count FROM users');
    
    if (userCount.count > 0) {
      return res.status(403).json({ 
        success: false,
        error: {
          message: 'Registration is closed. Users already exist.',
          code: 'REGISTRATION_CLOSED',
          statusCode: 403
        }
      });
    }
    
    // Validate username
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ 
        success: false,
        error: {
          message: 'Username must be between 3 and 20 characters',
          code: 'INVALID_USERNAME',
          statusCode: 400
        }
      });
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return res.status(400).json({ 
        success: false,
        error: {
          message: 'Username can only contain letters, numbers, underscores, and hyphens',
          code: 'INVALID_USERNAME',
          statusCode: 400
        }
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        error: {
          message: 'Invalid email format',
          code: 'INVALID_EMAIL',
          statusCode: 400
        }
      });
    }
    
    // Validate password complexity
    const validation = passwordValidator.validatePasswordComplexity(password);
    if (!validation.valid) {
      return res.status(400).json({ 
        success: false,
        error: {
          message: 'Password does not meet complexity requirements',
          code: 'WEAK_PASSWORD',
          statusCode: 400,
          details: validation.errors
        }
      });
    }
    
    // PATCH 2: Hash password with bcrypt rounds 12 (increased from 10)
    const hash = await bcrypt.hash(password, 12);
    
    // Create first user with owner role
    const result = await db.run(
      `INSERT INTO users (username, email, password, role, password_changed_at, is_active) 
       VALUES (?, ?, ?, 'owner', CURRENT_TIMESTAMP, 1)`,
      [username, email, hash]
    );
    
    const userId = result.lastID;
    
    // Add password to history
    await passwordValidator.addPasswordToHistory(userId, hash);
    
    logger.info(`First user registered: ${username}`, {
      userId,
      email,
      role: 'owner'
    });
    
    res.status(201).json({
      success: true,
      message: 'Account created successfully. Please log in.',
      user: {
        id: userId,
        username,
        email,
        role: 'owner'
      }
    });
  }));
  
  /**
   * POST /api/auth/login
   * Authenticates user and returns JWT token with session
   * Includes account lockout protection and login attempt tracking
   * PATCH 3: JWT expiration reduced to 2h
   * PATCH 8: Rate limited
   */
  router.post('/login', authLimiter, asyncHandler(async (req, res) => {
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
    
    // Get client IP and user agent
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    
    // Check if account is locked
    const lockStatus = await accountLockout.isAccountLocked(username, ipAddress);
    if (lockStatus.locked) {
      // Record failed attempt due to lockout
      await accountLockout.recordLoginAttempt(username, ipAddress, false, userAgent);
      
      const minutes = Math.ceil(lockStatus.remainingTime / 60);
      return res.status(423).json({ 
        success: false,
        error: {
          message: `Account is locked due to multiple failed login attempts. Try again in ${minutes} minute(s).`,
          code: 'ACCOUNT_LOCKED',
          statusCode: 423,
          remainingTime: lockStatus.remainingTime,
          unlocksAt: lockStatus.unlocksAt
        }
      });
    }
    
    // Get user from database
    const user = await db.get(
      'SELECT * FROM users WHERE username = ? AND is_active = 1',
      [username]
    );
    
    if (!user) {
      // Record failed attempt
      await accountLockout.recordLoginAttempt(username, ipAddress, false, userAgent);
      
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
      // Record failed attempt
      await accountLockout.recordLoginAttempt(username, ipAddress, false, userAgent);
      
      return res.status(401).json({ 
        success: false,
        error: {
          message: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS',
          statusCode: 401
        }
      });
    }
    
    // Successful login - record it and reset failed attempts
    await accountLockout.recordLoginAttempt(username, ipAddress, true, userAgent);
    await accountLockout.resetFailedAttempts(username);
    
    // Check password expiration
    let passwordExpired = false;
    let passwordWarning = false;
    let daysUntilExpiration = null;
    
    if (user.password_changed_at) {
      const passwordChangedDate = new Date(user.password_changed_at);
      const now = new Date();
      const daysSinceChange = Math.floor((now - passwordChangedDate) / (1000 * 60 * 60 * 24));
      const expirationDays = 90; // From config
      
      daysUntilExpiration = expirationDays - daysSinceChange;
      
      if (daysUntilExpiration <= 0) {
        passwordExpired = true;
      } else if (daysUntilExpiration <= 14) {
        passwordWarning = true;
      }
    }
    
    // Create session in database
    const sessionId = await sessionManager.createSession(
      user.id,
      ipAddress,
      userAgent
    );
    
    // Update last login timestamp
    await db.run(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );
    
    // PATCH 3: Generate JWT token with configurable expiration (default 2h)
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role,
        sessionId // Include session ID in JWT
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || '2h' } // Reduced from 24h
    );
    
    logger.info(`User logged in: ${username}`, {
      userId: user.id,
      ipAddress,
      sessionId: sessionId.substring(0, 8) + '...'
    });
    
    const response = {
      success: true,
      token,
      csrfToken: getCsrfToken(req), // Include CSRF token in login response
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    };
    
    // Add password status if warning or expired
    if (passwordExpired) {
      response.passwordStatus = {
        expired: true,
        requiresChange: true,
        message: 'Your password has expired. Please change it immediately.'
      };
    } else if (passwordWarning) {
      response.passwordStatus = {
        warning: true,
        daysRemaining: daysUntilExpiration,
        message: `Your password will expire in ${daysUntilExpiration} day(s). Please change it soon.`
      };
    }
    
    res.json(response);
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
   * Includes password complexity validation and history checking
   * PATCH 2: bcrypt rounds 12
   * PATCH 8: Strict rate limiting
   */
  router.post('/change-password', authenticate, validateSession, strictLimiter, asyncHandler(async (req, res) => {
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
    
    // Validate password complexity
    const validation = passwordValidator.validatePasswordComplexity(newPassword);
    if (!validation.valid) {
      return res.status(400).json({ 
        success: false,
        error: {
          message: 'Password does not meet complexity requirements',
          code: 'WEAK_PASSWORD',
          statusCode: 400,
          details: validation.errors
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
    
    // Check password history
    const inHistory = await passwordValidator.isPasswordInHistory(req.user.id, newPassword);
    if (inHistory) {
      return res.status(400).json({ 
        success: false,
        error: {
          message: 'Password has been used recently. Please choose a different password.',
          code: 'PASSWORD_REUSED',
          statusCode: 400
        }
      });
    }
    
    // PATCH 2: Hash new password with bcrypt rounds 12
    const hash = await bcrypt.hash(newPassword, 12);
    
    // Update password and password_changed_at timestamp
    await db.run(
      'UPDATE users SET password = ?, password_changed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hash, req.user.id]
    );
    
    // Add password to history
    await passwordValidator.addPasswordToHistory(req.user.id, hash);
    
    logger.info(`Password changed for user: ${user.username}`);
    
    // Invalidate all other sessions (force re-login)
    await sessionManager.invalidateAllUserSessions(req.user.id, req.user.sessionId);
    
    res.json({ 
      success: true,
      message: 'Password changed successfully. Other sessions have been logged out.' 
    });
  }));
  
  /**
   * GET /api/auth/password-status
   * Check current user's password expiration status
   */
  router.get('/password-status', authenticate, validateSession, asyncHandler(async (req, res) => {
    const user = await db.get(
      'SELECT password_changed_at FROM users WHERE id = ?',
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
    
    let status = {
      expired: false,
      requiresChange: false,
      warning: false,
      daysRemaining: null,
      lastChanged: user.password_changed_at,
      expirationDate: null
    };
    
    if (user.password_changed_at) {
      const passwordChangedDate = new Date(user.password_changed_at);
      const now = new Date();
      const daysSinceChange = Math.floor((now - passwordChangedDate) / (1000 * 60 * 60 * 24));
      const expirationDays = 90; // From config
      
      status.daysRemaining = expirationDays - daysSinceChange;
      
      const expirationDate = new Date(passwordChangedDate);
      expirationDate.setDate(expirationDate.getDate() + expirationDays);
      status.expirationDate = expirationDate.toISOString();
      
      if (status.daysRemaining <= 0) {
        status.expired = true;
        status.requiresChange = true;
      } else if (status.daysRemaining <= 14) {
        status.warning = true;
      }
    } else {
      // No password_changed_at set - treat as never changed
      status.warning = true;
      status.daysRemaining = 0;
    }
    
    res.json({
      success: true,
      data: status
    });
  }));
  
  /**
   * POST /api/auth/unlock/:userId
   * Unlock a locked user account (admin only)
   */
  router.post('/unlock/:userId', authenticate, requirePermission('users:update'), asyncHandler(async (req, res) => {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid user ID',
          code: 'INVALID_USER_ID',
          statusCode: 400
        }
      });
    }
    
    // Check if user exists
    const user = await db.get('SELECT id, username, account_locked FROM users WHERE id = ?', [userId]);
    
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
    
    // Unlock the account
    await accountLockout.unlockAccountById(userId);
    
    // Reset failed attempts
    await accountLockout.resetFailedAttempts(user.username);
    
    logger.info(`Account unlocked by admin`, {
      adminUsername: req.user.username,
      unlockedUserId: userId,
      unlockedUsername: user.username
    });
    
    res.json({
      success: true,
      message: `Account for user "${user.username}" has been unlocked successfully.`
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
      });
    }
    
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
