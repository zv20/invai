module.exports = {
  // Rate Limiting
  RATE_LIMIT: {
    WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    STRICT_WINDOW_MS: 60 * 1000, // 1 minute
    STRICT_MAX_REQUESTS: 5
  },

  // Backup Configuration
  MAX_BACKUPS: parseInt(process.env.MAX_BACKUPS) || 10,
  
  // GitHub
  GITHUB_REPO: process.env.GITHUB_REPO || 'zv20/invai',

  // Security
  BCRYPT_ROUNDS: 12,
  
  // Low Stock Thresholds
  LOW_STOCK_THRESHOLD: 10,
  
  // CSV Upload Limits
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  
  // Cache TTL (milliseconds)
  CACHE_TTL: {
    SHORT: 30000,    // 30 seconds
    MEDIUM: 60000,   // 1 minute
    LONG: 300000     // 5 minutes
  },

  // User Roles
  ROLES: {
    ADMIN: 'admin',
    USER: 'user',
    VIEWER: 'viewer'
  },

  // Protected Routes (require authentication)
  PROTECTED_ROUTES: [
    '/api/products',
    '/api/inventory',
    '/api/categories',
    '/api/suppliers',
    '/api/database/reset',
    '/api/backup',
    '/api/settings',
    '/api/import'
  ]
};