/**
 * Database Adapter Base Class
 * 
 * Abstract interface for database operations.
 * Implementations: SQLite (dev/testing), PostgreSQL (production)
 * 
 * Sprint 4 Phase 1: PostgreSQL Migration
 */

class DatabaseAdapter {
  /**
   * Initialize database connection
   * @param {Object} config - Database configuration
   */
  constructor(config) {
    if (this.constructor === DatabaseAdapter) {
      throw new Error('DatabaseAdapter is an abstract class and cannot be instantiated directly');
    }
    this.config = config;
    this.db = null;
  }

  /**
   * Connect to database
   * Must be implemented by subclass
   */
  async connect() {
    throw new Error('connect() must be implemented by subclass');
  }

  /**
   * Execute a query and return all rows
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Array>} Array of row objects
   */
  async all(sql, params = []) {
    throw new Error('all() must be implemented by subclass');
  }

  /**
   * Execute a query and return first row
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Object|undefined>} Row object or undefined
   */
  async get(sql, params = []) {
    throw new Error('get() must be implemented by subclass');
  }

  /**
   * Execute a query without returning rows (INSERT, UPDATE, DELETE)
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} Result with lastID and changes
   */
  async run(sql, params = []) {
    throw new Error('run() must be implemented by subclass');
  }

  /**
   * Execute multiple SQL statements (for migrations)
   * @param {string} sql - SQL statements (separated by semicolons)
   * @returns {Promise<void>}
   */
  async exec(sql) {
    throw new Error('exec() must be implemented by subclass');
  }

  /**
   * Begin a transaction
   * @returns {Promise<void>}
   */
  async beginTransaction() {
    throw new Error('beginTransaction() must be implemented by subclass');
  }

  /**
   * Commit a transaction
   * @returns {Promise<void>}
   */
  async commit() {
    throw new Error('commit() must be implemented by subclass');
  }

  /**
   * Rollback a transaction
   * @returns {Promise<void>}
   */
  async rollback() {
    throw new Error('rollback() must be implemented by subclass');
  }

  /**
   * Execute function within a transaction
   * Automatically commits on success, rolls back on error
   * @param {Function} fn - Async function to execute
   * @returns {Promise<any>} Result of function
   */
  async transaction(fn) {
    await this.beginTransaction();
    try {
      const result = await fn();
      await this.commit();
      return result;
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }

  /**
   * Get database type (sqlite or postgres)
   * @returns {string}
   */
  getType() {
    throw new Error('getType() must be implemented by subclass');
  }

  /**
   * Check if connection is alive
   * @returns {Promise<boolean>}
   */
  async isConnected() {
    throw new Error('isConnected() must be implemented by subclass');
  }

  /**
   * Close database connection
   * @returns {Promise<void>}
   */
  async close() {
    throw new Error('close() must be implemented by subclass');
  }

  /**
   * Get database-specific SQL syntax
   * Allows migrations to use correct syntax for each database
   * @param {string} feature - Feature name (autoincrement, timestamp, etc.)
   * @returns {string} SQL syntax
   */
  getSyntax(feature) {
    throw new Error('getSyntax() must be implemented by subclass');
  }
}

module.exports = DatabaseAdapter;