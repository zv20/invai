/**
 * Migration 002: Categories and Suppliers Tables (CONSOLIDATED)
 * 
 * This is the consolidated version that includes is_active from the start.
 * Replaces old 002 + 003 emergency fix.
 * 
 * Creates dedicated tables for categories and suppliers with full metadata support
 * Matches schema expected by v0.7.8f+ API endpoints
 */

module.exports = {
  version: 2,
  name: 'categories_suppliers_complete',
  description: 'Create categories and suppliers tables with is_active column',

  async up(db) {
    return new Promise((resolve, reject) => {
      console.log('   🆕 Creating categories and suppliers tables (consolidated)...');
      
      // Create categories table with icon and display_order
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

        // Create suppliers table with is_active from the start
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

          // Add category_id and supplier_id to products table if not exists
          db.run('ALTER TABLE products ADD COLUMN category_id INTEGER REFERENCES categories(id)', (err) => {
            if (err && !err.message.includes('duplicate column')) {
              console.error('Note: category_id column may already exist');
            }
          });

          db.run('ALTER TABLE products ADD COLUMN supplier_id INTEGER REFERENCES suppliers(id)', (err) => {
            if (err && !err.message.includes('duplicate column')) {
              console.error('Note: supplier_id column may already exist');
            }
          });

          // Migrate existing categories from products table
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

          function updateProductCategoryIds() {
            // Update products to use category_id instead of category text
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
            // Migrate existing suppliers from products table
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
            // Update products to use supplier_id instead of supplier text
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
            console.log('   ✅ Categories and suppliers tables created successfully');
            console.log('   ✅ is_active column included from start');
            console.log('   ℹ️  Old category and supplier text columns preserved for compatibility');
            resolve();
          }
        });
      });
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
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }
};
