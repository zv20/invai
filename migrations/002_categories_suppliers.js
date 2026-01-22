/**
 * Migration 002: Categories and Suppliers Tables
 * 
 * Creates dedicated tables for categories and suppliers with metadata support
 * (colors, descriptions, phone numbers, etc.)
 */

module.exports = {
  version: 2,
  name: 'categories_suppliers_tables',

  async up(db) {
    return new Promise((resolve, reject) => {
      console.log('   🆕 Creating categories and suppliers tables...');
      
      // Create categories table
      db.run(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          color TEXT DEFAULT '#667eea',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Create suppliers table
        db.run(`
          CREATE TABLE IF NOT EXISTS suppliers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            contact_person TEXT,
            email TEXT,
            phone TEXT,
            address TEXT,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) {
            reject(err);
            return;
          }

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
              
              const colors = ['#667eea', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
              let completed = 0;

              rows.forEach((row, index) => {
                db.run(
                  'INSERT OR IGNORE INTO categories (name, color) VALUES (?, ?)',
                  [row.category, colors[index % colors.length]],
                  (err) => {
                    completed++;
                    if (err) console.error('Error migrating category:', err);
                    if (completed === rows.length) {
                      migrateSuppliers();
                    }
                  }
                );
              });
            } else {
              migrateSuppliers();
            }
          });

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
                    'INSERT OR IGNORE INTO suppliers (name) VALUES (?)',
                    [row.supplier],
                    (err) => {
                      completed++;
                      if (err) console.error('Error migrating supplier:', err);
                      if (completed === rows.length) {
                        finish();
                      }
                    }
                  );
                });
              } else {
                finish();
              }
            });
          }

          function finish() {
            console.log('   ✅ Categories and suppliers tables created');
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
