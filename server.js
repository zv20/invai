/**
 * InvAI Server - Sprint 6: Mobile & PWA Integration
 * 
 * Enhanced with:
 * - PWA support with push notifications
 * - Mobile-optimized routes
 * - CRITICAL SECURITY PATCHES (12 major fixes)
 * - Sprint 5 BI features (analytics, predictions, search, dashboards)
 * - Sprint 4 database & backup features
 * - Sprint 3 enhanced security
 * - Sprint 2 authentication & RBAC
 * 
 * Architecture:
 * - Core modular routes (products, batches, categories, suppliers, dashboard, settings, auth, users)
 * - Business Intelligence routes (analytics, predictions, search, dashboards)
 * - Mobile & PWA routes (notifications, offline sync)
 * - Supporting routes (reports, inventory-helpers, backups, system, import-export, version)
 * - Async/await throughout
 * - JWT authentication and authorization
 * - Security headers (Helmet.js)
 * - CSRF protection
 * - Database adapter system
 */

// Load environment variables FIRST
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const https = require('https');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

// ===================================
// CRITICAL SECURITY PATCH 1: JWT_SECRET Validation
// ===================================
if (!process.env.JWT_SECRET || 
    process.env.JWT_SECRET.length < 64 || 
    process.env.JWT_SECRET === 'your-secret-key-here-change-this-in-production' ||
    process.env.JWT_SECRET.includes('your_jwt_secret_here')) {
  console.error('\n❌ CRITICAL: JWT_SECRET must be at least 64 characters of random data!');
  console.error('Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"\n');
  process.exit(1);
}

// ===================================
// CRITICAL SECURITY PATCH 6: Input Sanitization
// ===================================
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

// ===================================
// CRITICAL SECURITY PATCH 10: HTTPS Enforcement
// ===================================
const httpsRedirect = require('./middleware/httpsRedirect');
const { enforceHSTS } = require('./middleware/httpsRedirect');

// ===================================
// CRITICAL SECURITY PATCH 12: Security Validation
// ===================================
const { 
  validateSecurityHeaders, 
  validateOrigin, 
  preventPathTraversal 
} = require('./middleware/securityValidation');

// ===================================
// CRITICAL SECURITY PATCH 8: Rate Limiting
// ===================================
const { apiLimiter } = require('./middleware/rateLimitConfig');

// Database adapter system
const { getDatabase, closeDatabase } = require('./lib/database');

// Architecture imports
const Database = require('./utils/db');
const { errorHandler } = require('./middleware/errorHandler');
const asyncHandler = require('./middleware/asyncHandler');
const { authenticate, authorize } = require('./middleware/auth');
const accountLockout = require('./utils/accountLockout');
const { generateCsrfToken, validateCsrfToken } = require('./middleware/csrf');

// Core route modules
const productRoutes = require('./routes/products');
const batchRoutes = require('./routes/batches');
const categoryRoutes = require('./routes/categories');
const supplierRoutes = require('./routes/suppliers');
const dashboardRoutes = require('./routes/dashboard');
const settingsRoutes = require('./routes/settings');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');

// Sprint 5: Business Intelligence routes
const analyticsRoutes = require('./routes/analytics');
const predictionsRoutes = require('./routes/predictions');
const searchRoutes = require('./routes/search');
const dashboardsRoutes = require('./routes/dashboards');

// Sprint 6: Mobile & PWA routes
const notificationsRoutes = require('./routes/notifications');

// Supporting route modules
const reportsRoutes = require('./routes/reports');
const inventoryHelpersRoutes = require('./routes/inventory-helpers');
const backupsRoutes = require('./routes/backups');
const systemRoutes = require('./routes/system');
const importExportRoutes = require('./routes/import-export');
const versionRoutes = require('./routes/version'); // ADDED

// Supporting modules
const MigrationRunner = require('./migrations/migration-runner');
const ActivityLogger = require('./lib/activity-logger');
const CSVExporter = require('./lib/csv-export');
const CacheManager = require('./lib/cache-manager');

