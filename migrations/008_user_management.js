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
  async up(db) {
    console.log('Running migration 008: User Management Enhancements');
    
    // Add new columns to users table
    const alterations = [
      { 
        sql: `ALTER TABLE users ADD COLUMN email VARCHAR(255)`,
        desc: 'email'
      },
      { 
        sql: `ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1`,
        desc: 'is_active'
      },
      { 
        sql: `ALTER TABLE users ADD COLUMN last_login DATETIME`,
        desc: 'last_login'
      },
      { 
        sql: `ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP`,
        desc: 'created_at'
      },
      { 
        sql: `ALTER TABLE users ADD COLUMN created_by INTEGER REFERENCES users(id)`,
        desc: 'created_by'
      },
      { 
        sql: `ALTER TABLE users ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`,
        desc: 'updated_at'
      },
      { 
        sql: `ALTER TABLE users ADD COLUMN updated_by INTEGER REFERENCES users(id)`,
        desc: 'updated_by'
      }
    ];
    
    // Execute alterations
    for (const alteration of alterations) {
      try {
        await db.run(alteration.sql);
        console.log(`✓ Added column: ${alteration.desc}`);
      } catch (error) {
        if (error.message.includes('duplicate column')) {
          console.log(`  ⚠ Column ${alteration.desc} already exists, skipping`);
        } else {
          throw error;
        }
      }
    }
    
    // Create trigger for automatic updated_at
    try {
      await db.run(`
        CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
        AFTER UPDATE ON users
        FOR EACH ROW
        BEGIN
          UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END
      `);
      console.log('✓ Created updated_at trigger');
    } catch (error) {
      console.log('  ⚠ Trigger already exists, skipping');
    }
    
    // Update existing users with default email addresses
    try {
      await db.run(`
        UPDATE users 
        SET email = username || '@invai.local',
            is_active = 1,
            created_at = COALESCE(created_at, CURRENT_TIMESTAMP)
        WHERE email IS NULL
      `);
      console.log('✓ Populated existing users with default emails');
    } catch (error) {
      console.log('  ⚠ Error populating emails:', error.message);
    }
    
    // Create unique index on email
    try {
      await db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
      console.log('✓ Created unique index on email');
    } catch (error) {
      console.log('  ⚠ Index already exists, skipping');
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
    
    console.log('⚠ Rollback not implemented for SQLite ALTER TABLE operations');
    console.log('   Manual rollback required if needed');
  }
};
