/**
 * Migration 011: Account Lockout & Password Expiration
 * 
 * Sprint 3 Phase 2: Password Policies & Account Lockout
 * 
 * Creates login_attempts table and adds password_changed_at to users table
 * for enterprise-grade security controls.
 * 
 * Features:
 * - Track failed login attempts per user/IP
 * - Account lockout after N failed attempts
 * - Password expiration tracking
 * - Automatic cleanup of old attempts
 * 
 * @version 0.8.4a
 * @date 2026-01-25
 */

module.exports = {
    /**
     * Apply migration - Create login_attempts table and update users
     */
    up: async (db) => {
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                // Create login_attempts table
                db.run(`
                    CREATE TABLE IF NOT EXISTS login_attempts (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        username TEXT NOT NULL,
                        ip_address TEXT NOT NULL,
                        success INTEGER NOT NULL DEFAULT 0,
                        attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        user_agent TEXT
                    )
                `, (err) => {
                    if (err) {
                        console.error('❌ Error creating login_attempts table:', err);
                        return reject(err);
                    }
                    console.log('✅ Created login_attempts table');
                });

                // Create index for username lookups
                db.run(`
                    CREATE INDEX IF NOT EXISTS idx_login_attempts_username 
                    ON login_attempts(username)
                `, (err) => {
                    if (err) {
                        console.error('❌ Error creating username index:', err);
                        return reject(err);
                    }
                    console.log('✅ Created index on login_attempts(username)');
                });

                // Create index for IP address lookups
                db.run(`
                    CREATE INDEX IF NOT EXISTS idx_login_attempts_ip 
                    ON login_attempts(ip_address)
                `, (err) => {
                    if (err) {
                        console.error('❌ Error creating ip_address index:', err);
                        return reject(err);
                    }
                    console.log('✅ Created index on login_attempts(ip_address)');
                });

                // Create index for cleanup operations
                db.run(`
                    CREATE INDEX IF NOT EXISTS idx_login_attempts_attempted_at 
                    ON login_attempts(attempted_at)
                `, (err) => {
                    if (err) {
                        console.error('❌ Error creating attempted_at index:', err);
                        return reject(err);
                    }
                    console.log('✅ Created index on login_attempts(attempted_at)');
                });

                // Add password_changed_at column to users table
                db.run(`
                    ALTER TABLE users 
                    ADD COLUMN password_changed_at DATETIME
                `, (err) => {
                    // Ignore error if column already exists
                    if (err && !err.message.includes('duplicate column')) {
                        console.error('❌ Error adding password_changed_at column:', err);
                        return reject(err);
                    }
                    if (!err) {
                        console.log('✅ Added password_changed_at column to users table');
                    }
                });

                // Add account_locked column to users table
                db.run(`
                    ALTER TABLE users 
                    ADD COLUMN account_locked INTEGER DEFAULT 0
                `, (err) => {
                    // Ignore error if column already exists
                    if (err && !err.message.includes('duplicate column')) {
                        console.error('❌ Error adding account_locked column:', err);
                        return reject(err);
                    }
                    if (!err) {
                        console.log('✅ Added account_locked column to users table');
                    }
                });

                // Add locked_until column to users table
                db.run(`
                    ALTER TABLE users 
                    ADD COLUMN locked_until DATETIME
                `, (err) => {
                    // Ignore error if column already exists
                    if (err && !err.message.includes('duplicate column')) {
                        console.error('❌ Error adding locked_until column:', err);
                        return reject(err);
                    }
                    if (!err) {
                        console.log('✅ Added locked_until column to users table');
                    }
                });

                // Initialize password_changed_at for existing users
                db.run(`
                    UPDATE users 
                    SET password_changed_at = created_at 
                    WHERE password_changed_at IS NULL
                `, (err) => {
                    if (err) {
                        console.error('❌ Error initializing password_changed_at:', err);
                        return reject(err);
                    }
                    console.log('✅ Initialized password_changed_at for existing users');
                    
                    console.log('✅ Migration 011 completed successfully');
                    resolve();
                });
            });
        });
    },

    /**
     * Rollback migration - Drop login_attempts and remove columns from users
     */
    down: async (db) => {
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                // Drop indexes
                db.run('DROP INDEX IF EXISTS idx_login_attempts_attempted_at', (err) => {
                    if (err) console.error('Warning: Error dropping attempted_at index:', err);
                });

                db.run('DROP INDEX IF EXISTS idx_login_attempts_ip', (err) => {
                    if (err) console.error('Warning: Error dropping ip index:', err);
                });

                db.run('DROP INDEX IF EXISTS idx_login_attempts_username', (err) => {
                    if (err) console.error('Warning: Error dropping username index:', err);
                });

                // Drop login_attempts table
                db.run('DROP TABLE IF EXISTS login_attempts', (err) => {
                    if (err) {
                        console.error('❌ Error dropping login_attempts table:', err);
                        return reject(err);
                    }
                    console.log('✅ Dropped login_attempts table');
                });

                // Note: SQLite doesn't support DROP COLUMN easily
                // Columns will remain but be unused after rollback
                console.log('⚠️ Note: password_changed_at, account_locked, and locked_until columns remain in users table');
                console.log('✅ Migration 011 rollback completed');
                resolve();
            });
        });
    }
};
