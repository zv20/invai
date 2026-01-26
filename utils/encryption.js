/**
 * Encryption Utilities
 * AES-256-GCM encryption for sensitive session data
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

// Get encryption key from environment or generate random (won't persist across restarts)
let ENCRYPTION_KEY;

if (process.env.ENCRYPTION_KEY) {
  // Validate it's 64 hex characters (32 bytes)
  if (process.env.ENCRYPTION_KEY.length !== 64 || !/^[0-9a-f]{64}$/i.test(process.env.ENCRYPTION_KEY)) {
    console.error('❌ ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes)');
    console.error('Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    process.exit(1);
  }
  ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
} else {
  console.warn('⚠️  ENCRYPTION_KEY not set in .env - using random key');
  console.warn('⚠️  Sessions will not persist across server restarts!');
  console.warn('Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  ENCRYPTION_KEY = crypto.randomBytes(32);
}

/**
 * Encrypt text using AES-256-GCM
 * @param {string} text - Plain text to encrypt
 * @returns {object} - { encrypted, iv, authTag }
 */
function encrypt(text) {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt text using AES-256-GCM
 * @param {string} encrypted - Encrypted hex string
 * @param {string} iv - Initialization vector (hex)
 * @param {string} authTag - Authentication tag (hex)
 * @returns {string} - Decrypted plain text
 */
function decrypt(encrypted, iv, authTag) {
  try {
    const decipher = crypto.createDecipheriv(
      ALGORITHM, 
      ENCRYPTION_KEY, 
      Buffer.from(iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Generate a random encryption key
 * @returns {string} - 64 character hex string
 */
function generateKey() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash data using SHA-256
 * @param {string} data - Data to hash
 * @returns {string} - Hex hash
 */
function hash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

module.exports = { 
  encrypt, 
  decrypt, 
  generateKey,
  hash
};
