/**
 * PostgreSQL Database Adapter
 * 
 * Implementation of DatabaseAdapter for PostgreSQL.
 * Used for production environments.
 * Includes connection pooling for performance and reliability.
 * 
 * Sprint 4 Phase 1: PostgreSQL Migration
 */

const { Pool } = require('pg');
const DatabaseAdapter = require('./adapter');

class PostgresAdapter extends DatabaseAdapter {
  constructor(config) {
    super(config);
    this.pool = null;
    this.client = null; // For transaction support
  }

  /**
   * Connect to PostgreSQL database
   * Creates connection pool
   */
  async connect() {
    try {
      this.pool = new Pool({
        host: this.config.host || 'localhost',
        port: this.config.port || 5432,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
        max: this.config.poolMax || 20, // Maximum pool size
        idleTimeoutMillis: this.config.idleTimeout || 30000,
        connectionTimeoutMillis: this.config.connectionTimeout || 2000,
      });

      // Test connection
      const client = await this.pool.connect();
      client.release();
    } catch (error) {
      throw new Error(`Failed to connect to PostgreSQL database: ${error.message}`);
    }
  }

  /**
   * Convert SQLite-style ? placeholders to PostgreSQL $1, $2, etc.
   */
  _convertPlaceholders(sql) {
    let index = 1;
    return sql.replace(/\?/g, () => `$${index++}`);
  }

  /**
   * Execute a query and return all rows
   */
  async all(sql, params = []) {
    const convertedSql = this._convertPlaceholders(sql);
    
    try {
      const client = this.client || this.pool; // Use transaction client if in transaction
      const result = await client.query(convertedSql, params);
      return result.rows;
    } catch (error) {
      throw new Error(`PostgreSQL query error: ${error.message}\nSQL: ${sql}`);
    }
  }

  /**
   * Execute a query and return first row
   */
  async get(sql, params = []) {
    const convertedSql = this._convertPlaceholders(sql);
    
    try {
      const client = this.client || this.pool;
      const result = await client.query(convertedSql, params);
      return result.rows[0];
    } catch (error) {
      throw new Error(`PostgreSQL query error: ${error.message}\nSQL: ${sql}`);
    }
  }

  /**
   * Execute a query without returning rows
   */
  async run(sql, params = []) {
    const convertedSql = this._convertPlaceholders(sql);
    
    try {
      const client = this.client || this.pool;
      const result = await client.query(convertedSql, params);
      
      // Return format similar to SQLite
      return {
        lastID: result.rows[0]?.id || null, // If RETURNING id was used
        changes: result.rowCount || 0
      };
    } catch (error) {
      throw new Error(`PostgreSQL query error: ${error.message}\nSQL: ${sql}`);
    }
  }

  /**
   * Execute multiple SQL statements
   * PostgreSQL doesn't support exec() like SQLite, so we split and execute
   */
  async exec(sql) {
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    try {
      const client = this.client || this.pool;
      
      for (const statement of statements) {
        await client.query(statement);
      }
    } catch (error) {
      throw new Error(`PostgreSQL exec error: ${error.message}\nSQL: ${sql.substring(0, 100)}...`);
    }
  }

  /**
   * Begin transaction
   * Acquires a dedicated client from pool for transaction
   */
  async beginTransaction() {
    if (this.client) {
      throw new Error('Transaction already in progress');
    }

    try {
      this.client = await this.pool.connect();
      await this.client.query('BEGIN');
    } catch (error) {
      if (this.client) {
        this.client.release();
        this.client = null;
      }
      throw new Error(`Failed to begin transaction: ${error.message}`);
    }
  }

  /**
   * Commit transaction
   */
  async commit() {
    if (!this.client) {
      throw new Error('No transaction in progress');
    }

    try {
      await this.client.query('COMMIT');
    } finally {
      this.client.release();
      this.client = null;
    }
  }

  /**
   * Rollback transaction
   */
  async rollback() {
    if (!this.client) {
      throw new Error('No transaction in progress');
    }

    try {
      await this.client.query('ROLLBACK');
    } finally {
      this.client.release();
      this.client = null;
    }
  }

  /**
   * Get database type
   */
  getType() {
    return 'postgres';
  }

  /**
   * Check if connection is alive
   */
  async isConnected() {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Close database connection pool
   */
  async close() {
    try {
      if (this.client) {
        this.client.release();
        this.client = null;
      }
      
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
      }
    } catch (error) {
      throw new Error(`Failed to close PostgreSQL connection pool: ${error.message}`);
    }
  }

  /**
   * Get PostgreSQL-specific SQL syntax
   */
  getSyntax(feature) {
    const syntax = {
      // Auto-increment primary key
      'autoincrement': 'SERIAL PRIMARY KEY',
      
      // Timestamp/datetime
      'timestamp': 'TIMESTAMP',
      'timestamp_default': 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
      
      // Boolean
      'boolean': 'BOOLEAN',
      'boolean_default_true': 'BOOLEAN DEFAULT TRUE',
      'boolean_default_false': 'BOOLEAN DEFAULT FALSE',
      
      // Text types
      'text': 'TEXT',
      'varchar': 'VARCHAR',
      
      // Returning clause (supported in PostgreSQL)
      'returning': 'RETURNING id',
      
      // Index creation
      'create_index': 'CREATE INDEX IF NOT EXISTS',
      
      // Drop table
      'drop_table': 'DROP TABLE IF EXISTS'
    };

    return syntax[feature] || '';
  }
}

module.exports = PostgresAdapter;