const dotenv = require('dotenv');
const path = require('path');
const JWTManager = require('../lib/jwt-manager');

// Initialize JWT Manager and auto-generate secret if needed
const jwtManager = new JWTManager();
const jwtSecret = jwtManager.initialize();

// Load environment variables (after JWT is generated)
dotenv.config();

// Override JWT_SECRET with generated one if it was just created
if (jwtSecret) {
  process.env.JWT_SECRET = jwtSecret;
}

// Validate JWT_SECRET exists now
if (!process.env.JWT_SECRET) {
  console.error('\u274c FATAL: JWT_SECRET could not be initialized');
  process.exit(1);
}

// Validate JWT_SECRET strength
if (process.env.JWT_SECRET.length < 32) {
  console.error('\u274c FATAL: JWT_SECRET is too short (minimum 32 characters)');
  console.error('   Run: npm run jwt:generate\n');
  process.exit(1);
}

// Validate NODE_ENV
const validEnvironments = ['development', 'production', 'test'];
if (process.env.NODE_ENV && !validEnvironments.includes(process.env.NODE_ENV)) {
  console.warn(`⚠️  WARNING: Invalid NODE_ENV "${process.env.NODE_ENV}". Using "development".`);
  process.env.NODE_ENV = 'development';
}

module.exports = {
  PORT: parseInt(process.env.PORT) || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  SESSION_SECRET: process.env.SESSION_SECRET || process.env.JWT_SECRET,
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  DATABASE_PATH: process.env.DATABASE_PATH || './inventory.db',
  BACKUP_DIR: process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups'),
  LOG_DIR: process.env.LOG_DIR || path.join(__dirname, '..', 'logs'),
  LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};
