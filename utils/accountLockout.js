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

const db = require('./db');
const security = require('../config/security');

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
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO login_attempts (username, ip_address, success, user_agent) 
             VALUES (?, ?, ?, ?)`,
            [username, ipAddress, success ? 1 : 0, userAgent],
            (err) => {
                if (err) {
                    console.error('Error recording login attempt:', err);
                    return reject(err);
                }
                resolve();
            }
        );
    });
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
    return new Promise((resolve, reject) => {
        const config = security.lockout;
        
        if (!config.enabled) {
            return resolve(0);
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
        
        db.get(query, params, (err, row) => {
            if (err) {
                console.error('Error getting failed attempts:', err);
                return reject(err);
            }
            resolve(row.count || 0);
        });
    });
}

/**
 * Check if account is currently locked
 * 
 * @param {string} username - Username to check
 * @param {string} ipAddress - Optional IP address to check
 * @returns {Promise<Object>} Lock status { locked: boolean, remainingTime: number }
 */
async function isAccountLocked(username, ipAddress = null) {
    const config = security.lockout;
    
    if (!config.enabled) {
        return { locked: false, remainingTime: 0 };
    }
    
    return new Promise((resolve, reject) => {
        // Check if user has locked_until set and it's still in the future
        db.get(
            `SELECT account_locked, locked_until 
             FROM users 
             WHERE username = ?`,
            [username],
            async (err, row) => {
                if (err) {
                    console.error('Error checking account lock status:', err);
                    return reject(err);
                }
                
                if (!row) {
                    return resolve({ locked: false, remainingTime: 0 });
                }
                
                // Check if locked_until has passed
                if (row.locked_until) {
                    const lockedUntil = new Date(row.locked_until);
                    const now = new Date();
                    
                    if (lockedUntil > now) {
                        const remainingMs = lockedUntil - now;
                        return resolve({
                            locked: true,
                            remainingTime: Math.ceil(remainingMs / 1000), // seconds
                            unlocksAt: lockedUntil.toISOString()
                        });
                    } else {
                        // Lock has expired, unlock the account
                        await unlockAccount(username).catch(console.error);
                        return resolve({ locked: false, remainingTime: 0 });
                    }
                }
                
                // Check failed attempts count
                try {
                    const failedCount = await getFailedAttempts(username, ipAddress);
                    
                    if (failedCount >= config.maxAttempts) {
                        // Lock the account
                        await lockAccount(username);
                        
                        const remainingTime = config.lockoutDuration * 60; // seconds
                        return resolve({
                            locked: true,
                            remainingTime,
                            unlocksAt: new Date(Date.now() + remainingTime * 1000).toISOString()
                        });
                    }
                    
                    resolve({ locked: false, remainingTime: 0 });
                } catch (error) {
                    reject(error);
                }
            }
        );
    });
}

/**
 * Lock a user account
 * 
 * @param {string} username - Username to lock
 * @returns {Promise<void>}
 */
async function lockAccount(username) {
    return new Promise((resolve, reject) => {
        const config = security.lockout;
        const lockedUntil = new Date(Date.now() + config.lockoutDuration * 60 * 1000).toISOString();
        
        db.run(
            `UPDATE users 
             SET account_locked = 1, locked_until = ? 
             WHERE username = ?`,
            [lockedUntil, username],
            (err) => {
                if (err) {
                    console.error('Error locking account:', err);
                    return reject(err);
                }
                console.log(`🔒 Account locked: ${username} until ${lockedUntil}`);
                resolve();
            }
        );
    });
}

/**
 * Unlock a user account (manual or automatic)
 * 
 * @param {string} username - Username to unlock
 * @returns {Promise<void>}
 */
async function unlockAccount(username) {
    return new Promise((resolve, reject) => {
        db.run(
            `UPDATE users 
             SET account_locked = 0, locked_until = NULL 
             WHERE username = ?`,
            [username],
            (err) => {
                if (err) {
                    console.error('Error unlocking account:', err);
                    return reject(err);
                }
                console.log(`🔓 Account unlocked: ${username}`);
                resolve();
            }
        );
    });
}

/**
 * Unlock account by user ID (admin function)
 * 
 * @param {number} userId - User ID to unlock
 * @returns {Promise<void>}
 */
async function unlockAccountById(userId) {
    return new Promise((resolve, reject) => {
        db.run(
            `UPDATE users 
             SET account_locked = 0, locked_until = NULL 
             WHERE id = ?`,
            [userId],
            (err) => {
                if (err) {
                    console.error('Error unlocking account by ID:', err);
                    return reject(err);
                }
                console.log(`🔓 Account unlocked: User ID ${userId}`);
                resolve();
            }
        );
    });
}

/**
 * Reset failed login attempts for a user (after successful login)
 * 
 * @param {string} username - Username
 * @returns {Promise<void>}
 */
async function resetFailedAttempts(username) {
    return new Promise((resolve, reject) => {
        db.run(
            `DELETE FROM login_attempts 
             WHERE username = ? AND success = 0`,
            [username],
            (err) => {
                if (err) {
                    console.error('Error resetting failed attempts:', err);
                    return reject(err);
                }
                resolve();
            }
        );
    });
}

/**
 * Get recent login attempts for a user (for audit/display)
 * 
 * @param {string} username - Username
 * @param {number} limit - Maximum number of attempts to return
 * @returns {Promise<Array>} Array of login attempts
 */
async function getRecentAttempts(username, limit = 10) {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT ip_address, success, attempted_at, user_agent 
             FROM login_attempts 
             WHERE username = ? 
             ORDER BY attempted_at DESC 
             LIMIT ?`,
            [username, limit],
            (err, rows) => {
                if (err) {
                    console.error('Error getting recent attempts:', err);
                    return reject(err);
                }
                resolve(rows || []);
            }
        );
    });
}

