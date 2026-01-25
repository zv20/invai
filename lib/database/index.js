/**
 * Database Adapter Factory
 * 
 * Automatically selects and initializes the correct database adapter
 * based on environment configuration.
 * 
 * Environment Variables:
 *   DATABASE_TYPE - 'sqlite' or 'postgres' (default: sqlite)
 *   
 *   For SQLite:
 *     DATABASE_FILENAME - Path to SQLite file (default: data/inventory.db)
 *   
 *   For PostgreSQL:
 *     DATABASE_HOST - PostgreSQL host (default: localhost)
 *     DATABASE_PORT - PostgreSQL port (default: 5432)
 *     DATABASE_NAME - Database name (required)
 *     DATABASE_USER - Database user (required)
 *     DATABASE_PASSWORD - Database password (required)
 *     DATABASE_POOL_MAX - Max connections (default: 20)
 *     DATABASE_POOL_IDLE_TIMEOUT - Idle timeout in ms (default: 30000)
 *     DATABASE_POOL_CONNECTION_TIMEOUT - Connection timeout in ms (default: 2000)
 * 
 * Sprint 4 Phase 1: PostgreSQL Migration
 */

const SQLiteAdapter = require('./sqliteAdapter');
const PostgresAdapter = require('./postgresAdapter');

class DatabaseFactory {
  constructor() {
    this.adapter = null;
  }

  /**
   * Get database configuration from environment
   */
  _getConfig() {
    const dbType = (process.env.DATABASE_TYPE || 'sqlite').toLowerCase();

    if (dbType === 'postgres' || dbType === 'postgresql') {
      // PostgreSQL configuration
      return {
        type: 'postgres',
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432', 10),
        database: process.env.DATABASE_NAME,
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        poolMax: parseInt(process.env.DATABASE_POOL_MAX || '20', 10),
        idleTimeout: parseInt(process.env.DATABASE_POOL_IDLE_TIMEOUT || '30000', 10),
        connectionTimeout: parseInt(process.env.DATABASE_POOL_CONNECTION_TIMEOUT || '2000', 10)
      };
    } else {
      // SQLite configuration (default)
      return {
        type: 'sqlite',
        filename: process.env.DATABASE_FILENAME || './data/inventory.db'
      };
    }
  }

  /**
   * Validate configuration
   */
  _validateConfig(config) {
    if (config.type === 'postgres') {
      if (!config.database) {
        throw new Error('DATABASE_NAME is required for PostgreSQL');
      }
      if (!config.user) {
        throw new Error('DATABASE_USER is required for PostgreSQL');
      }
      if (!config.password) {
        throw new Error('DATABASE_PASSWORD is required for PostgreSQL');
      }
    }
  }

  /**
   * Create and initialize database adapter
   * @returns {Promise<DatabaseAdapter>}
   */
  async createAdapter() {
    // Return existing adapter if already created (singleton)
    if (this.adapter) {
      return this.adapter;
    }

    const config = this._getConfig();
    this._validateConfig(config);

    // Create adapter based on type
    if (config.type === 'postgres') {
      this.adapter = new PostgresAdapter(config);
    } else {
      this.adapter = new SQLiteAdapter(config);
    }

    // Connect to database
    await this.adapter.connect();

    return this.adapter;
  }

  /**
   * Get current adapter (must call createAdapter first)
   */
  getAdapter() {
    if (!this.adapter) {
      throw new Error('Database adapter not initialized. Call createAdapter() first.');
    }
    return this.adapter;
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.adapter) {
      await this.adapter.close();
      this.adapter = null;
    }
  }
}

// Singleton instance
const factory = new DatabaseFactory();

module.exports = {
  /**
   * Initialize and get database adapter
   * @returns {Promise<DatabaseAdapter>}
   */
  async getDatabase() {
    return await factory.createAdapter();
  },

  /**
   * Get existing adapter (throws if not initialized)
   * @returns {DatabaseAdapter}
   */
  getAdapter() {
    return factory.getAdapter();
  },

  /**
   * Close database connection
   */
  async closeDatabase() {
    await factory.close();
  },

  // Export adapter classes for testing
  SQLiteAdapter,
  PostgresAdapter
};