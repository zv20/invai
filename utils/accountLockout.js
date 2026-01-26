/**
 * Account Lockout Manager
 * 
 * Sprint 3 Phase 2: Password Policies & Account Lockout
 * 
 * Protects against brute-force attacks by:
 * - Tracking failed login attempts
 * - Locking accounts after N failed attempts
 * - Automatic unlock after timeout
 * - IP-based tracking
 * - Automatic cleanup of old attempts
 * 
 * @version 0.8.4a
 * @date 2026-01-25
 */

const security = require('../config/security');

// Database instance will be set via initialize()
let db = null;

/**
 * Initialize the account lockout manager with database instance
 * MUST be called before using any other functions
 * 
 * @param {Object} database - Database instance with async methods (get, run, all)
 */
function initialize(database) {
    db = database;
    console.log('✓ Account lockout manager initialized');
}

/**
 * Record a login attempt (success or failure)
 * 
 * @param {string} username - Username attempting to login
 * @param {string} ipAddress - IP address of attempt
 * @param {boolean} success - Whether login was successful
 * @param {string} userAgent - User agent string
 * @returns {Promise<void>}
 */
async function recordLoginAttempt(username, ipAddress, success, userAgent = null) {
    if (!db) throw new Error('Account lockout not initialized');
    
    try {
        await db.run(
            `INSERT INTO login_attempts (username, ip_address, success, user_agent) 
             VALUES (?, ?, ?, ?)`,
            [username, ipAddress, success ? 1 : 0, userAgent]
        );
    } catch (err) {
        console.error('Error recording login attempt:', err);
        throw err;
    }
}

/**
 * Get count of recent failed login attempts
 * 
 * @param {string} username - Username to check
 * @param {string} ipAddress - Optional IP address to check
 * @param {number} windowMinutes - Time window to check (default: from config)
 * @returns {Promise<number>} Count of failed attempts
 */
async function getFailedAttempts(username, ipAddress = null, windowMinutes = null) {
    if (!db) throw new Error('Account lockout not initialized');
    
    const config = security.lockout;
    
    if (!config.enabled) {
        return 0;
    }
    
    const lockoutDuration = windowMinutes || config.lockoutDuration;
    const sinceTime = new Date(Date.now() - lockoutDuration * 60 * 1000).toISOString();
    
    let query = `
        SELECT COUNT(*) as count 
        FROM login_attempts 
        WHERE username = ? 
        AND success = 0 
        AND attempted_at > ?
    `;
    
    const params = [username, sinceTime];
    
    // Also filter by IP if tracking by IP is enabled and IP is provided
    if (config.trackByIp && ipAddress) {
        query += ' AND ip_address = ?';
        params.push(ipAddress);
    }
    
    try {
        const row = await db.get(query, params);
        return row.count || 0;
    } catch (err) {
        console.error('Error getting failed attempts:', err);
        throw err;
    }
}

/**
 * Check if account is currently locked
 * 
 * @param {string} username - Username to check
 * @param {string} ipAddress - Optional IP address to check
 * @returns {Promise<Object>} Lock status { locked: boolean, remainingTime: number }
 */
async function isAccountLocked(username, ipAddress = null) {
    if (!db) throw new Error('Account lockout not initialized');
    
    const config = security.lockout;
    
    if (!config.enabled) {
        return { locked: false, remainingTime: 0 };
    }
    
    try {
        // Check if user has locked_until set and it's still in the future
        const row = await db.get(
            `SELECT account_locked, locked_until 
             FROM users 
             WHERE username = ?`,
            [username]
        );
        
        if (!row) {
            return { locked: false, remainingTime: 0 };
        }
        
        // Check if locked_until has passed
        if (row.locked_until) {
            const lockedUntil = new Date(row.locked_until);
            const now = new Date();
            
            if (lockedUntil > now) {
                const remainingMs = lockedUntil - now;
                return {
                    locked: true,
                    remainingTime: Math.ceil(remainingMs / 1000), // seconds
                    unlocksAt: lockedUntil.toISOString()
                };
            } else {
                // Lock has expired, unlock the account
                await unlockAccount(username);
                return { locked: false, remainingTime: 0 };
            }
        }
        
        // Check failed attempts count
        const failedCount = await getFailedAttempts(username, ipAddress);
        
        if (failedCount >= config.maxAttempts) {
            // Lock the account
            await lockAccount(username);
            
            const remainingTime = config.lockoutDuration * 60; // seconds
            return {
                locked: true,
                remainingTime,
                unlocksAt: new Date(Date.now() + remainingTime * 1000).toISOString()
            };
        }
        
        return { locked: false, remainingTime: 0 };
    } catch (error) {
        console.error('Error checking account lock status:', error);
        throw error;
    }
}

/**
 * Lock a user account
 * 
 * @param {string} username - Username to lock
 * @returns {Promise<void>}
 */