/**
 * Clean up old login attempts (older than 24 hours)
 * Should be run periodically
 * 
 * @returns {Promise<number>} Number of deleted records
 */
async function cleanupOldAttempts() {
    return new Promise((resolve, reject) => {
        const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
        db.run(
            `DELETE FROM login_attempts WHERE attempted_at < ?`,
            [cutoffTime],
            function(err) {
                if (err) {
                    console.error('Error cleaning up old attempts:', err);
                    return reject(err);
                }
                
                if (this.changes > 0) {
                    console.log(`🧹 Cleaned up ${this.changes} old login attempts`);
                }
                resolve(this.changes);
            }
        );
    });
}

/**
 * Get lockout statistics
 * 
 * @returns {Promise<Object>} Lockout statistics
 */
async function getLockoutStats() {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT 
                COUNT(*) as total_attempts,
                SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_attempts,
                SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_attempts,
                COUNT(DISTINCT username) as unique_users,
                COUNT(DISTINCT ip_address) as unique_ips
             FROM login_attempts
             WHERE attempted_at > datetime('now', '-24 hours')`,
            [],
            (err, rows) => {
                if (err) {
                    console.error('Error getting lockout stats:', err);
                    return reject(err);
                }
                
                db.get(
                    `SELECT COUNT(*) as locked_accounts 
                     FROM users 
                     WHERE account_locked = 1 AND locked_until > datetime('now')`,
                    [],
                    (err2, lockedRow) => {
                        if (err2) {
                            console.error('Error getting locked accounts count:', err2);
                            return reject(err2);
                        }
                        
                        resolve({
                            ...rows[0],
                            locked_accounts: lockedRow.locked_accounts
                        });
                    }
                );
            }
        );
    });
}

/**
 * Start automatic cleanup interval
 * Cleans up old login attempts every hour
 */
function startCleanupSchedule() {
    // Run cleanup immediately
    cleanupOldAttempts().catch(console.error);
    
    // Schedule hourly cleanup
    setInterval(() => {
        cleanupOldAttempts().catch(console.error);
    }, 60 * 60 * 1000); // 1 hour
    
    console.log('✅ Account lockout cleanup scheduler started');
}

module.exports = {
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
