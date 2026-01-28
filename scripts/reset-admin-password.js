#!/usr/bin/env node
/**
 * Reset Admin Password Script
 * Resets the admin user password to 'admin123' for testing
 */

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'inventory.db');
const NEW_PASSWORD = 'admin123';

console.log('\n🔑 Resetting Admin Password');
console.log('=' .repeat(50));

// Open database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  }
  
  console.log('✓ Connected to database');
  
  // Check if users table exists
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
    if (err) {
      console.error('❌ Error checking for users table:', err.message);
      db.close();
      process.exit(1);
    }
    
    if (!row) {
      console.error('❌ Users table does not exist!');
      console.log('\n💡 Multi-user system not implemented yet.');
      db.close();
      process.exit(1);
    }
    
    console.log('✓ Users table found');
    
    // Find admin user
    db.get('SELECT id, username, role FROM users WHERE username = ?', ['admin'], (err, user) => {
      if (err) {
        console.error('❌ Error finding admin user:', err.message);
        db.close();
        process.exit(1);
      }
      
      if (!user) {
        console.error('❌ Admin user not found!');
        console.log('\n💡 Run: npm run test:setup');
        console.log('   To create the admin user first.');
        db.close();
        process.exit(1);
      }
      
      console.log(`✓ Found user: ${user.username} (ID: ${user.id}, Role: ${user.role})`);
      
      // Hash new password
      bcrypt.hash(NEW_PASSWORD, 10, (err, hashedPassword) => {
        if (err) {
          console.error('❌ Error hashing password:', err.message);
          db.close();
          process.exit(1);
        }
        
        // Update password
        db.run(
          'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [hashedPassword, user.id],
          function(err) {
            if (err) {
              console.error('❌ Error updating password:', err.message);
              db.close();
              process.exit(1);
            }
            
            console.log('\n✅ Password reset successfully!');
            console.log('\n   📄 New credentials:');
            console.log(`   - Username: ${user.username}`);
            console.log(`   - Password: ${NEW_PASSWORD}`);
            console.log('\n✅ Integration tests are now ready!');
            console.log('\n   Test login with:');
            console.log(`   curl -X POST http://localhost:3000/api/auth/login \\`);
            console.log(`     -H "Content-Type: application/json" \\`);
            console.log(`     -d '{"username":"admin","password":"admin123"}'`);
            
            db.close();
            process.exit(0);
          }
        );
      });
    });
  });
});
