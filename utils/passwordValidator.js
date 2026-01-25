/**
 * Password Validator
 * 
 * Sprint 3 Phase 2: Password Policies & Account Lockout
 * 
 * Comprehensive password validation including:
 * - Complexity requirements
 * - Common password checking
 * - Password strength meter
 * - Password history verification
 * 
 * @version 0.8.4a
 * @date 2026-01-25
 */

const bcrypt = require('bcryptjs');
const security = require('../config/security');
const db = require('../lib/db');

/**
 * Top 10,000 most common passwords (truncated for brevity)
 * In production, load from external file or database
 */
const COMMON_PASSWORDS = new Set([
    'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', '1234567',
    'letmein', 'trustno1', 'dragon', 'baseball', 'iloveyou', 'master', 'sunshine',
    'ashley', 'bailey', 'passw0rd', 'shadow', '123123', '654321', 'superman',
    'qazwsx', 'michael', 'Football', 'password1', '1234567890', 'welcome', 'admin',
    'administrator', 'login', 'root', 'toor', 'pass', 'test', 'guest', 'user',
    'changeme', 'password123', '12345', '123456789', 'princess', 'azerty', '000000',
    'starwars', 'charlie', 'aa123456', 'donald', 'zxcvbnm', 'computer', 'michelle',
    'jessica', 'pepper', '111111', '11111111', 'Password1!', 'password1!', 'abc123!',
    'welcome1', 'password!', 'Passw0rd', 'Welcome123', 'Qwerty123', 'Password123'
]);

/**
 * Password Strength Levels
 */
const STRENGTH_LEVELS = {
    WEAK: { score: 0, label: 'Weak', color: 'red' },
    FAIR: { score: 1, label: 'Fair', color: 'orange' },
    GOOD: { score: 2, label: 'Good', color: 'yellow' },
    STRONG: { score: 3, label: 'Strong', color: 'green' }
};

/**
 * Validate password complexity requirements
 * 
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with { valid: boolean, errors: string[], strength: object }
 */
function validatePasswordComplexity(password) {
    const errors = [];
    const config = security.password;
    
    // Check if enforcement is enabled
    if (!config.enforceComplexity) {
        return {
            valid: true,
            errors: [],
            strength: calculateStrength(password),
            warning: 'Password complexity enforcement is disabled'
        };
    }
    
    // Minimum length
    if (!password || password.length < config.minLength) {
        errors.push(`Password must be at least ${config.minLength} characters long`);
    }
    
    // Uppercase requirement
    if (config.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    
    // Lowercase requirement
    if (config.requireLowercase && !/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    
    // Number requirement
    if (config.requireNumbers && !/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    
    // Special character requirement
    if (config.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least one special character (!@#$%^&*)');
    }
    
    // Common password check
    if (COMMON_PASSWORDS.has(password.toLowerCase())) {
        errors.push('This password is too common. Please choose a more unique password');
    }
    
    // Sequential characters check (e.g., 123, abc)
    if (/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password)) {
        errors.push('Password should not contain sequential characters (e.g., abc, 123)');
    }
    
    // Repeated characters check (e.g., aaa, 111)
    if (/(.)\1{2,}/.test(password)) {
        errors.push('Password should not contain repeated characters (e.g., aaa, 111)');
    }
    
    return {
        valid: errors.length === 0,
        errors,
        strength: calculateStrength(password)
    };
}

/**
 * Calculate password strength score
 * 
 * @param {string} password - Password to evaluate
 * @returns {Object} Strength level object { score, label, color }
 */
function calculateStrength(password) {
    if (!password) return STRENGTH_LEVELS.WEAK;
    
    let score = 0;
    
    // Length scoring
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
    
    // Character variety scoring
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;
    
    // Bonus for mixing multiple character types
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    const varietyCount = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    
    if (varietyCount >= 3) score++;
    if (varietyCount === 4) score++;
    
    // Penalties
    if (COMMON_PASSWORDS.has(password.toLowerCase())) score -= 2;
    if (/(.)\1{2,}/.test(password)) score -= 1;
    
    // Normalize score to 0-3 range
    score = Math.max(0, Math.min(3, Math.floor(score / 3)));
    
    // Return strength level
    const levels = [STRENGTH_LEVELS.WEAK, STRENGTH_LEVELS.FAIR, STRENGTH_LEVELS.GOOD, STRENGTH_LEVELS.STRONG];
    return levels[score];
}

/**
 * Check if password has been used before (password history)
 * 
 * @param {number} userId - User ID
 * @param {string} newPassword - New password to check
 * @returns {Promise<boolean>} True if password was used before
 */
async function isPasswordInHistory(userId, newPassword) {
    return new Promise((resolve, reject) => {
        const historyCount = security.password.historyCount;
        
        // Get last N passwords from history
        db.all(
            `SELECT password_hash 
             FROM password_history 
             WHERE user_id = ? 
             ORDER BY created_at DESC 
             LIMIT ?`,
            [userId, historyCount],
            async (err, rows) => {
                if (err) {
                    console.error('Error checking password history:', err);
                    return reject(err);
                }
                
                // Check if new password matches any historical password
                for (const row of rows) {
                    const matches = await bcrypt.compare(newPassword, row.password_hash);
                    if (matches) {
                        return resolve(true);
                    }
                }
                
                resolve(false);
            }
        );
    });
}

/**
 * Add password to history
 * 
 * @param {number} userId - User ID
 * @param {string} passwordHash - Hashed password
 * @returns {Promise<void>}
 */
async function addPasswordToHistory(userId, passwordHash) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO password_history (user_id, password_hash) 
             VALUES (?, ?)`,
            [userId, passwordHash],
            function(err) {
                if (err) {
                    console.error('Error adding password to history:', err);
                    return reject(err);
                }
                
                // Clean up old history entries (keep only last N)
                cleanupPasswordHistory(userId).catch(console.error);
                
                resolve();
            }
        );
    });
}

/**
 * Clean up old password history entries
 * Keeps only the last N passwords as configured
 * 
 * @param {number} userId - User ID
 * @returns {Promise<void>}
 */
async function cleanupPasswordHistory(userId) {
    return new Promise((resolve, reject) => {
        const historyCount = security.password.historyCount;
        
        db.run(
            `DELETE FROM password_history 
             WHERE user_id = ? 
             AND id NOT IN (
                 SELECT id FROM password_history 
                 WHERE user_id = ? 
                 ORDER BY created_at DESC 
                 LIMIT ?
             )`,
            [userId, userId, historyCount],
            (err) => {
                if (err) {
                    console.error('Error cleaning up password history:', err);
                    return reject(err);
                }
                resolve();
            }
        );
    });
}

/**
 * Get password requirements for display
 * 
 * @returns {Object} Password requirements configuration
 */
function getPasswordRequirements() {
    const config = security.password;
    
    return {
        minLength: config.minLength,
        requireUppercase: config.requireUppercase,
        requireLowercase: config.requireLowercase,
        requireNumbers: config.requireNumbers,
        requireSpecialChars: config.requireSpecialChars,
        historyCount: config.historyCount,
        expirationDays: config.expirationDays,
        enforced: config.enforceComplexity
    };
}

module.exports = {
    validatePasswordComplexity,
    calculateStrength,
    isPasswordInHistory,
    addPasswordToHistory,
    cleanupPasswordHistory,
    getPasswordRequirements,
    STRENGTH_LEVELS
};
