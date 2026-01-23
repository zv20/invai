/**
 * Promisified Database Operations with Transaction Support
 * Phase 1: Async/await + transactions to prevent race conditions
 */

const { AppError } = require('../middleware/errorHandler');

class Database {
  constructor(db) {
    this.db = db;
  }

  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(new AppError(err.message, 500, 'DATABASE_ERROR'));
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(new AppError(err.message, 500, 'DATABASE_ERROR'));
        else resolve(row);
      });
    });
  }

  async all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(new AppError(err.message, 500, 'DATABASE_ERROR'));
        else resolve(rows || []);
      });
    });
  }

  // CRITICAL: Transaction support to prevent race conditions
  async transaction(callback) {
    await this.run('BEGIN TRANSACTION');
    try {
      const result = await callback();
      await this.run('COMMIT');
      return result;
    } catch (error) {
      await this.run('ROLLBACK');
      throw error;
    }
  }
}

module.exports = Database;
