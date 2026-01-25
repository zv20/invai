/**
 * SQLite Database Adapter
 * 
 * Implementation of DatabaseAdapter for SQLite.
 * Used for development and testing environments.
 * 
 * Sprint 4 Phase 1: PostgreSQL Migration
 */

const sqlite3 = require('sqlite3').verbose();
const DatabaseAdapter = require('./adapter');
const path = require('path');
const fs = require('fs');

class SQLiteAdapter extends DatabaseAdapter {
  constructor(config) {
    super(config);
    this.dbPath = config.filename || path.join(__dirname, '../../data/inventory.db');
  }

  /**
   * Connect to SQLite database
   */
  async connect() {
    return new Promise((resolve, reject) => {
      // Ensure data directory exists
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(new Error(`Failed to connect to SQLite database: ${err.message}`));
        } else {
          // Enable foreign keys
          this.db.run('PRAGMA foreign_keys = ON', (err) => {
            if (err) {
              reject(new Error(`Failed to enable foreign keys: ${err.message}`));
            } else {
              resolve();
            }
          });
        }
      });
    });
  }

  /**
   * Execute a query and return all rows
   */
  async all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(new Error(`SQLite query error: ${err.message}\nSQL: ${sql}`));
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  /**
   * Execute a query and return first row
   */
  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(new Error(`SQLite query error: ${err.message}\nSQL: ${sql}`));
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * Execute a query without returning rows
   */
  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(new Error(`SQLite query error: ${err.message}\nSQL: ${sql}`));
        } else {
          // 'this' context has lastID and changes
          resolve({
            lastID: this.lastID,
            changes: this.changes
          });
        }
      });
    });
  }

  /**
   * Execute multiple SQL statements
   */
  async exec(sql) {
    return new Promise((resolve, reject) => {
      this.db.exec(sql, (err) => {
        if (err) {
          reject(new Error(`SQLite exec error: ${err.message}\nSQL: ${sql.substring(0, 100)}...`));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Begin transaction
   */
  async beginTransaction() {
    await this.run('BEGIN TRANSACTION');
  }

  /**
   * Commit transaction
   */
  async commit() {
    await this.run('COMMIT');
  }

  /**
   * Rollback transaction
   */
  async rollback() {
    await this.run('ROLLBACK');
  }

  /**
   * Get database type
   */
  getType() {
    return 'sqlite';
  }

  /**
   * Check if connection is alive
   */
  async isConnected() {
    try {
      await this.get('SELECT 1');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Close database connection
   */
  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(new Error(`Failed to close SQLite database: ${err.message}`));
          } else {
            this.db = null;
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get SQLite-specific SQL syntax
   */
  getSyntax(feature) {
    const syntax = {
      // Auto-increment primary key
      'autoincrement': 'INTEGER PRIMARY KEY AUTOINCREMENT',
      
      // Timestamp/datetime
      'timestamp': 'DATETIME',
      'timestamp_default': 'DATETIME DEFAULT CURRENT_TIMESTAMP',
      
      // Boolean
      'boolean': 'BOOLEAN',
      'boolean_default_true': 'BOOLEAN DEFAULT 1',
      'boolean_default_false': 'BOOLEAN DEFAULT 0',
      
      // Text types
      'text': 'TEXT',
      'varchar': 'TEXT', // SQLite uses TEXT for VARCHAR
      
      // Returning clause (not supported in SQLite)
      'returning': '', // SQLite doesn't support RETURNING
      
      // Index creation
      'create_index': 'CREATE INDEX IF NOT EXISTS',
      
      // Drop table
      'drop_table': 'DROP TABLE IF EXISTS'
    };

    return syntax[feature] || '';
  }
}

module.exports = SQLiteAdapter;