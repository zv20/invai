/**
 * Migration 002: Make price nullable
 * 
 * The app uses cost_per_case and items_per_case instead of direct pricing.
 * The frontend doesn't send a price field, so it should be nullable.
 * 
 * Version: 0.8.4a
 * Date: January 27, 2026
 */

module.exports = {
  version: 2,
  name: 'make_price_nullable',
  description: 'Make products.price nullable since app uses cost_per_case',

  async up(db) {
    console.log('   🔧 Making products.price nullable...');

    // SQLite doesn't support ALTER COLUMN directly, so we need to:
    // 1. Create new table with correct schema
    // 2. Copy data
    // 3. Drop old table
    // 4. Rename new table

    await db.run(`
      CREATE TABLE products_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        inhouse_number TEXT,
        barcode TEXT,
        brand TEXT,
        price REAL DEFAULT 0,
        cost_per_case REAL DEFAULT 0,
        items_per_case INTEGER DEFAULT 1,
        stock_quantity INTEGER NOT NULL DEFAULT 0,
        category TEXT,
        supplier TEXT,
        category_id INTEGER REFERENCES categories(id),
        supplier_id INTEGER REFERENCES suppliers(id),
        reorder_point INTEGER DEFAULT 0,
        max_stock INTEGER DEFAULT 0,
        notes TEXT DEFAULT '',
        is_favorite INTEGER DEFAULT 0,
        last_restock_date DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.run(`
      INSERT INTO products_new 
      SELECT * FROM products
    `);

    await db.run(`DROP TABLE products`);
    await db.run(`ALTER TABLE products_new RENAME TO products`);

    // Recreate indexes
    await db.run(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)`);

    console.log('   ✅ Products.price is now nullable');
  },

  async down(db) {
    console.log('   🔧 Reverting price to NOT NULL...');

    await db.run(`
      CREATE TABLE products_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        inhouse_number TEXT,
        barcode TEXT,
        brand TEXT,
        price REAL NOT NULL DEFAULT 0,
        cost_per_case REAL DEFAULT 0,
        items_per_case INTEGER DEFAULT 1,
        stock_quantity INTEGER NOT NULL DEFAULT 0,
        category TEXT,
        supplier TEXT,
        category_id INTEGER REFERENCES categories(id),
        supplier_id INTEGER REFERENCES suppliers(id),
        reorder_point INTEGER DEFAULT 0,
        max_stock INTEGER DEFAULT 0,
        notes TEXT DEFAULT '',
        is_favorite INTEGER DEFAULT 0,
        last_restock_date DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.run(`
      INSERT INTO products_new 
      SELECT * FROM products
    `);

    await db.run(`DROP TABLE products`);
    await db.run(`ALTER TABLE products_new RENAME TO products`);

    await db.run(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)`);

    console.log('   ✅ Price reverted to NOT NULL');
  }
};
