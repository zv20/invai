/**
 * One-time fix script for suppliers table
 * 
 * Run this if you updated to v0.7.7 but the suppliers table is missing
 * (happened if old migration 002_categories.js ran instead of 002_categories_suppliers.js)
 * 
 * Usage: node fix_suppliers_table.js
 */

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./inventory.db');

console.log('🔧 Fixing suppliers table...');

db.serialize(() => {
  // Create suppliers table
  db.run(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      contact_name TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('❌ Error creating suppliers table:', err);
      db.close();
      process.exit(1);
    } else {
      console.log('✅ Suppliers table created successfully');
    }
  });

  // Add supplier_id to products if not exists
  db.run('ALTER TABLE products ADD COLUMN supplier_id INTEGER REFERENCES suppliers(id)', (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('⚠️  Warning adding supplier_id:', err.message);
    } else if (!err) {
      console.log('✅ Added supplier_id column to products');
    } else {
      console.log('✅ supplier_id column already exists');
    }
  });

  // Migrate existing suppliers from products table
  db.all(`SELECT DISTINCT supplier FROM products WHERE supplier IS NOT NULL AND supplier != ''`, [], (err, rows) => {
    if (err) {
      console.error('❌ Error reading suppliers:', err);
      db.close();
      process.exit(1);
    }

    if (rows && rows.length > 0) {
      console.log(`📦 Migrating ${rows.length} existing suppliers...`);
      
      let completed = 0;
      rows.forEach((row) => {
        db.run('INSERT OR IGNORE INTO suppliers (name) VALUES (?)', [row.supplier], (err) => {
          completed++;
          if (err) {
            console.error('❌ Error migrating supplier:', err);
          } else {
            console.log(`  ✓ Migrated: ${row.supplier}`);
          }
          
          if (completed === rows.length) {
            updateProductSuppliers();
          }
        });
      });
    } else {
      console.log('✅ No suppliers to migrate');
      db.close();
      console.log('\n🎉 Fix complete! Restart your server.');
    }
  });

  function updateProductSuppliers() {
    db.all(`SELECT DISTINCT supplier FROM products WHERE supplier IS NOT NULL AND supplier != '' AND supplier_id IS NULL`, [], (err, rows) => {
      if (err || !rows || rows.length === 0) {
        db.close();
        console.log('\n🎉 Fix complete! Restart your server.');
        return;
      }

      let completed = 0;
      rows.forEach((row) => {
        db.get('SELECT id FROM suppliers WHERE name = ?', [row.supplier], (err, sup) => {
          if (!err && sup) {
            db.run('UPDATE products SET supplier_id = ? WHERE supplier = ?', [sup.id, row.supplier], () => {
              completed++;
              if (completed === rows.length) {
                db.close();
                console.log('✅ Product supplier references updated');
                console.log('\n🎉 Fix complete! Restart your server.');
              }
            });
          } else {
            completed++;
            if (completed === rows.length) {
              db.close();
              console.log('✅ Product supplier references updated');
              console.log('\n🎉 Fix complete! Restart your server.');
            }
          }
        });
      });
    });
  }
});
