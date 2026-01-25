/**
 * Migration 009: Session Management
 * 
 * Adds database-backed session management with:
 * - Session storage with expiration
 * - Activity tracking
 * - IP address and user agent logging
 * - Concurrent session management
 * 
 * Created: 2026-01-25
 */

module.exports = {
  version: 9,
  name: 'session_management',
  description: 'Add user_sessions table for database-backed session management',
  
  async up(db) {
    console.log('Running migration 009: Session Management');
    
    // Helper function to check if table exists
    const tableExists = (tableName) => {
      return new Promise((resolve, reject) => {
        db.get(
          `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
          [tableName],
          (err, row) => {
            if (err) reject(err);
            else resolve(!!row);
          }
        );
      });
    };
    
    // Helper function to run SQL
    const runSQL = (sql, params = []) => {
      return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve(this);
        });
      });
    };
    
    try {
      // Check if table already exists
      const exists = await tableExists('user_sessions');
      
      if (exists) {
        console.log('  ℹ️  user_sessions table already exists, skipping creation');
      } else {
        // Create user_sessions table
        await runSQL(`
          CREATE TABLE user_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL UNIQUE,
            user_id INTEGER NOT NULL,
            ip_address TEXT,
            user_agent TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME NOT NULL,
            is_active BOOLEAN DEFAULT 1,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `);
        console.log('  ✓ Created user_sessions table');
      }
      
      // Create indexes (IF NOT EXISTS is safe to run multiple times)
      const indexes = [
        { name: 'idx_sessions_user_id', sql: 'CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id)' },
        { name: 'idx_sessions_session_id', sql: 'CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON user_sessions(session_id)' },
        { name: 'idx_sessions_expires_at', sql: 'CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON user_sessions(expires_at)' },
        { name: 'idx_sessions_is_active', sql: 'CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON user_sessions(is_active)' }
      ];
      
      for (const index of indexes) {
        await runSQL(index.sql);
        console.log(`  ✓ Created index: ${index.name}`);
      }
      
      console.log('✅ Migration 009 completed successfully');
      
    } catch (error) {
      console.error('❌ Migration 009 failed:', error);
      throw error;
    }
  },
  
  async down(db) {
    console.log('Rolling back migration 009: Session Management');
    
    // Helper function to run SQL
    const runSQL = (sql) => {
      return new Promise((resolve, reject) => {
        db.run(sql, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    };
    
    try {
      // Drop indexes
      await runSQL('DROP INDEX IF EXISTS idx_sessions_is_active');
      await runSQL('DROP INDEX IF EXISTS idx_sessions_expires_at');
      await runSQL('DROP INDEX IF EXISTS idx_sessions_session_id');
      await runSQL('DROP INDEX IF EXISTS idx_sessions_user_id');
      console.log('  ✓ Dropped session indexes');
      
      // Drop table
      await runSQL('DROP TABLE IF EXISTS user_sessions');
      console.log('  ✓ Dropped user_sessions table');
      
      console.log('✅ Migration 009 rollback completed');
      
    } catch (error) {
      console.error('❌ Migration 009 rollback failed:', error);
      throw error;
    }
  }
};
