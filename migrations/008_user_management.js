/**
 * Migration 008: User Management Enhancements
 * Adds comprehensive user fields for Phase 3 user management
 * 
 * New fields:
 * - email: User email address (unique)
 * - is_active: Soft delete flag
 * - last_login: Track user activity
 * - created_at, created_by: Audit who created the user
 * - updated_at, updated_by: Audit who modified the user
 */

module.exports = {
  version: 8,
  name: 'user_management_enhancements',
  description: 'Add email, is_active, last_login, and audit trail to users table',
  
  async up(db) {
    console.log('Running migration 008: User Management Enhancements');
    
    // Helper function to check if column exists
    const columnExists = (tableName, columnName) => {
      return new Promise((resolve, reject) => {
        db.all(`PRAGMA table_info(${tableName})`, [], (err, columns) => {
          if (err) reject(err);
          else resolve(columns.some(col => col.name === columnName));
        });
      });
    };
    
    // Helper function to run SQL
    const runSQL = (sql) => {
      return new Promise((resolve, reject) => {
        db.run(sql, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    };
    
    // Add new columns to users table (only if they don't exist)
    const columns = [
      { name: 'email', sql: `ALTER TABLE users ADD COLUMN email VARCHAR(255)` },
      { name: 'is_active', sql: `ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1` },
      { name: 'last_login', sql: `ALTER TABLE users ADD COLUMN last_login DATETIME` },
      { name: 'created_at', sql: `ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP` },
      { name: 'created_by', sql: `ALTER TABLE users ADD COLUMN created_by INTEGER REFERENCES users(id)` },
      { name: 'updated_at', sql: `ALTER TABLE users ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP` },
      { name: 'updated_by', sql: `ALTER TABLE users ADD COLUMN updated_by INTEGER REFERENCES users(id)` }
    ];
    
    // Check and add each column
    for (const col of columns) {
      try {
        const exists = await columnExists('users', col.name);
        if (!exists) {
          await runSQL(col.sql);
          console.log(`✓ Added column: ${col.name}`);
        } else {
          console.log(`  ℹ️  Column ${col.name} already exists, skipping`);
        }
      } catch (error) {
        if (error.message.includes('duplicate column')) {
          console.log(`  ℹ️  Column ${col.name} already exists, skipping`);
        } else {
          throw error;
        }
      }
    }
    
    // Create trigger for automatic updated_at (if not exists)
    try {
      await runSQL(`
        CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
        AFTER UPDATE ON users
        FOR EACH ROW
        BEGIN
          UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END
      `);
      console.log('✓ Created updated_at trigger');
    } catch (error) {
      console.log('  ℹ️  Trigger already exists, skipping');
    }
    
    // Update existing users with default email addresses (only if email is NULL)
    try {
      await runSQL(`
        UPDATE users 
        SET email = username || '@invai.local',
            is_active = 1,
            created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
            updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
        WHERE email IS NULL
      `);
      console.log('✓ Populated existing users with default emails');
    } catch (error) {
      console.log('  ⚠️  Error populating emails:', error.message);
    }
    
    // Create unique index on email (if not exists)
    try {
      await runSQL(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
      console.log('✓ Created unique index on email');
    } catch (error) {
      console.log('  ℹ️  Index already exists, skipping');
    }
    
    console.log('✅ Migration 008 completed successfully');
  },
  
  async down(db) {
    console.log('Rolling back migration 008...');
    
    // Note: SQLite doesn't support DROP COLUMN directly
    // For production rollback, you would need to:
    // 1. Create new table without the columns
    // 2. Copy data from old table
    // 3. Drop old table
    // 4. Rename new table
    
    console.log('⚠️ Rollback not implemented for SQLite ALTER TABLE operations');
    console.log('   Manual rollback required if needed');
  }
};
