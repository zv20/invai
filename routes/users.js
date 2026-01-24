/**
 * User Management Routes (Admin Only)
 * Handles user creation, listing, and deletion
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const asyncHandler = require('../middleware/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');

module.exports = (db, logger) => {
  
  /**
   * GET /api/users
   * List all users (Admin only)
   */
  router.get('/', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    const users = await db.all(
      'SELECT id, username, role, created_at, updated_at FROM users ORDER BY created_at DESC',
      []
    );
    
    res.json({
      success: true,
      users
    });
  }));
  
  /**
   * POST /api/users
   * Create a new user (Admin only)
   */
  router.post('/', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    const { username, password, role } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false,
        error: {
          message: 'Username and password required',
          code: 'MISSING_FIELDS',
          statusCode: 400
        }
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        error: {
          message: 'Password must be at least 6 characters',
          code: 'PASSWORD_TOO_SHORT',
          statusCode: 400
        }
      });
    }
    
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ 
        success: false,
        error: {
          message: 'Invalid role',
          code: 'INVALID_ROLE',
          statusCode: 400
        }
      });
    }
    
    // Hash password
    const hash = await bcrypt.hash(password, 10);
    
    try {
      // Insert user
      const result = await db.run(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        [username, hash, role]
      );
      
      logger.info(`New user created: ${username} (${role}) by ${req.user.username}`);
      
      res.status(201).json({
        success: true,
        user: {
          id: result.lastID,
          username,
          role
        }
      });
    } catch (error) {
      if (error.message.includes('UNIQUE constraint')) {
        return res.status(409).json({ 
          success: false,
          error: {
            message: 'Username already exists',
            code: 'USERNAME_EXISTS',
            statusCode: 409
          }
        });
      }
      throw error;
    }
  }));
  
  /**
   * DELETE /api/users/:id
   * Delete a user (Admin only)
   */
  router.delete('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Prevent deleting self
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ 
        success: false,
        error: {
          message: 'Cannot delete your own account',
          code: 'CANNOT_DELETE_SELF',
          statusCode: 400
        }
      });
    }
    
    // Get user info before deleting (for logging)
    const user = await db.get('SELECT username FROM users WHERE id = ?', [id]);
    
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
    
    // Delete user
    await db.run('DELETE FROM users WHERE id = ?', [id]);
    
    logger.info(`User deleted: ${user.username} by ${req.user.username}`);
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  }));
  
  return router;
};