async function lockAccount(username) {
    if (!db) throw new Error('Account lockout not initialized');
    
    const config = security.lockout;
    const lockedUntil = new Date(Date.now() + config.lockoutDuration * 60 * 1000).toISOString();
    
    try {
        await db.run(
            `UPDATE users 
             SET account_locked = 1, locked_until = ? 
             WHERE username = ?`,
            [lockedUntil, username]
        );
        console.log(`🔒 Account locked: ${username} until ${lockedUntil}`);
    } catch (err) {
        console.error('Error locking account:', err);
        throw err;
    }
}

/**
 * Unlock a user account (manual or automatic)
 * 
 * @param {string} username - Username to unlock
 * @returns {Promise<void>}
 */
async function unlockAccount(username) {
    if (!db) throw new Error('Account lockout not initialized');
    
    try {
        await db.run(
            `UPDATE users 
             SET account_locked = 0, locked_until = NULL 
             WHERE username = ?`,
            [username]
        );
        console.log(`🔓 Account unlocked: ${username}`);
    } catch (err) {
        console.error('Error unlocking account:', err);
        throw err;
    }
}

/**
 * Unlock account by user ID (admin function)
 * 
 * @param {number} userId - User ID to unlock
 * @returns {Promise<void>}
 */
async function unlockAccountById(userId) {
    if (!db) throw new Error('Account lockout not initialized');
    
    try {
        await db.run(
            `UPDATE users 
             SET account_locked = 0, locked_until = NULL 
             WHERE id = ?`,
            [userId]
        );
        console.log(`🔓 Account unlocked: User ID ${userId}`);
    } catch (err) {
        console.error('Error unlocking account by ID:', err);
        throw err;
    }
}

/**
 * Reset failed login attempts for a user (after successful login)
 * 
 * @param {string} username - Username
 * @returns {Promise<void>}
 */
async function resetFailedAttempts(username) {
    if (!db) throw new Error('Account lockout not initialized');
    
    try {
        await db.run(
            `DELETE FROM login_attempts 
             WHERE username = ? AND success = 0`,
            [username]
        );
    } catch (err) {
        console.error('Error resetting failed attempts:', err);
        throw err;
    }
}

/**
 * Get recent login attempts for a user (for audit/display)
 * 
 * @param {string} username - Username
 * @param {number} limit - Maximum number of attempts to return
 * @returns {Promise<Array>} Array of login attempts
 */
async function getRecentAttempts(username, limit = 10) {
    if (!db) throw new Error('Account lockout not initialized');
    
    try {
        const rows = await db.all(
            `SELECT ip_address, success, attempted_at, user_agent 
             FROM login_attempts 
             WHERE username = ? 
             ORDER BY attempted_at DESC 
             LIMIT ?`,
            [username, limit]
        );
        return rows || [];
    } catch (err) {
        console.error('Error getting recent attempts:', err);
        throw err;
    }
}

/**
 * Clean up old login attempts (older than 24 hours)
 * Should be run periodically
 * 
 * @returns {Promise<number>} Number of deleted records
 */
async function cleanupOldAttempts() {
    if (!db) throw new Error('Account lockout not initialized');
    
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    try {
        const result = await db.run(
            `DELETE FROM login_attempts WHERE attempted_at < ?`,
            [cutoffTime]
        );
        
        if (result.changes > 0) {
            console.log(`🧹 Cleaned up ${result.changes} old login attempts`);
        }
        return result.changes;
    } catch (err) {
        console.error('Error cleaning up old attempts:', err);
        throw err;
    }
}

/**
 * Get lockout statistics
 * 
 * @returns {Promise<Object>} Lockout statistics
 */
async function getLockoutStats() {
    if (!db) throw new Error('Account lockout not initialized');
    
    try {
        const stats = await db.all(
            `SELECT 
                COUNT(*) as total_attempts,
                SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_attempts,
                SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_attempts,
                COUNT(DISTINCT username) as unique_users,
                COUNT(DISTINCT ip_address) as unique_ips
             FROM login_attempts
             WHERE attempted_at > datetime('now', '-24 hours')`,
            []
        );
        
        const lockedRow = await db.get(
            `SELECT COUNT(*) as locked_accounts 
             FROM users 
             WHERE account_locked = 1 AND locked_until > datetime('now')`,
            []
        );
        
        return {
            ...stats[0],
            locked_accounts: lockedRow.locked_accounts
        };
    } catch (err) {
        console.error('Error getting lockout stats:', err);
        throw err;
    }
}

/**
 * Start automatic cleanup interval
 * Cleans up old login attempts every hour
 */
function startCleanupSchedule() {
    if (!db) {
        console.warn('⚠️  Account lockout cleanup scheduler requires initialization');
        return;
    }
    
    // Run cleanup immediately
    cleanupOldAttempts().catch(console.error);
    
    // Schedule hourly cleanup
    setInterval(() => {
        cleanupOldAttempts().catch(console.error);
    }, 60 * 60 * 1000); // 1 hour
    
    console.log('✅ Account lockout cleanup scheduler started');
}

module.exports = {
    initialize,
    recordLoginAttempt,
    getFailedAttempts,
    isAccountLocked,
    lockAccount,
    unlockAccount,
    unlockAccountById,
    resetFailedAttempts,
    getRecentAttempts,
    cleanupOldAttempts,
    getLockoutStats,
    startCleanupSchedule
};
