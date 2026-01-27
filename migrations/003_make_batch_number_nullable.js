/**
 * Migration 003: Make batch_number nullable with auto-generation
 * 
 * The batch_number field was required but not being generated consistently.
 * This migration makes it nullable and will auto-generate if needed.
 * 
 * Version: 0.8.4a
 * Date: January 27, 2026
 */

module.exports = {
  version: 3,
  name: 'make_batch_number_nullable',
  description: 'Make batch_number nullable since it auto-generates',

  async up(db) {
    console.log('   🔧 Making batch_number nullable...');

    // SQLite doesn't support ALTER COLUMN directly
    // 1. Create new table with correct schema
    // 2. Copy data
    // 3. Drop old table
    // 4. Rename new table

    await db.run(`
      CREATE TABLE inventory_batches_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        batch_number TEXT,
        case_quantity INTEGER DEFAULT 0,
        total_quantity INTEGER NOT NULL,
        expiry_date DATE,
        location TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        received_date DATE DEFAULT CURRENT_DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.run(`
      INSERT INTO inventory_batches_new 
      SELECT * FROM inventory_batches
    `);

    await db.run(`DROP TABLE inventory_batches`);
    await db.run(`ALTER TABLE inventory_batches_new RENAME TO inventory_batches`);

    // Recreate indexes
    await db.run(`CREATE INDEX IF NOT EXISTS idx_batches_product ON inventory_batches(product_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_batches_expiration ON inventory_batches(expiry_date)`);

    console.log('   ✅ batch_number is now nullable');
  },

  async down(db) {
    console.log('   🔧 Reverting batch_number to NOT NULL...');

    await db.run(`
      CREATE TABLE inventory_batches_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        batch_number TEXT NOT NULL,
        case_quantity INTEGER DEFAULT 0,
        total_quantity INTEGER NOT NULL,
        expiry_date DATE,
        location TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        received_date DATE DEFAULT CURRENT_DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.run(`
      INSERT INTO inventory_batches_new 
      SELECT * FROM inventory_batches
    `);

    await db.run(`DROP TABLE inventory_batches`);
    await db.run(`ALTER TABLE inventory_batches_new RENAME TO inventory_batches`);

    await db.run(`CREATE INDEX IF NOT EXISTS idx_batches_product ON inventory_batches(product_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_batches_expiration ON inventory_batches(expiry_date)`);

    console.log('   ✅ batch_number reverted to NOT NULL');
  }
};
