/**
 * Migration 001: Complete Baseline Schema
 * 
 * This is the consolidated baseline that includes ALL tables:
 * - Products (with category_id, supplier_id)
 * - Categories (with metadata)
 * - Suppliers (with is_active)
 * 
 * This single migration replaces the old fragmented structure.
 * New installations will run only this migration.
 * 
 * Version: 0.8.0
 * Date: January 22, 2026
 */

module.exports = {
  version: 1,
  name: 'complete_baseline',
  description: 'Complete baseline schema with products, categories, and suppliers',

  async up(db) {
    console.log('   🏗️  Creating complete baseline schema...');

    // Step 1: Create products table
    await db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        stock_quantity INTEGER NOT NULL DEFAULT 0,
        category TEXT,
        supplier TEXT,
        category_id INTEGER REFERENCES categories(id),
        supplier_id INTEGER REFERENCES suppliers(id),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ Products table created');

    // Step 2: Create categories table
    await db.run(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        color TEXT DEFAULT '#9333ea',
        icon TEXT DEFAULT '📦',
        display_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ Categories table created');

    // Step 3: Create suppliers table with is_active
    await db.run(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        contact_name TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        notes TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ Suppliers table created (with is_active)');

    // Step 4: Migrate existing categories from products (if any)
    const existingCategories = await db.all(`
      SELECT DISTINCT category 
      FROM products 
      WHERE category IS NOT NULL AND category != ''
    `);

    if (existingCategories && existingCategories.length > 0) {
      console.log(`   📦 Migrating ${existingCategories.length} existing categories...`);
      
      const icons = ['📦', '🥫', '🍞', '🥛', '🍖', '🥗', '🍎', '🧃', '🧀', '🍪'];
      const colors = ['#9333ea', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#14b8a6'];

      for (let i = 0; i < existingCategories.length; i++) {
        const row = existingCategories[i];
        try {
          await db.run(
            'INSERT OR IGNORE INTO categories (name, color, icon, display_order) VALUES (?, ?, ?, ?)',
            [row.category, colors[i % colors.length], icons[i % icons.length], i]
          );
        } catch (err) {
          console.error('Error migrating category:', err);
        }
      }

      // Link products to categories
      const categoriesToLink = await db.all(`
        SELECT DISTINCT category FROM products 
        WHERE category IS NOT NULL AND category != '' AND category_id IS NULL
      `);

      for (const row of categoriesToLink) {
        const cat = await db.get('SELECT id FROM categories WHERE name = ?', [row.category]);
        if (cat) {
          await db.run('UPDATE products SET category_id = ? WHERE category = ?', [cat.id, row.category]);
        }
      }
    }

    // Step 5: Migrate existing suppliers from products (if any)
    const existingSuppliers = await db.all(`
      SELECT DISTINCT supplier 
      FROM products 
      WHERE supplier IS NOT NULL AND supplier != ''
    `);

    if (existingSuppliers && existingSuppliers.length > 0) {
      console.log(`   🏢 Migrating ${existingSuppliers.length} existing suppliers...`);
      
      for (const row of existingSuppliers) {
        try {
          await db.run(
            'INSERT OR IGNORE INTO suppliers (name, is_active) VALUES (?, 1)',
            [row.supplier]
          );
        } catch (err) {
          console.error('Error migrating supplier:', err);
        }
      }

      // Link products to suppliers
      const suppliersToLink = await db.all(`
        SELECT DISTINCT supplier FROM products 
        WHERE supplier IS NOT NULL AND supplier != '' AND supplier_id IS NULL
      `);

      for (const row of suppliersToLink) {
        const sup = await db.get('SELECT id FROM suppliers WHERE name = ?', [row.supplier]);
        if (sup) {
          await db.run('UPDATE products SET supplier_id = ? WHERE supplier = ?', [sup.id, row.supplier]);
        }
      }
    }

    console.log('   ✅ Complete baseline schema created successfully');
    console.log('   ℹ️  All tables: products, categories, suppliers (with is_active)');
  },

  async down(db) {
    await db.run('DROP TABLE IF EXISTS suppliers');
    await db.run('DROP TABLE IF EXISTS categories');
    await db.run('DROP TABLE IF EXISTS products');
  }
};
