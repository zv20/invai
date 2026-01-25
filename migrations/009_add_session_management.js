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

const db = require('../config/database');
const logger = require('../utils/logger');

async function up() {
    logger.info('Running migration 009: Session Management');
    
    try {
        // Check if table already exists
        const tableExists = await db.get(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='user_sessions'
        `);
        
        if (tableExists) {
            logger.info('  user_sessions table already exists, skipping creation');
        } else {
            // Create user_sessions table
            await db.run(`
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
            logger.info('  ✓ Created user_sessions table');
        }
        
        // Create indexes (check first to avoid errors)
        const indexes = [
            { name: 'idx_sessions_user_id', sql: 'CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id)' },
            { name: 'idx_sessions_session_id', sql: 'CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON user_sessions(session_id)' },
            { name: 'idx_sessions_expires_at', sql: 'CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON user_sessions(expires_at)' },
            { name: 'idx_sessions_is_active', sql: 'CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON user_sessions(is_active)' }
        ];
        
        for (const index of indexes) {
            await db.run(index.sql);
            logger.info(`  ✓ Created index: ${index.name}`);
        }
        
        logger.info('✅ Migration 009 completed successfully');
        
    } catch (error) {
        logger.error('❌ Migration 009 failed:', error);
        throw error;
    }
}

async function down() {
    logger.info('Rolling back migration 009: Session Management');
    
    try {
        // Drop indexes
        await db.run('DROP INDEX IF EXISTS idx_sessions_is_active');
        await db.run('DROP INDEX IF EXISTS idx_sessions_expires_at');
        await db.run('DROP INDEX IF EXISTS idx_sessions_session_id');
        await db.run('DROP INDEX IF EXISTS idx_sessions_user_id');
        logger.info('  ✓ Dropped session indexes');
        
        // Drop table
        await db.run('DROP TABLE IF EXISTS user_sessions');
        logger.info('  ✓ Dropped user_sessions table');
        
        logger.info('✅ Migration 009 rollback completed');
        
    } catch (error) {
        logger.error('❌ Migration 009 rollback failed:', error);
        throw error;
    }
}

module.exports = { up, down };
