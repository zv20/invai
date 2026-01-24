/**
 * Authentication Routes
 * Handles user login, logout, password changes, and user info
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../middleware/asyncHandler');
const { authenticate } = require('../middleware/auth');

module.exports = (db, logger) => {
  
  /**
   * POST /api/auth/login
   * Authenticates user and returns JWT token
   */
  router.post('/login', asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    // Get user from database
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Compare password
    const match = await bcrypt.compare(password, user.password);
    
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    logger.info(`User logged in: ${username}`);
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  }));
  
  /**
   * GET /api/auth/me
   * Returns authenticated user's information
   */
  router.get('/me', authenticate, asyncHandler(async (req, res) => {
    const user = await db.get(
      'SELECT id, username, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  }));
  
  /**
   * POST /api/auth/change-password
   * Allows authenticated users to change their password
   */
  router.post('/change-password', authenticate, asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    
    // Get user from database
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify current password
    const match = await bcrypt.compare(currentPassword, user.password);
    
    if (!match) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password
    const hash = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await db.run(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hash, req.user.id]
    );
    
    logger.info(`Password changed for user: ${user.username}`);
    res.json({ message: 'Password changed successfully' });
  }));
  
  /**
   * POST /api/auth/logout
   * Invalidates current session (client should delete token)
   */
  router.post('/logout', authenticate, asyncHandler(async (req, res) => {
    logger.info(`User logged out: ${req.user.username}`);
    res.json({ message: 'Logged out successfully' });
  }));
  
  return router;
};
