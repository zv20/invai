/**
 * InvAI Server - Phase 2.2 Modular Routes
 * 
 * Streamlined server with extracted routes
 * Reduced from 1,200+ lines to ~450 lines
 * 
 * Architecture:
 * - Core modular routes (products, batches, categories, suppliers, dashboard, settings, auth, users)
 * - New extracted routes (reports, inventory-helpers, backups, system, import-export)
 * - Async/await throughout
 * - JWT authentication and authorization
 */

// Load environment variables FIRST
require('dotenv').config();

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const https = require('https');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

// Validate JWT_SECRET
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-secret-key-here-change-this-in-production') {
  console.error('\n❌ ERROR: JWT_SECRET not configured properly!');
  console.error('Please set a secure JWT_SECRET in your .env file\n');
  process.exit(1);
}

// Architecture imports
const Database = require('./utils/db');
const { errorHandler } = require('./middleware/errorHandler');
const asyncHandler = require('./middleware/asyncHandler');
const { authenticate, authorize } = require('./middleware/auth');
const accountLockout = require('./utils/accountLockout');

// Core route modules
const productRoutes = require('./routes/products');
const batchRoutes = require('./routes/batches');
const categoryRoutes = require('./routes/categories');
const supplierRoutes = require('./routes/suppliers');
const dashboardRoutes = require('./routes/dashboard');
const settingsRoutes = require('./routes/settings');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');

// Extracted route modules (GROUP 2)
const reportsRoutes = require('./routes/reports');
const inventoryHelpersRoutes = require('./routes/inventory-helpers');
const backupsRoutes = require('./routes/backups');
const systemRoutes = require('./routes/system');
const importExportRoutes = require('./routes/import-export');

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
let db; // Database wrapper (async/await)
let sqliteDb; // Raw SQLite connection

