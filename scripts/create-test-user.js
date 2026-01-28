#!/usr/bin/env node
/**
 * Create Test User Script
 * Creates an admin user for integration testing
 */

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'inventory.db');

console.log('\n👤 Creating Test User for Integration Tests');
console.log('='  .repeat(50));

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
      console.log('\n💡 This might be an older version of InvAI.');
      console.log('   The multi-user system may not be implemented yet.');
      console.log('\n   Integration tests will skip authenticated tests.');
      db.close();
      process.exit(0);
    }
    
    console.log('✓ Users table found');
    
    // Check if test user already exists
    db.get('SELECT id, username, role FROM users WHERE username = ?', ['admin'], (err, existingUser) => {
      if (err) {
        console.error('❌ Error checking for existing user:', err.message);
        db.close();
        process.exit(1);
      }
      
      if (existingUser) {
        console.log(`\nℹ️  User 'admin' already exists (ID: ${existingUser.id}, Role: ${existingUser.role})`);
        console.log('   Integration tests should work with this user.');
        console.log('\n   🔑 Make sure the password is: admin123');
        console.log('   If not, you can reset it in the UI or database.');
        db.close();
        process.exit(0);
      }
      
      // Create test user
      const username = 'admin';
      const password = 'admin123';
      const role = 'admin';
      const email = 'admin@test.local';
      
      bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
          console.error('❌ Error hashing password:', err.message);
          db.close();
          process.exit(1);
        }
        
        db.run(
          'INSERT INTO users (username, password, email, role, is_active) VALUES (?, ?, ?, ?, 1)',
          [username, hashedPassword, email, role],
          function(err) {
            if (err) {
              console.error('❌ Error creating user:', err.message);
              db.close();
              process.exit(1);
            }
            
            console.log('\n✅ Test user created successfully!');
            console.log('\n   📄 Details:');
            console.log(`   - Username: ${username}`);
            console.log(`   - Password: ${password}`);
            console.log(`   - Role:     ${role}`);
            console.log(`   - User ID:  ${this.lastID}`);
            console.log('\n✅ Integration tests are now ready to run!');
            console.log('\n   Run: npm run test:integration');
            
            db.close();
            process.exit(0);
          }
        );
      });
    });
  });
});
