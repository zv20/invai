/**
 * User Management Routes
 * HTTP layer for user management operations
 * Uses RBAC middleware for access control (owner only)
 */

const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const UserController = require('../controllers/userController');

module.exports = (db, activityLogger) => {
  const controller = new UserController(db, activityLogger);
  
  /**
   * GET /api/users
   * List all users with optional filtering and pagination
   * Query params: page, limit, search, role, is_active
   * Requires: users:view permission (owner only)
   */
  router.get('/', authenticate, requirePermission('users:view'), asyncHandler(async (req, res) => {
    const { page, limit, search, role, is_active } = req.query;
    
    const result = await controller.getAllUsers({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      search,
      role,
      is_active
    });
    
    res.json({
      success: true,
      data: result
    });
  }));
  
  /**
   * GET /api/users/:id
   * Get a single user by ID
   * Requires: users:view permission (owner only)
   */
  router.get('/:id', authenticate, requirePermission('users:view'), asyncHandler(async (req, res) => {
    const user = await controller.getUserById(parseInt(req.params.id));
    
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
      data: user
    });
  }));
  
  /**
   * POST /api/users
   * Create a new user
   * Body: { username, email, password, role }
   * Requires: users:create permission (owner only)
   */
  router.post('/', authenticate, requirePermission('users:create'), asyncHandler(async (req, res) => {
    try {
      const user = await controller.createUser(
        req.body,
        req.user.username,
        req.user.id
      );
      
      res.status(201).json({
        success: true,
        data: user,
        message: 'User created successfully'
      });
    } catch (error) {
      // Handle specific validation errors
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          error: {
            message: error.message,
            code: 'DUPLICATE_USER',
            statusCode: 409
          }
        });
      }
      
      if (error.message.includes('required') || error.message.includes('Invalid')) {
        return res.status(400).json({
          success: false,
          error: {
            message: error.message,
            code: 'VALIDATION_ERROR',
            statusCode: 400
          }
        });
      }
      
      throw error;
    }
  }));
  
  /**
   * PUT /api/users/:id
   * Update user information
   * Body: { email?, role?, is_active? }
   * Requires: users:update permission (owner only)
   */
  router.put('/:id', authenticate, requirePermission('users:update'), asyncHandler(async (req, res) => {
    try {
      const user = await controller.updateUser(
        parseInt(req.params.id),
        req.body,
        req.user.username,
        req.user.id
      );
      
      res.json({
        success: true,
        data: user,
        message: 'User updated successfully'
      });
    } catch (error) {
      if (error.message === 'User not found') {
        return res.status(404).json({
          success: false,
          error: {
            message: error.message,
            code: 'USER_NOT_FOUND',
            statusCode: 404
          }
        });
      }
      
      if (error.message.includes('Cannot') || error.message.includes('Invalid')) {
        return res.status(403).json({
          success: false,
          error: {
            message: error.message,
            code: 'FORBIDDEN',
            statusCode: 403
          }
        });
      }
      
      if (error.message.includes('No valid fields')) {
        return res.status(400).json({
          success: false,
          error: {
            message: error.message,
            code: 'VALIDATION_ERROR',
            statusCode: 400
          }
        });
      }
      
      throw error;
    }
  }));
  
  /**
   * DELETE /api/users/:id
   * Delete user (soft delete - sets is_active to false)
   * Requires: users:delete permission (owner only)
   */
  router.delete('/:id', authenticate, requirePermission('users:delete'), asyncHandler(async (req, res) => {
    try {
      const user = await controller.deleteUser(
        parseInt(req.params.id),
        req.user.username,
        req.user.id
      );
      
      res.json({
        success: true,
        message: `User ${user.username} deactivated successfully`
      });
    } catch (error) {
      if (error.message === 'User not found') {
        return res.status(404).json({
          success: false,
          error: {
            message: error.message,
            code: 'USER_NOT_FOUND',
            statusCode: 404
          }
        });
      }
      
      if (error.message.includes('Cannot delete yourself')) {
        return res.status(403).json({
          success: false,
          error: {
            message: error.message,
            code: 'FORBIDDEN',
            statusCode: 403
          }
        });
      }
      
      throw error;
    }
  }));
  
  /**
   * PUT /api/users/:id/password
   * Change user password
   * Body: { newPassword }
   * Requires: users:update permission (owner only)
   */
  router.put('/:id/password', authenticate, requirePermission('users:update'), asyncHandler(async (req, res) => {
    const { newPassword } = req.body;
    
    try {
      await controller.updatePassword(
        parseInt(req.params.id),
        newPassword,
        req.user.username,
        req.user.id
      );
      
      res.json({
        success: true,
        message: 'Password updated successfully'
      });
    } catch (error) {
      if (error.message.includes('Password must')) {
        return res.status(400).json({
          success: false,
          error: {
            message: error.message,
            code: 'VALIDATION_ERROR',
            statusCode: 400
          }
        });
      }
      
      throw error;
    }
  }));
  
  return router;
};
