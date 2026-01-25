/**
 * Migration 010: Password History Tracking
 * 
 * Sprint 3 Phase 2: Password Policies & Account Lockout
 * 
 * Creates password_history table to prevent password reuse
 * and enforce password rotation security policies.
 * 
 * Features:
 * - Track last 5 passwords per user
 * - Prevent password reuse
 * - Automatic cleanup (retain only last 5)
 * - Foreign key with CASCADE delete
 * 
 * @version 0.8.4a
 * @date 2026-01-25
 */

module.exports = {
    /**
     * Apply migration - Create password_history table
     */
    up: async (db) => {
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                // Create password_history table
                db.run(`
                    CREATE TABLE IF NOT EXISTS password_history (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        password_hash TEXT NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    )
                `, (err) => {
                    if (err) {
                        console.error('❌ Error creating password_history table:', err);
                        return reject(err);
                    }
                    console.log('✅ Created password_history table');
                });

                // Create index for efficient user lookups
                db.run(`
                    CREATE INDEX IF NOT EXISTS idx_password_history_user_id 
                    ON password_history(user_id)
                `, (err) => {
                    if (err) {
                        console.error('❌ Error creating password_history index:', err);
                        return reject(err);
                    }
                    console.log('✅ Created index on password_history(user_id)');
                });

                // Create index for cleanup operations
                db.run(`
                    CREATE INDEX IF NOT EXISTS idx_password_history_created_at 
                    ON password_history(created_at)
                `, (err) => {
                    if (err) {
                        console.error('❌ Error creating created_at index:', err);
                        return reject(err);
                    }
                    console.log('✅ Created index on password_history(created_at)');
                });

                // Migrate existing user passwords to history
                db.run(`
                    INSERT INTO password_history (user_id, password_hash, created_at)
                    SELECT id, password, created_at 
                    FROM users
                    WHERE password IS NOT NULL
                `, (err) => {
                    if (err) {
                        console.error('❌ Error migrating existing passwords:', err);
                        return reject(err);
                    }
                    console.log('✅ Migrated existing user passwords to history');
                    
                    console.log('✅ Migration 010 completed successfully');
                    resolve();
                });
            });
        });
    },

    /**
     * Rollback migration - Drop password_history table
     */
    down: async (db) => {
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                // Drop indexes first
                db.run('DROP INDEX IF EXISTS idx_password_history_created_at', (err) => {
                    if (err) console.error('Warning: Error dropping created_at index:', err);
                });

                db.run('DROP INDEX IF EXISTS idx_password_history_user_id', (err) => {
                    if (err) console.error('Warning: Error dropping user_id index:', err);
                });

                // Drop table
                db.run('DROP TABLE IF EXISTS password_history', (err) => {
                    if (err) {
                        console.error('❌ Error dropping password_history table:', err);
                        return reject(err);
                    }
                    console.log('✅ Dropped password_history table');
                    console.log('✅ Migration 010 rollback completed');
                    resolve();
                });
            });
        });
    }
};