const packageJson = require('./package.json');
const app = express();
const PORT = process.env.PORT || 3000;
const VERSION = packageJson.version;
const GITHUB_REPO = 'zv20/invai';
const BACKUP_DIR = path.join(__dirname, 'backups');
const MAX_BACKUPS = 10;

// Initialize modules
const cache = new CacheManager();
let activityLogger;
let csvExporter;
let dbAdapter; // Database adapter (SQLite or PostgreSQL)
let db; // Database interface for routes

const DB_TYPE = (process.env.DATABASE_TYPE || 'sqlite').toLowerCase();

console.log('\n🚀 InvAI v' + VERSION + ' - Sprint 6: Mobile & PWA');
console.log('✅ Progressive Web App (PWA) support');
console.log('✅ Push notifications enabled');
console.log('✅ Mobile-optimized UI');
console.log('✅ Offline mode with IndexedDB');
console.log('✅ Barcode scanner ready');
console.log('✅ Sprint 5 BI features (analytics, predictions, search, dashboards)');
console.log('✅ Database adapter system active');
console.log('✅ JWT authentication enabled');
console.log('🔒 CRITICAL SECURITY PATCHES APPLIED (12 major fixes)');
console.log('✅ Security headers active (Helmet.js)');
console.log('✅ CSRF protection enabled');
console.log(`📊 Database: ${DB_TYPE.toUpperCase()}\n`);

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: 'logs/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    }),
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d'
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Ensure directories exist
const ensureDirectories = () => {
  const dirs = [
    path.join(__dirname, 'logs'),
    BACKUP_DIR,
    path.join(__dirname, 'temp'),
    path.join(__dirname, 'data')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${path.basename(dir)}`);
    }
  });
};

ensureDirectories();

// ===================================
// TRUST PROXY CONFIGURATION
// ===================================
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', true);
  console.log('✓ Trust proxy enabled for reverse proxy support');
}

// ===================================
// SECURITY MIDDLEWARE
// ===================================

// PATCH 10: HTTPS Redirect (disabled when behind proxy)
if (process.env.NODE_ENV === 'production' && !process.env.BEHIND_PROXY) {
  app.use(httpsRedirect);
  app.use(enforceHSTS);
}

// ===================================
// FIX #11 & #15: IMPROVED CSP CONFIGURATION
// Status:
// - scriptSrcAttr: 'none' ✅ (FIXED - blocks inline event handlers)
// - styleSrc: 'unsafe-inline' ⚠️ (TODO - requires moving inline styles to CSS files)
// - scriptSrc: 'unsafe-inline' ⚠️ (ACCEPTABLE - for initialization scripts)
// ===================================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // TODO #11: Move inline styles to external CSS files
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"], // Allow unpkg for QR scanner library
      scriptSrcAttr: ["'none'"], // ✅ FIXED #15: Block ALL inline event handlers (onclick, onchange, etc)
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

console.log('🔒 CSP Configuration:');
console.log('   ✅ scriptSrcAttr: \'none\' (FIXED #15 - inline handlers blocked)');
console.log('   ✅ Event delegation system active (event-handlers.js)');
console.log('   ⚠️  styleSrc: \'unsafe-inline\' (TODO #11 - requires CSS refactor)');
console.log('   ℹ️  scriptSrc: \'unsafe-inline\' (acceptable for initialization)\n');

// PATCH 4: Fix Wide-Open CORS
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ? 
    process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()) : 
    ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
};
app.use(cors(corsOptions));

// PATCH 5: Add Request Size Limits
app.use(express.json({ limit: '1mb' })); // Added limit
app.use(express.urlencoded({ extended: true, limit: '1mb' })); // Added
app.use(express.text({ limit: '5mb', type: 'text/csv' })); // Reduced from 10mb
app.use(cookieParser());

// PATCH 6: Input Sanitization
app.use(mongoSanitize()); // Prevent NoSQL injection (also helps with SQL)
app.use(xss()); // Prevent XSS attacks

// PATCH 12: Security Validation
app.use(validateOrigin);
app.use(preventPathTraversal);
app.use(validateSecurityHeaders);

// CSRF Protection
app.use(generateCsrfToken);
app.use(validateCsrfToken);

// PATCH 8: API Rate Limiting
app.use('/api', apiLimiter);

// Static files
app.use('/css', express.static(path.join(__dirname, 'public/css'), { maxAge: 0, etag: false }));
app.use('/js', express.static(path.join(__dirname, 'public/js'), { maxAge: 0, etag: false }));
app.use('/lib', express.static(path.join(__dirname, 'public/lib'), { maxAge: 0, etag: false }));
app.use(express.static('public', { maxAge: 0, etag: false }));

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: VERSION,
    database: DB_TYPE,
    pwa: process.env.PWA_ENABLED === 'true',
    securityPatches: 12,
    cspStatus: {
      scriptSrcAttr: 'none',
      eventDelegation: 'active',
      issues: ['#11 - styleSrc unsafe-inline (TODO)', '#15 - FIXED']
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');
  
  html = html.replace(/href="css\/styles\.css"/g, `href="css/styles.css?v=${VERSION}`);
  html = html.replace(/src="js\/(\w+)\.js"/g, `src="js/$1.js?v=${VERSION}`);
  
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.send(html);
});

