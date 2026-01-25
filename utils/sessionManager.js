/**
 * Session Manager
 * 
 * Handles database-backed session management with:
 * - Session creation and validation
 * - Activity tracking and timeout enforcement
 * - Concurrent session limits
 * - Automatic cleanup of expired sessions
 * 
 * Created: 2026-01-25
 */

const crypto = require('crypto');
const db = require('../config/database');
const securityConfig = require('../config/security');
const logger = require('./logger');

class SessionManager {
    constructor() {
        // Start cleanup interval when manager is initialized
        this.startCleanupInterval();
        logger.info('SessionManager initialized');
    }
    
    /**
     * Create new session for user
     * @param {number} userId - User ID
     * @param {string} ipAddress - Client IP address
     * @param {string} userAgent - Client user agent
     * @returns {Promise<string>} Session ID
     */
    async createSession(userId, ipAddress, userAgent) {
        const sessionId = this.generateSessionId();
        const expiresAt = new Date(
            Date.now() + securityConfig.session.timeout * 60 * 1000
        );
        
        // Check and enforce concurrent sessions limit
        await this.enforceSessionLimit(userId);
        
        // Insert session
        const query = `
            INSERT INTO user_sessions 
            (session_id, user_id, ip_address, user_agent, expires_at)
            VALUES (?, ?, ?, ?, ?)
        `;
        
        await db.run(query, [
            sessionId,
            userId,
            ipAddress || 'unknown',
            userAgent || 'unknown',
            expiresAt.toISOString()
        ]);
        
        logger.info(`Session created for user ${userId}`, {
            sessionId: sessionId.substring(0, 8) + '...',
            ipAddress,
            expiresAt: expiresAt.toISOString()
        });
        
        return sessionId;
    }
    
    /**
     * Validate and refresh session
     * @param {string} sessionId - Session ID to validate
     * @returns {Promise<Object|null>} Session data or null if invalid
     */
    async validateSession(sessionId) {
        if (!sessionId) {
            return null;
        }
        
        // Get session with user info
        const query = `
            SELECT 
                s.id,
                s.session_id,
                s.user_id,
                s.ip_address,
                s.user_agent,
                s.created_at,
                s.last_activity,
                s.expires_at,
                u.username,
                u.email,
                u.role,
                u.is_active
            FROM user_sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.session_id = ?
            AND s.is_active = 1
            AND s.expires_at > datetime('now')
        `;
        
        const session = await db.get(query, [sessionId]);
        
        if (!session) {
            return null;
        }
        
        // Check if user is still active
        if (!session.is_active) {
            await this.invalidateSession(sessionId, 'user_deactivated');
            return null;
        }
        
        // Check inactivity timeout
        const lastActivity = new Date(session.last_activity);
        const inactivityMinutes = (Date.now() - lastActivity) / 1000 / 60;
        
        if (inactivityMinutes > securityConfig.session.inactivityTimeout) {
            logger.info(`Session expired due to inactivity: ${sessionId.substring(0, 8)}...`);
            await this.invalidateSession(sessionId, 'inactivity_timeout');
            return null;
        }
        
        // Update last activity (throttle to avoid too many DB writes)
        // Only update if more than 1 minute since last update
        if (inactivityMinutes >= 1) {
            await this.updateActivity(sessionId);
        }
        
        return session;
    }
    
    /**
     * Update session activity timestamp
     * @param {string} sessionId - Session ID
     * @returns {Promise<void>}
     */
    async updateActivity(sessionId) {
        const query = `
            UPDATE user_sessions
            SET last_activity = datetime('now')
            WHERE session_id = ?
        `;
        
        await db.run(query, [sessionId]);
    }
    
    /**
     * Invalidate (deactivate) a session
     * @param {string} sessionId - Session ID to invalidate
     * @param {string} reason - Reason for invalidation
     * @returns {Promise<void>}
     */
    async invalidateSession(sessionId, reason = 'logout') {
        const query = `
            UPDATE user_sessions
            SET is_active = 0
            WHERE session_id = ?
        `;
        
        await db.run(query, [sessionId]);
        
        logger.info(`Session invalidated: ${sessionId.substring(0, 8)}...`, { reason });
    }
    
