/**
 * Password Validator
 * Enhanced password complexity validation and history tracking
 */

const bcrypt = require('bcryptjs');

/**
 * Validate password complexity
 * Requirements:
 * - Minimum 12 characters (increased from 8)
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one number
 * - At least one special character
 * - No common patterns
 */
function validatePasswordComplexity(password) {
  const errors = [];
  
  // Length check - increased to 12
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }
  
  // Maximum length (prevent DoS)
  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }
  
  // Lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  // Uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  // Number
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  // Special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*()_+-=[]{};\':"|,.<>/?)');  }
  
  // Check for common patterns (case-insensitive)
  const commonPatterns = [
    'password',
    '12345',
    'qwerty',
    'admin',
    'letmein',
    'welcome',
    'monkey',
    'dragon',
    'master',
    'sunshine'
  ];
  
  const lowerPassword = password.toLowerCase();
  const foundPatterns = commonPatterns.filter(pattern => lowerPassword.includes(pattern));
  
  if (foundPatterns.length > 0) {
    errors.push(`Password contains common pattern(s): ${foundPatterns.join(', ')}`);
  }
  
  // Check for repeated characters (more than 3 in a row)
  if (/(.)\1{3,}/.test(password)) {
    errors.push('Password contains too many repeated characters');
  }
  
  // Check for sequential characters (e.g., 'abcd', '1234')
  const hasSequence = /(?:abcd|bcde|cdef|defg|efgh|fghi|ghij|hijk|ijkl|jklm|klmn|lmno|mnop|nopq|opqr|pqrs|qrst|rstu|stuv|tuvw|uvwx|vwxy|wxyz|0123|1234|2345|3456|4567|5678|6789)/i.test(password);
  if (hasSequence) {
    errors.push('Password contains sequential characters');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    strength: calculatePasswordStrength(password)
  };
}

/**
 * Calculate password strength score (0-100)
 */
function calculatePasswordStrength(password) {
  let score = 0;
  
  // Length bonus
  if (password.length >= 12) score += 20;
  if (password.length >= 16) score += 10;
  if (password.length >= 20) score += 10;
  
  // Character variety
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 15;
  
  // Multiple character types
  const charTypes = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  ].filter(Boolean).length;
  
  if (charTypes >= 3) score += 10;
  if (charTypes === 4) score += 5;
  
  // Penalize common patterns
  const commonPatterns = ['password', '12345', 'qwerty', 'admin'];
  if (commonPatterns.some(pattern => password.toLowerCase().includes(pattern))) {
    score -= 20;
  }
  
  // Penalize repeated characters
  if (/(.)\ 1{3,}/.test(password)) score -= 10;
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Check if password exists in user's password history
 * Prevents reuse of last 5 passwords
 */
async function isPasswordInHistory(userId, newPassword) {
  try {
    // Get database instance
    const Database = require('./db');
    const { getDatabase } = require('../lib/database');
    const dbAdapter = await getDatabase();
    const db = new Database(dbAdapter);
    
    // Get last 5 password hashes from history
    const history = await db.all(
      `SELECT password_hash 
       FROM password_history 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 5`,
      [userId]
    );
    
    // Check if new password matches any in history
    for (const record of history) {
      const match = await bcrypt.compare(newPassword, record.password_hash);
      if (match) {
        return true; // Password found in history
      }
    }
    
    return false; // Password not in history
  } catch (error) {
    console.error('Error checking password history:', error);
    // If there's an error, allow the password change (fail open)
    return false;
  }
}

/**
 * Add password to history
 * Keeps only last 5 passwords
 */
async function addPasswordToHistory(userId, passwordHash) {
  try {
    // Get database instance
    const Database = require('./db');
    const { getDatabase } = require('../lib/database');
    const dbAdapter = await getDatabase();
    const db = new Database(dbAdapter);
    
    // Add new password to history
    await db.run(
      `INSERT INTO password_history (user_id, password_hash, created_at) 
       VALUES (?, ?, CURRENT_TIMESTAMP)`,
      [userId, passwordHash]
    );
    
    // Keep only last 5 passwords
    await db.run(
      `DELETE FROM password_history 
       WHERE user_id = ? 
       AND id NOT IN (
         SELECT id FROM password_history 
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT 5
       )`,
      [userId, userId]
    );
    
  } catch (error) {
    console.error('Error adding password to history:', error);
    // Don't throw - this is not critical for password change
  }
}

/**
 * Get password strength label
 */
function getPasswordStrengthLabel(score) {
  if (score >= 80) return 'Strong';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Weak';
}

module.exports = {
  validatePasswordComplexity,
  calculatePasswordStrength,
  isPasswordInHistory,
  addPasswordToHistory,
  getPasswordStrengthLabel
};