console.log('\n🚀 InvAI v' + VERSION + ' - Phase 2.2 Modular Routes');
console.log('✅ Streamlined server.js (~450 lines)');
console.log('✅ Modular route architecture');
console.log('✅ JWT authentication enabled\n');

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
    path.join(__dirname, 'temp')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${path.basename(dir)}`);
    }
  });
};

ensureDirectories();

app.use(cors());
app.use(express.json());
app.use(express.text({ limit: '10mb', type: 'text/csv' }));

// Serve static files with cache busting
app.use('/css', express.static(path.join(__dirname, 'public/css'), {
  maxAge: 0,
  etag: false
}));

app.use('/js', express.static(path.join(__dirname, 'public/js'), {
  maxAge: 0,
  etag: false
}));

app.use(express.static('public', {
  maxAge: 0,
  etag: false
}));

// Health check endpoint (PUBLIC)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: VERSION,
    timestamp: new Date().toISOString()
  });
});

// Serve index.html with version-based cache busting
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');
  
  html = html.replace(/href="css\/styles\.css"/g, `href="css/styles.css?v=${VERSION}"`);
  html = html.replace(/src="js\/(\w+)\.js"/g, `src="js/$1.js?v=${VERSION}"`);
  
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.send(html);
});

// Initialize database
sqliteDb = new sqlite3.Database('./inventory.db', async (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  } else {
    console.log('Connected to SQLite database');
    
    db = new Database(sqliteDb);
    
    await initializeDatabase();
    
    activityLogger = new ActivityLogger(sqliteDb);
    csvExporter = new CSVExporter(sqliteDb);
    
    // Start account lockout cleanup scheduler
    accountLockout.startCleanupSchedule();
    
    logger.info('Activity logger and CSV exporter initialized');
    console.log('✓ Async database wrapper active');
    console.log('✓ Activity logger and CSV exporter initialized');
    console.log('✓ Account lockout cleanup scheduler started');
    
    registerRoutes();
  }
});

/**
 * Register all routes (called after database is initialized)
 */
function registerRoutes() {
  // ==============================================
  // AUTHENTICATION ROUTES (PUBLIC)
  // ==============================================
  app.use('/api/auth', authRoutes(db, logger));

  // ==============================================
  // USER MANAGEMENT (ADMIN ONLY)
  // ==============================================
  app.use('/api/users', userRoutes(db, activityLogger));

  // ==============================================
  // CORE API ROUTES (PROTECTED)
  // ==============================================
  app.use('/api/products', authenticate, productRoutes(db, activityLogger, cache));
  app.use('/api/batches', authenticate, batchRoutes(db, activityLogger));
  app.use('/api/inventory/batches', authenticate, batchRoutes(db, activityLogger));
  app.use('/api/categories', authenticate, categoryRoutes(db, activityLogger));
  app.use('/api/suppliers', authenticate, supplierRoutes(db, activityLogger));
  app.use('/api/dashboard', authenticate, dashboardRoutes(db, cache));
  app.use('/api/settings', authenticate, authorize('admin'), settingsRoutes(db, createBackup));

  // ==============================================
  // EXTRACTED ROUTES (GROUP 2 - PROTECTED)
  // ==============================================
  app.use('/api/reports', authenticate, reportsRoutes(db, cache, csvExporter));
  app.use('/api/inventory', authenticate, inventoryHelpersRoutes(db));
  app.use('/api/backup', authenticate, backupsRoutes(createBackup, sqliteDb, Database));
  app.use('/api', systemRoutes(db, logger, VERSION, MigrationRunner, sqliteDb, checkGitHubVersion, getCurrentChannel));
  app.use('/api', authenticate, importExportRoutes(db, activityLogger, logger));

  console.log('✓ All routes registered');
}

/**
 * Database initialization
 */
async function preMigrationFixes(db) {
  return new Promise((resolve) => {
    console.log('\n🔧 Running pre-migration safety checks...');
    
    sqliteDb.run(`ALTER TABLE suppliers ADD COLUMN is_active INTEGER DEFAULT 1`, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.log('   ℹ️  Suppliers table may not exist yet (will be created by migrations)');
      } else if (!err) {
        console.log('   ✓ Added missing is_active column to suppliers table');
      } else {
        console.log('   ✓ Suppliers table schema already complete');
      }
      
      console.log('✓ Pre-migration checks complete\n');
      resolve();
    });
  });
}

async function initializeDatabase() {
  try {
    await initDatabase();
    await preMigrationFixes(sqliteDb);
    
    console.log('🔧 Checking database migrations...');
    
    const migrator = new MigrationRunner(sqliteDb);
    await migrator.initialize();
    
    const currentVersion = await migrator.getCurrentVersion();
    console.log(`📊 Current schema version: ${currentVersion}`);
    
    const result = await migrator.runPendingMigrations(createBackup);
    
    if (result.migrationsRun > 0) {
      console.log(`✅ ${result.message}\n`);
    } else {
      console.log(`✓ ${result.message}\n`);
    }
    
    await migrateLegacyData();
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    console.log('\n⚠️  Application cannot start with failed migration.');
    console.log('💡 Check logs above for details or restore from backup.\n');
    process.exit(1);
  }
}

function initDatabase() {
  return new Promise((resolve, reject) => {
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        inhouse_number TEXT,
        barcode TEXT UNIQUE,
        brand TEXT,
        supplier TEXT,
        items_per_case INTEGER,
        cost_per_case REAL DEFAULT 0,
        category TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        reject(err);
      } else {
        sqliteDb.run(`
          CREATE TABLE IF NOT EXISTS inventory_batches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            case_quantity INTEGER NOT NULL,
            total_quantity INTEGER NOT NULL,
            expiry_date TEXT,
            location TEXT,
            received_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            notes TEXT,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      }
    });
  });
}

function migrateLegacyData() {
  return new Promise((resolve) => {
    sqliteDb.get("SELECT name FROM sqlite_master WHERE type='table' AND name='inventory'", (err, row) => {
      if (!row) {
        resolve();
        return;
      }
      console.log('Migrating legacy inventory data...');
      resolve();
    });
  });
}

// Backup functions
function createBackup(prefix = '') {
  return new Promise((resolve, reject) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
    const backupName = prefix ? `backup_${prefix}_${timestamp}.db` : `backup_${timestamp}.db`;
    const backupPath = path.join(BACKUP_DIR, backupName);
    const dbPath = path.join(__dirname, 'inventory.db');
    
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

// Error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`\n🎉 InvAI v${VERSION} - Phase 2.2 Modular Routes`);
  console.log(`💻 Server running on port ${PORT}`);
  console.log(`🔗 Access at http://localhost:${PORT}`);
  console.log(`\n🎯 Architecture:`);
  console.log(`   → Streamlined server.js (~450 lines)`);
  console.log(`   → Modular route structure (13 route modules)`);
  console.log(`   → Async/await throughout`);
  console.log(`   → JWT authentication & authorization`);
  console.log(`\n💾 Database: SQLite with async wrapper`);
  console.log(`🔒 Auth: JWT tokens with role-based access`);
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

process.on('SIGINT', () => {
  sqliteDb.close((err) => {
    if (err) console.error('Error closing database:', err);
    else console.log('Database connection closed');
    process.exit(0);
  });
});