// Initialize database
async function initializeApp() {
  try {
    console.log('\n🔌 Connecting to database...');
    
    // Get database adapter (auto-selects SQLite or PostgreSQL)
    dbAdapter = await getDatabase();
    console.log(`✓ Connected to ${dbAdapter.getType().toUpperCase()} database`);
    
    // dbAdapter already has async methods (get, run, all), use it directly
    db = dbAdapter;
    
    await initializeDatabase();
    
    // Initialize supporting modules with database instance
    activityLogger = new ActivityLogger(dbAdapter.db || dbAdapter);
    csvExporter = new CSVExporter(dbAdapter.db || dbAdapter);
    
    // Initialize account lockout manager with db instance
    accountLockout.initialize(db);
    
    // Start account lockout cleanup scheduler
    accountLockout.startCleanupSchedule();
    
    logger.info('Supporting modules initialized');
    console.log('✓ Activity logger and CSV exporter initialized');
    console.log('✓ Account lockout manager initialized');
    
    // Create default admin user if none exists
    await createDefaultAdmin();
    
    registerRoutes();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`\n🎉 InvAI v${VERSION} - Sprint 6: Mobile & PWA`);
      console.log(`💻 Server running on port ${PORT}`);
      console.log(`🔗 Access at http://localhost:${PORT}`);
      console.log(`\n💾 Database: ${dbAdapter.getType().toUpperCase()}`);
      console.log(`🔒 Auth: JWT tokens with role-based access`);
      console.log(`🔒 Security: 12 critical patches applied`);
      console.log(`🔒 CSP: scriptSrcAttr 'none' (inline handlers blocked)`);
      console.log(`📱 PWA: ${process.env.PWA_ENABLED === 'true' ? 'Enabled' : 'Disabled'}`);
      console.log(`🔔 Push Notifications: ${process.env.PUSH_NOTIFICATIONS_ENABLED === 'true' ? 'Enabled' : 'Disabled'}`);
      console.log(`💡 Update channel: ${getCurrentChannel()}`);
      console.log('\nChecking for updates from GitHub...');
      
      const currentChannel = getCurrentChannel();
      const targetBranch = currentChannel === 'stable' ? 'main' : 'beta';
      
      checkGitHubVersion(targetBranch)
        .then(info => {
          if (info.updateAvailable) {
            console.log(`\n⚠️  UPDATE AVAILABLE!`);
            console.log(`   Current: ${info.currentVersion}`);
            console.log(`   Latest:  ${info.latestVersion}`);
            console.log(`   Channel: ${currentChannel}`);
            console.log(`   Branch:  ${targetBranch}\n`);
          } else {
            console.log(`✓ Running latest version (${VERSION}) on ${currentChannel} channel`);
          }
        })
        .catch(err => { 
          console.log(`Could not check for updates: ${err.message}`); 
        });
    });
    
  } catch (error) {
    console.error('\n❌ Failed to initialize application:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

async function createDefaultAdmin() {
  try {
    const bcrypt = require('bcryptjs');
    const users = await dbAdapter.all('SELECT * FROM users LIMIT 1');
    
    if (users.length === 0) {
      console.log('\n👤 Creating default admin user...');
      const hashedPassword = await bcrypt.hash('admin', 10);
      
      // FIX: Set role='admin' to ensure proper permissions on first login
      await dbAdapter.run(
        'INSERT INTO users (username, password, email, role, is_active) VALUES (?, ?, ?, ?, 1)',
        ['admin', hashedPassword, 'admin@invai.local', 'admin']
      );
      
      console.log('✅ Default admin user created');
      console.log('   Username: admin');
      console.log('   Password: admin');
      console.log('   Role: admin');
      console.log('   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY!\n');
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
}

function registerRoutes() {
  // Authentication & User Management
  app.use('/api/auth', authRoutes(db, logger));
  app.use('/api/users', userRoutes(db, activityLogger));
  
  // Version checking (public endpoint)
  app.use('/api/version', versionRoutes); // ADDED
  
  // Core Inventory Management
  app.use('/api/products', authenticate, productRoutes(db, activityLogger, cache));
  app.use('/api/batches', authenticate, batchRoutes(db, activityLogger));
  app.use('/api/inventory/batches', authenticate, batchRoutes(db, activityLogger));
  app.use('/api/categories', authenticate, categoryRoutes(db, activityLogger));
  app.use('/api/suppliers', authenticate, supplierRoutes(db, activityLogger));
  app.use('/api/dashboard', authenticate, dashboardRoutes(db, cache));
  app.use('/api/settings', authenticate, authorize('admin'), settingsRoutes(db, createBackup));
  app.use('/api/reports', authenticate, reportsRoutes(db, cache, csvExporter));
  app.use('/api/inventory', authenticate, inventoryHelpersRoutes(db));
  
  // Sprint 5: Business Intelligence
  app.use('/api/analytics', authenticate, analyticsRoutes(db, cache));
  app.use('/api/predictions', authenticate, predictionsRoutes(db, cache));
  app.use('/api/search', authenticate, searchRoutes(db));
  app.use('/api/saved-searches', authenticate, searchRoutes(db));
  app.use('/api/dashboards', authenticate, dashboardsRoutes(db));
  app.use('/api/widgets', authenticate, dashboardsRoutes(db));
  
  // Sprint 6: Mobile & PWA
  app.use('/api/notifications', authenticate, notificationsRoutes(db, logger));
  
  // System & Admin
  app.use('/api/backup', authenticate, backupsRoutes(createBackup, dbAdapter.db || dbAdapter, Database));
  app.use('/api', systemRoutes(db, logger, VERSION, MigrationRunner, dbAdapter.db || dbAdapter, checkGitHubVersion, getCurrentChannel));
  app.use('/api', authenticate, importExportRoutes(db, activityLogger, logger));
  
  console.log('✓ All routes registered');
  console.log('  - Core: products, batches, categories, suppliers, dashboard');
  console.log('  - Sprint 5 BI: analytics, predictions, search, dashboards');
  console.log('  - Sprint 6 Mobile: notifications, PWA');
  console.log('  - System: auth, users, reports, backups, import/export, version');
}

async function initializeDatabase() {
  try {
    console.log('\n🔧 Checking database migrations...');
    
    const migrator = new MigrationRunner(dbAdapter);
    await migrator.initialize();
    
    const currentVersion = await migrator.getCurrentVersion();
    console.log(`📊 Current schema version: ${currentVersion}`);
    
    const result = await migrator.runPendingMigrations(createBackup);
    
    if (result.migrationsRun > 0) {
      console.log(`✅ ${result.message}\n`);
    } else {
      console.log(`✓ ${result.message}\n`);
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    console.log('\n⚠️  Application cannot start with failed migration.');
    console.log('💡 Check logs above for details or restore from backup.\n');
    throw error;
  }
}

// FIXED: Handle undefined/null prefix properly
function createBackup(prefix = '') {
  return new Promise((resolve, reject) => {
    // Only SQLite supports file-based backups currently
    if (dbAdapter.getType() !== 'sqlite') {
      console.log('   ℹ️  Backup skipped (PostgreSQL uses external backup solutions)');
      resolve({ filename: 'n/a', path: 'n/a' });
      return;
    }
    
    // FIXED: Sanitize prefix - convert undefined/null to empty string
    const cleanPrefix = (prefix && typeof prefix === 'string' && prefix !== 'undefined') ? prefix : '';
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
    const backupName = cleanPrefix ? `backup_${cleanPrefix}_${timestamp}.db` : `backup_${timestamp}.db`;
    const backupPath = path.join(BACKUP_DIR, backupName);
    const dbPath = process.env.DATABASE_FILENAME || path.join(__dirname, 'data/inventory.db');
    
    fs.copyFile(dbPath, backupPath, (err) => {
      if (err) {
        reject(err);
      } else {
        cleanupOldBackups();
        resolve({ filename: backupName, path: backupPath });
      }
    });
  });
}

function cleanupOldBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('backup_') && file.endsWith('.db'))
      .map(file => ({
        name: file,
        path: path.join(BACKUP_DIR, file),
        time: fs.statSync(path.join(BACKUP_DIR, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);
    
    if (files.length > MAX_BACKUPS) {
      const toDelete = files.slice(MAX_BACKUPS);
      toDelete.forEach(file => {
        fs.unlinkSync(file.path);
        console.log(`Deleted old backup: ${file.name}`);
      });
    }
  } catch (err) {
    console.error('Error cleaning up backups:', err);
  }
}

function checkGitHubVersion(branch = 'main') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_REPO}/commits/${branch}`,
      method: 'GET',
      headers: { 'User-Agent': 'Grocery-Inventory-App' }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const commit = JSON.parse(data);
          const pkgOptions = {
            hostname: 'raw.githubusercontent.com',
            path: `/${GITHUB_REPO}/${branch}/package.json`,
            method: 'GET',
            headers: { 'User-Agent': 'Grocery-Inventory-App' }
          };
          const pkgReq = https.request(pkgOptions, (pkgRes) => {
            let pkgData = '';
            pkgRes.on('data', (chunk) => { pkgData += chunk; });
            pkgRes.on('end', () => {
              try {
                const pkg = JSON.parse(pkgData);
                resolve({
                  latestVersion: pkg.version,
                  currentVersion: VERSION,
                  updateAvailable: pkg.version !== VERSION,
                  commitSha: commit.sha ? commit.sha.substring(0, 7) : 'unknown',
                  commitDate: commit.commit ? commit.commit.author.date : null
                });
              } catch (err) { reject(err); }
            });
          });
          pkgReq.on('error', reject);
          pkgReq.end();
        } catch (err) { reject(err); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function getCurrentChannel() {
  try {
    const channelFile = path.join(__dirname, '.update-channel');
    if (fs.existsSync(channelFile)) {
      return fs.readFileSync(channelFile, 'utf8').trim();
    }
  } catch (err) {
    console.error('Error reading channel file:', err);
  }
  return 'stable';
}

app.use(errorHandler);

process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  try {
    await closeDatabase();
    console.log('✓ Database connection closed');
  } catch (err) {
    console.error('Error closing database:', err);
  }
  process.exit(0);
});

// Start the application
initializeApp();