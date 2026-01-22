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
    return new Promise((resolve, reject) => {
      console.log('   🏗️  Creating complete baseline schema...');

      // Step 1: Create products table
      db.run(`
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
      `, (err) => {
        if (err) {
          reject(err);
          return;
        }
        console.log('   ✅ Products table created');
        createCategoriesTable();
      });

      function createCategoriesTable() {
        // Step 2: Create categories table
        db.run(`
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
        `, (err) => {
          if (err) {
            reject(err);
            return;
          }
          console.log('   ✅ Categories table created');
          createSuppliersTable();
        });
      }

      function createSuppliersTable() {
        // Step 3: Create suppliers table with is_active
        db.run(`
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
        `, (err) => {
          if (err) {
            reject(err);
            return;
          }
          console.log('   ✅ Suppliers table created (with is_active)');
          migrateExistingData();
        });
      }

      function migrateExistingData() {
        // Step 4: Migrate existing categories from products (if any)
        db.all(`
          SELECT DISTINCT category 
          FROM products 
          WHERE category IS NOT NULL AND category != ''
        `, [], (err, rows) => {
          if (err) {
            reject(err);
            return;
          }

          if (rows && rows.length > 0) {
            console.log(`   📦 Migrating ${rows.length} existing categories...`);
            
            const icons = ['📦', '🥫', '🍞', '🥛', '🍖', '🥗', '🍎', '🧃', '🧀', '🍪'];
            const colors = ['#9333ea', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#14b8a6'];
            let completed = 0;

            rows.forEach((row, index) => {
              db.run(
                'INSERT OR IGNORE INTO categories (name, color, icon, display_order) VALUES (?, ?, ?, ?)',
                [row.category, colors[index % colors.length], icons[index % icons.length], index],
                (err) => {
                  completed++;
                  if (err) console.error('Error migrating category:', err);
                  if (completed === rows.length) {
                    updateProductCategoryIds();
                  }
                }
              );
            });
          } else {
            migrateSuppliers();
          }
        });
      }

      function updateProductCategoryIds() {
        // Link products to categories
        db.all(`
          SELECT DISTINCT category FROM products 
          WHERE category IS NOT NULL AND category != '' AND category_id IS NULL
        `, [], (err, rows) => {
          if (err || !rows || rows.length === 0) {
            migrateSuppliers();
            return;
          }

          let completed = 0;
          rows.forEach((row) => {
            db.get('SELECT id FROM categories WHERE name = ?', [row.category], (err, cat) => {
              if (!err && cat) {
                db.run('UPDATE products SET category_id = ? WHERE category = ?', [cat.id, row.category], () => {
                  completed++;
                  if (completed === rows.length) {
                    migrateSuppliers();
                  }
                });
              } else {
                completed++;
                if (completed === rows.length) {
                  migrateSuppliers();
                }
              }
            });
          });
        });
      }

      function migrateSuppliers() {
        // Step 5: Migrate existing suppliers from products (if any)
        db.all(`
          SELECT DISTINCT supplier 
          FROM products 
          WHERE supplier IS NOT NULL AND supplier != ''
        `, [], (err, rows) => {
          if (err) {
            reject(err);
            return;
          }

          if (rows && rows.length > 0) {
            console.log(`   🏢 Migrating ${rows.length} existing suppliers...`);
            
            let completed = 0;

            rows.forEach((row) => {
              db.run(
                'INSERT OR IGNORE INTO suppliers (name, is_active) VALUES (?, 1)',
                [row.supplier],
                (err) => {
                  completed++;
                  if (err) console.error('Error migrating supplier:', err);
                  if (completed === rows.length) {
                    updateProductSupplierIds();
                  }
                }
              );
            });
          } else {
            finish();
          }
        });
      }

      function updateProductSupplierIds() {
        // Link products to suppliers
        db.all(`
          SELECT DISTINCT supplier FROM products 
          WHERE supplier IS NOT NULL AND supplier != '' AND supplier_id IS NULL
        `, [], (err, rows) => {
          if (err || !rows || rows.length === 0) {
            finish();
            return;
          }

          let completed = 0;
          rows.forEach((row) => {
            db.get('SELECT id FROM suppliers WHERE name = ?', [row.supplier], (err, sup) => {
              if (!err && sup) {
                db.run('UPDATE products SET supplier_id = ? WHERE supplier = ?', [sup.id, row.supplier], () => {
                  completed++;
                  if (completed === rows.length) {
                    finish();
                  }
                });
              } else {
                completed++;
                if (completed === rows.length) {
                  finish();
                }
              }
            });
          });
        });
      }

      function finish() {
        console.log('   ✅ Complete baseline schema created successfully');
        console.log('   ℹ️  All tables: products, categories, suppliers (with is_active)');
        resolve();
      }
    });
  },

  async down(db) {
    return new Promise((resolve, reject) => {
      db.run('DROP TABLE IF EXISTS suppliers', (err) => {
        if (err) {
          reject(err);
          return;
        }
        db.run('DROP TABLE IF EXISTS categories', (err) => {
          if (err) {
            reject(err);
            return;
          }
          db.run('DROP TABLE IF EXISTS products', (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      });
    });
  }
};
