/**
 * Migration 001: Baseline Schema
 * 
 * Establishes the baseline schema for existing databases.
 * This migration is idempotent and safe to run on databases that already
 * have the products and inventory_batches tables.
 */

module.exports = {
  version: 1,
  name: 'baseline_schema',

  async up(db) {
    return new Promise((resolve, reject) => {
      // Check if products table exists
      db.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='products'",
        [],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          if (row) {
            // Tables already exist - this is an existing database
            console.log('   ℹ️  Existing schema detected - baseline migration skipped');
            resolve();
          } else {
            // Fresh database - create tables
            console.log('   🆕 Creating baseline schema...');
            
            db.run(`
              CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                inhouse_number TEXT,
                barcode TEXT UNIQUE,
                brand TEXT,
                supplier TEXT,
                items_per_case INTEGER,
                cost_per_case REAL DEFAULT 0,
                category TEXT,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
              )
            `, (err) => {
              if (err) {
                reject(err);
                return;
              }

              db.run(`
                CREATE TABLE IF NOT EXISTS inventory_batches (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  product_id INTEGER NOT NULL,
                  case_quantity INTEGER NOT NULL,
                  total_quantity INTEGER NOT NULL,
                  expiry_date TEXT,
                  location TEXT,
                  received_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                  notes TEXT,
                  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
                )
              `, (err) => {
                if (err) reject(err);
                else {
                  console.log('   ✅ Baseline schema created');
                  resolve();
                }
              });
            });
          }
        }
      );
    });
  },

  async down(db) {
    // Baseline migration should never be rolled back
    throw new Error('Cannot rollback baseline migration');
  }
};