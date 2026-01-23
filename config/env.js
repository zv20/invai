const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'JWT_SECRET'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\n💡 Copy .env.example to .env and configure the values.\n');
  process.exit(1);
}

// Validate JWT_SECRET strength
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.warn('⚠️  WARNING: JWT_SECRET should be at least 32 characters long');
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
