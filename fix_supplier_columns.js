/**
 * Fix supplier table column names
 * 
 * The old migration created contact_phone and contact_email
 * But server.js expects phone and email
 * 
 * This script renames the columns to match what the API expects
 */

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./inventory.db');

console.log('🔧 Fixing supplier column names...');

db.serialize(() => {
  // SQLite doesn't support RENAME COLUMN directly in older versions
  // We need to recreate the table
  
  console.log('   📋 Creating backup of suppliers table...');
  
  db.run(`
    CREATE TABLE IF NOT EXISTS suppliers_backup AS 
    SELECT * FROM suppliers
  `, (err) => {
    if (err) {
      console.error('❌ Error creating backup:', err);
      db.close();
      process.exit(1);
    }
    
    console.log('   🗑️  Dropping old suppliers table...');
    
    db.run('DROP TABLE suppliers', (err) => {
      if (err) {
        console.error('❌ Error dropping table:', err);
        db.close();
        process.exit(1);
      }
      
      console.log('   🆕 Creating new suppliers table with correct columns...');
      
      db.run(`
        CREATE TABLE suppliers (
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
          console.error('❌ Error creating new table:', err);
          db.close();
          process.exit(1);
        }
        
        console.log('   📦 Restoring data from backup...');
        
        db.run(`
          INSERT INTO suppliers (id, name, contact_name, phone, email, address, notes, created_at, updated_at)
          SELECT id, name, contact_name, contact_phone, contact_email, address, notes, created_at, updated_at
          FROM suppliers_backup
        `, (err) => {
          if (err) {
            console.error('❌ Error restoring data:', err);
            db.close();
            process.exit(1);
          }
          
          console.log('   🗑️  Removing backup table...');
          
          db.run('DROP TABLE suppliers_backup', (err) => {
            if (err) {
              console.error('⚠️  Warning: Could not drop backup table:', err);
            }
            
            db.close();
            console.log('\n✅ Supplier columns fixed successfully!');
            console.log('   phone and email columns are now correct');
            console.log('\n🎉 Fix complete! Restart your server.');
          });
        });
      });
    });
  });
});
