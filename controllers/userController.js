/**
 * User Controller
 * Business logic for user management operations
 * Follows MVC pattern established in Phase 1-2
 */

const bcrypt = require('bcryptjs');
const passwordValidator = require('../utils/passwordValidator');

class UserController {
  constructor(db, activityLogger) {
    this.db = db;
    this.activityLogger = activityLogger;
  }

  /**
   * Get all users with optional filtering and pagination
   * @param {Object} options - Query options {page, limit, search, role, is_active}
   * @returns {Object} {users: [], pagination: {}}
   */
  async getAllUsers(options = {}) {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      role = '', 
      is_active 
    } = options;
    
    const offset = (page - 1) * limit;
    
    let sql = `
      SELECT 
        u.id, u.username, u.email, u.role, u.is_active,
        u.last_login, u.created_at, u.updated_at,
        creator.username as created_by_username,
        updater.username as updated_by_username
      FROM users u
      LEFT JOIN users creator ON u.created_by = creator.id
      LEFT JOIN users updater ON u.updated_by = updater.id
      WHERE 1=1
    `;
    const params = [];
    
    // Apply filters
    if (search) {
      sql += ` AND (u.username LIKE ? OR u.email LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    if (role) {
      sql += ` AND u.role = ?`;
      params.push(role);
    }
    if (is_active !== undefined && is_active !== null && is_active !== '') {
      sql += ` AND u.is_active = ?`;
      params.push(is_active === 'true' || is_active === true || is_active === 1 ? 1 : 0);
    }
    
    // Get total count
    const countSql = sql.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as total FROM');
    const { total } = await this.db.get(countSql, params);
    
    // Get paginated results
    sql += ` ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);
    
    const users = await this.db.all(sql, params);
    
    return {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get a single user by ID
   * @param {number} id - User ID
   * @returns {Object|null} User object or null
   */
  async getUserById(id) {
    const user = await this.db.get(`
      SELECT 
        u.id, u.username, u.email, u.role, u.is_active,
        u.last_login, u.created_at, u.updated_at,
        creator.username as created_by_username,
        updater.username as updated_by_username
      FROM users u
      LEFT JOIN users creator ON u.created_by = creator.id
      LEFT JOIN users updater ON u.updated_by = updater.id
      WHERE u.id = ?
    `, [id]);
    
    return user;
  }

  /**
   * Create a new user
   * @param {Object} userData - {username, email, password, role}
   * @param {string} creatorUsername - Username of the user creating this user
   * @param {number} creatorId - ID of the user creating this user
   * @returns {Object} Created user object
   */
  async createUser(userData, creatorUsername, creatorId) {
    const { username, email, password, role = 'viewer' } = userData;
    
    // Validate required fields
    if (!username || !email || !password) {
      throw new Error('Username, email, and password are required');
    }
    
    // Validate password complexity
    const validation = passwordValidator.validatePasswordComplexity(password);
    if (!validation.valid) {
      throw new Error(`Password validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Validate role
    const validRoles = ['owner', 'manager', 'staff', 'viewer', 'admin'];
    if (!validRoles.includes(role)) {
      throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }
    
    // Check for existing username or email
    const existing = await this.db.get(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    if (existing) {
      throw new Error('Username or email already exists');
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Insert user with password_changed_at set to now
    const result = await this.db.run(`
      INSERT INTO users (username, password, email, role, is_active, password_changed_at, created_by, created_at)
      VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP)
    `, [username, passwordHash, email, role, creatorId]);
    
    // Add initial password to history
    await passwordValidator.addPasswordToHistory(result.lastID, passwordHash);
    
    // Log activity
    await this.activityLogger.log(
      'user', 
      result.lastID, 
      'created', 
      creatorUsername, 
      { username, email, role }
    );
    
    // Return created user
    return await this.getUserById(result.lastID);
  }

  /**
   * Update user information
   * @param {number} id - User ID to update
   * @param {Object} updates - {email, role, is_active}
   * @param {string} updaterUsername - Username performing the update
   * @param {number} updaterId - ID of user performing the update
   * @returns {Object} Updated user object
   */
  async updateUser(id, updates, updaterUsername, updaterId) {
    // Check if user exists
    const user = await this.getUserById(id);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Prevent self-role-change
    if (id === updaterId && updates.role && updates.role !== user.role) {
      throw new Error('Cannot change your own role');
    }
    
    // Prevent self-deactivation
    if (id === updaterId && (updates.is_active === false || updates.is_active === 0)) {
      throw new Error('Cannot deactivate yourself');
    }
    
    // Build update query
    const updateFields = [];
    const params = [];
    
    if (updates.email !== undefined) {
      updateFields.push('email = ?');
      params.push(updates.email);
    }
    if (updates.role !== undefined) {
      const validRoles = ['owner', 'manager', 'staff', 'viewer', 'admin'];
      if (!validRoles.includes(updates.role)) {
        throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
      }
      updateFields.push('role = ?');
      params.push(updates.role);
    }
    if (updates.is_active !== undefined) {
      updateFields.push('is_active = ?');
      params.push(updates.is_active ? 1 : 0);
    }
    
    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    // Add updater tracking
    updateFields.push('updated_by = ?');
    params.push(updaterId);
    params.push(id);
    
    // Execute update
    await this.db.run(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );
    
    // Log activity
    await this.activityLogger.log(
      'user',
      id,
      'updated',
      updaterUsername,
      updates
    );
    
    // Return updated user
    return await this.getUserById(id);
  }

  /**
   * Delete user (soft delete - sets is_active to false)
   * @param {number} id - User ID to delete
   * @param {string} deleterUsername - Username performing the deletion
   * @param {number} deleterId - ID of user performing the deletion
   * @returns {Object} Deleted user object
   */
  async deleteUser(id, deleterUsername, deleterId) {
    // Prevent self-deletion
    if (id === deleterId) {
      throw new Error('Cannot delete yourself');
    }
    
    // Check if user exists
    const user = await this.getUserById(id);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Soft delete (deactivate)
    await this.db.run(
      'UPDATE users SET is_active = 0, updated_by = ? WHERE id = ?',
      [deleterId, id]
    );
    
    // Log activity
    await this.activityLogger.log(
      'user',
      id,
      'deleted',
      deleterUsername,
      { username: user.username }
    );
    
    return user;
  }

  /**
   * Update user password
   * @param {number} id - User ID
   * @param {string} newPassword - New password
   * @param {string} updaterUsername - Username performing the update
   * @param {number} updaterId - ID of user performing the update
   * @returns {boolean} Success
   */
  async updatePassword(id, newPassword, updaterUsername, updaterId) {
    // Validate password complexity
    const validation = passwordValidator.validatePasswordComplexity(newPassword);
    if (!validation.valid) {
      throw new Error(`Password validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Check password history
    const inHistory = await passwordValidator.isPasswordInHistory(id, newPassword);
    if (inHistory) {
      throw new Error('Password has been used recently. Please choose a different password.');
    }
    
    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    // Update password and set password_changed_at
    await this.db.run(
      'UPDATE users SET password = ?, password_changed_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ?',
      [passwordHash, updaterId, id]
    );
    
    // Add password to history
    await passwordValidator.addPasswordToHistory(id, passwordHash);
    
    // Log activity (without exposing password)
    await this.activityLogger.log(
      'user',
      id,
      'password_changed',
      updaterUsername,
      { by_user: updaterId }
    );
    
    return true;
  }

  /**
   * Update last login timestamp
   * @param {number} id - User ID
   * @returns {boolean} Success
   */
  async updateLastLogin(id) {
    await this.db.run(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
    return true;
  }
}

module.exports = UserController;