    /**
     * Invalidate all sessions for a user
     * @param {number} userId - User ID
     * @param {string} exceptSessionId - Session ID to keep active (optional)
     * @returns {Promise<void>}
     */
    async invalidateAllUserSessions(userId, exceptSessionId = null) {
        let query = `
            UPDATE user_sessions
            SET is_active = 0
            WHERE user_id = ?
        `;
        
        const params = [userId];
        
        if (exceptSessionId) {
            query += ' AND session_id != ?';
            params.push(exceptSessionId);
        }
        
        const result = await db.run(query, params);
        
        logger.info(`Invalidated ${result.changes} sessions for user ${userId}`);
    }
    
    /**
     * Enforce concurrent session limit
     * When limit is reached, invalidates oldest session
     * @param {number} userId - User ID
     * @returns {Promise<void>}
     */
    async enforceSessionLimit(userId) {
        const limit = securityConfig.session.maxConcurrentSessions;
        
        // Get active session count
        const countQuery = `
            SELECT COUNT(*) as count
            FROM user_sessions
            WHERE user_id = ?
            AND is_active = 1
            AND expires_at > datetime('now')
        `;
        
        const result = await db.get(countQuery, [userId]);
        
        if (result.count >= limit) {
            // Invalidate oldest session
            const deleteQuery = `
                UPDATE user_sessions
                SET is_active = 0
                WHERE id = (
                    SELECT id FROM user_sessions
                    WHERE user_id = ? 
                    AND is_active = 1
                    AND expires_at > datetime('now')
                    ORDER BY created_at ASC
                    LIMIT 1
                )
            `;
            
            await db.run(deleteQuery, [userId]);
            
            logger.info(`Session limit enforced for user ${userId}, oldest session removed`);
        }
    }
    
    /**
     * Cleanup expired and old inactive sessions
     * @returns {Promise<void>}
     */
    async cleanupExpiredSessions() {
        try {
            // Delete sessions that are:
            // 1. Expired for more than 7 days
            // 2. Inactive and last activity was more than 1 day ago
            const query = `
                DELETE FROM user_sessions
                WHERE expires_at < datetime('now', '-7 days')
                OR (is_active = 0 AND last_activity < datetime('now', '-1 day'))
            `;
            
            const result = await db.run(query);
            
            if (result.changes > 0) {
                logger.info(`Session cleanup: removed ${result.changes} old sessions`);
            }
        } catch (error) {
            logger.error('Session cleanup failed:', error);
        }
    }
    
    /**
     * Start periodic cleanup interval
     */
    startCleanupInterval() {
        const interval = securityConfig.session.cleanupInterval * 60 * 1000;
        
        setInterval(() => {
            this.cleanupExpiredSessions();
        }, interval);
        
        logger.info(`Session cleanup scheduled every ${securityConfig.session.cleanupInterval} minutes`);
    }
    
    /**
     * Generate secure random session ID
     * @returns {string} Session ID
     */
    generateSessionId() {
        return crypto.randomBytes(32).toString('hex');
    }
    
    /**
     * Get all active sessions for a user
     * @param {number} userId - User ID
     * @returns {Promise<Array>} Array of active sessions
     */
    async getUserSessions(userId) {
        const query = `
            SELECT 
                session_id,
                ip_address,
                user_agent,
                created_at,
                last_activity,
                expires_at
            FROM user_sessions
            WHERE user_id = ?
            AND is_active = 1
            AND expires_at > datetime('now')
            ORDER BY last_activity DESC
        `;
        
        return await db.all(query, [userId]);
    }
    
    /**
     * Get session statistics
     * @returns {Promise<Object>} Session statistics
     */
    async getStatistics() {
        const stats = await db.get(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN is_active = 1 AND expires_at > datetime('now') THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive,
                SUM(CASE WHEN expires_at <= datetime('now') THEN 1 ELSE 0 END) as expired
            FROM user_sessions
        `);
        
        return stats;
    }
}

// Export singleton instance
module.exports = new SessionManager();
