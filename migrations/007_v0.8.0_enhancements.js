/**
 * Migration 007: v0.8.0 Core Foundation
 * - Activity logging system
 * - Reorder point system
 * - Performance indexes
 * - User preferences
 */

module.exports = {
  version: 7,
  name: 'v0.8.0_core_foundation',
  description: 'Activity logging, reorder points, performance indexes',
  
  up: async (db) => {
    console.log('🔧 Running migration 007: v0.8.0 Core Foundation...');
    
    // Activity logging table
    await runSQL(db, `
      CREATE TABLE IF NOT EXISTS activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action_type TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id INTEGER,
        entity_name TEXT,
        description TEXT,
        old_value TEXT,
        new_value TEXT,
        user_id INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created activity_log table');
    
    // Enhance products table with reorder point columns
    try {
      await runSQL(db, 'ALTER TABLE products ADD COLUMN reorder_point INTEGER DEFAULT 0');
      console.log('✓ Added reorder_point column to products');
    } catch (err) {
      if (!err.message.includes('duplicate column')) throw err;
      console.log('  ℹ️  reorder_point column already exists');
    }
    
    try {
      await runSQL(db, 'ALTER TABLE products ADD COLUMN max_stock INTEGER DEFAULT 0');
      console.log('✓ Added max_stock column to products');
    } catch (err) {
      if (!err.message.includes('duplicate column')) throw err;
      console.log('  ℹ️  max_stock column already exists');
    }
    
    try {
      await runSQL(db, 'ALTER TABLE products ADD COLUMN is_favorite INTEGER DEFAULT 0');
      console.log('✓ Added is_favorite column to products');
    } catch (err) {
      if (!err.message.includes('duplicate column')) throw err;
      console.log('  ℹ️  is_favorite column already exists');
    }
    
    try {
      await runSQL(db, 'ALTER TABLE products ADD COLUMN last_restock_date DATETIME');
      console.log('✓ Added last_restock_date column to products');
    } catch (err) {
      if (!err.message.includes('duplicate column')) throw err;
      console.log('  ℹ️  last_restock_date column already exists');
    }
    
    // Performance indexes
    const indexes = [
      { name: 'idx_batches_expiration', sql: 'CREATE INDEX IF NOT EXISTS idx_batches_expiration ON inventory_batches(expiry_date)' },
      { name: 'idx_batches_product', sql: 'CREATE INDEX IF NOT EXISTS idx_batches_product ON inventory_batches(product_id)' },
      { name: 'idx_products_category', sql: 'CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)' },
      { name: 'idx_products_supplier', sql: 'CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id)' },
      { name: 'idx_products_barcode', sql: 'CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)' },
      { name: 'idx_activity_log_entity', sql: 'CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id)' },
      { name: 'idx_activity_log_created', sql: 'CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC)' }
    ];
    
    for (const index of indexes) {
      await runSQL(db, index.sql);
      console.log(`✓ Created index ${index.name}`);
    }
    
    // User preferences table
    await runSQL(db, `
      CREATE TABLE IF NOT EXISTS user_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER DEFAULT 1,
        key TEXT NOT NULL UNIQUE,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created user_preferences table');
    
    console.log('✅ Migration 007 complete');
  },
  
  down: async (db) => {
    console.log('⏪ Rolling back migration 007...');
    
    // Drop tables
    await runSQL(db, 'DROP TABLE IF EXISTS activity_log');
    await runSQL(db, 'DROP TABLE IF EXISTS user_preferences');
    
    // Drop indexes
    const indexes = [
      'idx_batches_expiration',
      'idx_batches_product',
      'idx_products_category',
      'idx_products_supplier',
      'idx_products_barcode',
      'idx_activity_log_entity',
      'idx_activity_log_created'
    ];
    
    for (const index of indexes) {
      await runSQL(db, `DROP INDEX IF EXISTS ${index}`);
    }
    
    console.log('✅ Rollback complete');
  }
};

function runSQL(db, sql) {
  return new Promise((resolve, reject) => {
    db.run(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}