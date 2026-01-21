/**
 * Migration 001: Baseline Schema
 * Documents the current database schema as of v0.6.0
 * This is a no-op migration that establishes the starting point
 */

module.exports = {
  version: 1,
  name: "Baseline schema (v0.6.0)",

  /**
   * Up migration - no changes needed, tables already exist
   * This migration just documents what we have
   */
  up: async (db) => {
    // No-op: Tables already exist from initDatabase()
    // This migration exists to establish version 1 as baseline
    
    // Verify tables exist
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='products'`,
        (err, row) => {
          if (err) reject(err);
          else if (!row) reject(new Error('Products table not found'));
          else resolve();
        }
      );
    });
  },

  /**
   * Down migration - cannot rollback baseline
   */
  down: async (db) => {
    throw new Error('Cannot rollback baseline migration');
  },

  /**
   * Verify migration
   */
  verify: async (db) => {
    return new Promise((resolve, reject) => {
      // Check that core tables exist
      db.all(
        `SELECT name FROM sqlite_master WHERE type='table' AND name IN ('products', 'inventory_batches')`,
        (err, tables) => {
          if (err) reject(err);
          else resolve(tables.length === 2);
        }
      );
    });
  }
};

/**
 * Schema documented by this baseline:
 * 
 * TABLE: products
 * - id INTEGER PRIMARY KEY AUTOINCREMENT
 * - name TEXT NOT NULL
 * - inhouse_number TEXT
 * - barcode TEXT UNIQUE
 * - brand TEXT
 * - supplier TEXT
 * - items_per_case INTEGER
 * - cost_per_case REAL DEFAULT 0
 * - category TEXT
 * - notes TEXT
 * - created_at DATETIME DEFAULT CURRENT_TIMESTAMP
 * - updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
 * 
 * TABLE: inventory_batches
 * - id INTEGER PRIMARY KEY AUTOINCREMENT
 * - product_id INTEGER NOT NULL
 * - case_quantity INTEGER NOT NULL
 * - total_quantity INTEGER NOT NULL
 * - expiry_date TEXT
 * - location TEXT
 * - received_date DATETIME DEFAULT CURRENT_TIMESTAMP
 * - notes TEXT
 * - FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
 */
