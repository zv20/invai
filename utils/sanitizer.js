/**
 * Input Sanitization Utilities
 * 
 * Sprint 3 Phase 3: Security Headers & CSRF Protection
 * 
 * Provides utilities for:
 * - HTML sanitization (XSS prevention)
 * - SQL injection prevention
 * - Input validation
 * - Safe string handling
 * 
 * @version 0.8.4a
 * @date 2026-01-25
 */

/**
 * Escape HTML special characters to prevent XSS attacks
 * 
 * @param {string} text - Text to escape
 * @returns {string} Escaped text safe for HTML insertion
 */
function escapeHtml(text) {
  if (typeof text !== 'string') {
    return text;
  }
  
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };
  
  return text.replace(/[&<>"'\/]/g, (char) => map[char]);
}

/**
 * Strip HTML tags from text
 * 
 * @param {string} text - Text containing HTML
 * @returns {string} Text with HTML tags removed
 */
function stripHtml(text) {
  if (typeof text !== 'string') {
    return text;
  }
  
  return text.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize user input for safe storage and display
 * 
 * @param {string} input - User input
 * @param {Object} options - Sanitization options
 * @param {boolean} options.allowHtml - Allow HTML tags (default: false)
 * @param {boolean} options.trim - Trim whitespace (default: true)
 * @param {number} options.maxLength - Maximum length (default: none)
 * @returns {string} Sanitized input
 */
function sanitizeInput(input, options = {}) {
  if (typeof input !== 'string') {
    return input;
  }
  
  let sanitized = input;
  
  // Trim whitespace
  if (options.trim !== false) {
    sanitized = sanitized.trim();
  }
  
  // Remove HTML tags unless explicitly allowed
  if (!options.allowHtml) {
    sanitized = stripHtml(sanitized);
  }
  
  // Enforce maximum length
  if (options.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }
  
  // Escape HTML if not allowing HTML
  if (!options.allowHtml) {
    sanitized = escapeHtml(sanitized);
  }
  
  return sanitized;
}

/**
 * Validate and sanitize email address
 * 
 * @param {string} email - Email address
 * @returns {Object} { valid: boolean, sanitized: string }
 */
function sanitizeEmail(email) {
  if (typeof email !== 'string') {
    return { valid: false, sanitized: '' };
  }
  
  const sanitized = email.trim().toLowerCase();
  
  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const valid = emailRegex.test(sanitized);
  
  return { valid, sanitized };
}

/**
 * Validate and sanitize username
 * 
 * @param {string} username - Username
 * @returns {Object} { valid: boolean, sanitized: string, errors: string[] }
 */
function sanitizeUsername(username) {
  if (typeof username !== 'string') {
    return { valid: false, sanitized: '', errors: ['Username must be a string'] };
  }
  
  const sanitized = username.trim();
  const errors = [];
  
  // Length validation
  if (sanitized.length < 3) {
    errors.push('Username must be at least 3 characters');
  }
  if (sanitized.length > 50) {
    errors.push('Username must be less than 50 characters');
  }
  
  // Character validation (alphanumeric, underscore, dash)
  if (!/^[a-zA-Z0-9_-]+$/.test(sanitized)) {
    errors.push('Username can only contain letters, numbers, underscore, and dash');
  }
  
  return {
    valid: errors.length === 0,
    sanitized,
    errors
  };
}

/**
 * Detect potential SQL injection patterns
 * Note: This is a basic check. Always use parameterized queries!
 * 
 * @param {string} input - Input to check
 * @returns {boolean} True if suspicious patterns detected
 */
function detectSqlInjection(input) {
  if (typeof input !== 'string') {
    return false;
  }
  
  const sqlPatterns = [
    /('|(\-\-)|(;)|(\|\|)|(\*))/i,
    /(union.*select)/i,
    /(insert.*into)/i,
    /(delete.*from)/i,
    /(drop.*table)/i,
    /(update.*set)/i,
    /(exec(ute)?\s+)/i
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
}

module.exports = {
  escapeHtml,
  stripHtml,
  sanitizeInput,
  sanitizeEmail,
  sanitizeUsername,
  detectSqlInjection
};