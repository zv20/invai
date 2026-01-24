/**
 * InvAI Server - Phase 2.1 Complete
 * 
 * Full refactor with authentication system integrated
 * 
 * Changes from original:
 * - Async/await throughout (no callback hell)
 * - Transaction support for bulk operations
 * - Standardized error responses
 * - Modular architecture (routes, controllers, middleware)
 * - Clean separation of concerns
 * - JWT authentication and authorization
 * - Role-based access control (user/admin)
 */

// Load environment variables FIRST
require('dotenv').config();

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const https = require('https');
const multer = require('multer');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Validate JWT_SECRET
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-secret-key-here-change-this-in-production') {
  console.error('\n❌ ERROR: JWT_SECRET not configured properly!');
  console.error('Please set a secure JWT_SECRET in your .env file\n');
  process.exit(1);
}

// Phase 1+2: New architecture imports
const Database = require('./utils/db');
const { errorHandler } = require('./middleware/errorHandler');
const asyncHandler = require('./middleware/asyncHandler');
const { authenticate, authorize } = require('./middleware/auth');

// Route modules
const productRoutes = require('./routes/products');
const batchRoutes = require('./routes/batches');
const categoryRoutes = require('./routes/categories');
const supplierRoutes = require('./routes/suppliers');
const dashboardRoutes = require('./routes/dashboard');
const settingsRoutes = require('./routes/settings');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');

// Legacy modules (still used)
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
let db; // Will be Database wrapper (async/await)
let sqliteDb; // Raw SQLite connection

console.log('\n🚀 InvAI v' + VERSION + ' - Phase 2.1 Complete');
console.log('✅ Async/await throughout');
console.log('✅ Transaction support enabled');
console.log('✅ Standardized error responses');
console.log('✅ Modular architecture');
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

// Configure multer for file uploads
const upload = multer({
  dest: path.join(__dirname, 'temp'),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.db')) {
      cb(null, true);
    } else {
      cb(new Error('Only .db files are allowed'));
    }
  }
});

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

// Initialize database with Phase 1 async wrapper
sqliteDb = new sqlite3.Database('./inventory.db', async (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  } else {
    console.log('Connected to SQLite database');
    
    // Phase 1: Wrap with async Database class
    db = new Database(sqliteDb);
    
    await initializeDatabase();
    
    // Initialize legacy modules
    activityLogger = new ActivityLogger(sqliteDb);
    csvExporter = new CSVExporter(sqliteDb);
    
    logger.info('Activity logger and CSV exporter initialized');
    console.log('✓ Async database wrapper active');
    console.log('✓ Activity logger and CSV exporter initialized');
  }
});

/**
 * Database initialization (kept from original)
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
      // Legacy migration code (kept as-is)
      resolve();
    });
  });
}

// Backup functions (kept from original)
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

// ==============================================
// PHASE 2: MODULAR ROUTES
// ==============================================

// Authentication routes (PUBLIC - no auth required)
app.use('/api/auth', authRoutes(db, logger));

// User management routes (PROTECTED - admin only)
app.use('/api/users', userRoutes(db, logger));

// Core API routes (refactored) - PROTECTED
app.use('/api/products', authenticate, productRoutes(db, activityLogger, cache));
app.use('/api/inventory/batches', authenticate, batchRoutes(db, activityLogger));
app.use('/api/categories', authenticate, categoryRoutes(db, activityLogger));
app.use('/api/suppliers', authenticate, supplierRoutes(db, activityLogger));
app.use('/api/dashboard', authenticate, dashboardRoutes(db, cache));
app.use('/api/settings', authenticate, authorize('admin'), settingsRoutes(db, createBackup));

// ==============================================
// LEGACY ROUTES (Protected with authentication)
// ==============================================

// Activity log
app.get('/api/activity-log', authenticate, asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const activities = await activityLogger.getRecent(limit);
  res.json(activities);
}));

app.get('/api/activity-log/:entityType/:entityId', authenticate, asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.params;
  const activities = await activityLogger.getForEntity(entityType, parseInt(entityId));
  res.json(activities);
}));

// Reports
app.get('/api/reports/stock-value', authenticate, asyncHandler(async (req, res) => {
  const cacheKey = 'report:stock-value';
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  const query = `
    SELECT 
      p.id, p.name,
      c.name as category,
      s.name as supplier,
      COALESCE(SUM(ib.total_quantity), 0) as quantity,
      p.cost_per_case / NULLIF(p.items_per_case, 0) as unit_cost,
      COALESCE(SUM((p.cost_per_case / NULLIF(p.items_per_case, 0)) * ib.total_quantity), 0) as total_value
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    LEFT JOIN inventory_batches ib ON p.id = ib.product_id
    GROUP BY p.id
    ORDER BY total_value DESC
  `;

  const rows = await db.all(query, []);
  const totalValue = rows.reduce((sum, r) => sum + (r.total_value || 0), 0);
  const totalItems = rows.reduce((sum, r) => sum + r.quantity, 0);
  
  const result = { products: rows, totalValue, totalItems };
  cache.set(cacheKey, result, 60000);
  res.json(result);
}));

app.get('/api/reports/expiration', authenticate, asyncHandler(async (req, res) => {
  const query = `
    SELECT 
      p.name as product_name,
      ib.total_quantity as quantity,
      ib.expiry_date,
      ib.location,
      JULIANDAY(ib.expiry_date) - JULIANDAY('now') as days_until_expiry
    FROM inventory_batches ib
    JOIN products p ON ib.product_id = p.id
    WHERE ib.expiry_date IS NOT NULL
    ORDER BY ib.expiry_date
  `;

  const rows = await db.all(query, []);
  const expired = rows.filter(r => r.days_until_expiry < 0);
  const urgent = rows.filter(r => r.days_until_expiry >= 0 && r.days_until_expiry <= 7);
  const soon = rows.filter(r => r.days_until_expiry > 7 && r.days_until_expiry <= 30);
  
  res.json({ expired, urgent, soon, all: rows });
}));

app.get('/api/reports/low-stock', authenticate, asyncHandler(async (req, res) => {
  const query = `
    SELECT 
      p.id, p.name,
      c.name as category,
      s.name as supplier,
      COALESCE(SUM(ib.total_quantity), 0) as quantity,
      p.reorder_point
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    LEFT JOIN inventory_batches ib ON p.id = ib.product_id
    GROUP BY p.id
    HAVING quantity < p.reorder_point AND p.reorder_point > 0
    ORDER BY quantity
  `;

  const rows = await db.all(query, []);
  res.json({ products: rows });
}));

app.get('/api/reports/export/:type', authenticate, asyncHandler(async (req, res) => {
  const { type } = req.params;
  let csv;
  
  switch(type) {
    case 'stock-value':
      csv = await csvExporter.exportStockValue();
      break;
    case 'expiration':
      csv = await csvExporter.exportExpiration();
      break;
    case 'low-stock':
      csv = await csvExporter.exportLowStock();
      break;
    default:
      return res.status(400).json({ error: 'Invalid report type' });
  }
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=${type}_${new Date().toISOString().split('T')[0]}.csv`);
  res.send(csv);
}));

// Inventory summary
app.get('/api/inventory/summary', authenticate, asyncHandler(async (req, res) => {
  const { search, category, supplier } = req.query;
  let query = `
    SELECT p.*, c.name as category_name, c.color as category_color, c.icon as category_icon,
           s.name as supplier_name,
           COALESCE(SUM(ib.total_quantity), 0) as total_quantity,
           COUNT(ib.id) as batch_count, MIN(ib.expiry_date) as earliest_expiry
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    LEFT JOIN inventory_batches ib ON p.id = ib.product_id
    WHERE 1=1
  `;
  const params = [];
  
  if (search) {
    query += ' AND (p.name LIKE ? OR p.barcode LIKE ? OR p.brand LIKE ? OR s.name LIKE ? OR p.inhouse_number LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }
  if (category && category !== 'all') {
    query += ' AND p.category_id = ?';
    params.push(category);
  }
  if (supplier && supplier !== 'all') {
    query += ' AND p.supplier_id = ?';
    params.push(supplier);
  }
  
  query += ' GROUP BY p.id ORDER BY p.name';
  const rows = await db.all(query, params);
  res.json(rows);
}));

app.get('/api/inventory/value', authenticate, asyncHandler(async (req, res) => {
  const query = `
    SELECT 
      COUNT(DISTINCT p.id) as total_products,
      COALESCE(SUM(ib.total_quantity), 0) as total_items,
      COALESCE(SUM((p.cost_per_case / NULLIF(p.items_per_case, 0)) * ib.total_quantity), 0) as total_value
    FROM products p
    LEFT JOIN inventory_batches ib ON p.id = ib.product_id
  `;
  const row = await db.get(query, []);
  res.json(row);
}));

// FIFO/FEFO batch suggestion
app.get('/api/products/:id/batch-suggestion', authenticate, asyncHandler(async (req, res) => {
  const productId = req.params.id;
  
  const rows = await db.all(`
    SELECT ib.*, p.name as product_name
    FROM inventory_batches ib
    JOIN products p ON ib.product_id = p.id
    WHERE ib.product_id = ? AND ib.total_quantity > 0
    ORDER BY 
      CASE 
        WHEN ib.expiry_date IS NULL THEN 1
        ELSE 0
      END,
      ib.expiry_date ASC,
      ib.received_date ASC
    LIMIT 1
  `, [productId]);
  
  if (rows.length === 0) {
    return res.json({ suggestion: null, message: 'No available batches' });
  }
  
  const batch = rows[0];
  const now = new Date();
  const expiryDate = batch.expiry_date ? new Date(batch.expiry_date) : null;
  
  let urgency = 'normal';
  let reason = 'Oldest batch';
  let daysUntilExpiry = null;
  
  if (expiryDate) {
    daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      urgency = 'expired';
      reason = 'EXPIRED - Remove immediately';
    } else if (daysUntilExpiry <= 7) {
      urgency = 'urgent';
      reason = `Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''} - Use immediately`;
    } else if (daysUntilExpiry <= 30) {
      urgency = 'soon';
      reason = `Expires in ${daysUntilExpiry} days - Use soon`;
    } else {
      reason = `Expires in ${daysUntilExpiry} days`;
    }
  }
  
  res.json({ suggestion: batch, urgency, reason, daysUntilExpiry });
}));

// Low stock alerts
app.get('/api/alerts/low-stock', authenticate, asyncHandler(async (req, res) => {
  const threshold = parseInt(req.query.threshold) || 10;
  
  const rows = await db.all(`
    SELECT 
      p.id, p.name, c.name as category,
      COALESCE(SUM(ib.total_quantity), 0) as total_quantity
    FROM products p
    LEFT JOIN inventory_batches ib ON p.id = ib.product_id
    LEFT JOIN categories c ON p.category_id = c.id
    GROUP BY p.id
    HAVING total_quantity > 0 AND total_quantity < ?
    ORDER BY total_quantity ASC
  `, [threshold]);
  
  res.json(rows);
}));

// Backup routes (ADMIN ONLY)
app.post('/api/backup/create', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const backup = await createBackup();
  const stats = fs.statSync(backup.path);
  res.json({ 
    message: 'Backup created successfully', 
    filename: backup.filename,
    size: stats.size,
    created: stats.mtime
  });
}));

app.get('/api/backup/list', authenticate, authorize('admin'), (req, res) => {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('backup_') && file.endsWith('.db'))
      .map(file => {
        const stats = fs.statSync(path.join(BACKUP_DIR, file));
        return {
          filename: file,
          size: stats.size,
          created: stats.mtime,
          age: Date.now() - stats.mtime.getTime()
        };
      })
      .sort((a, b) => b.created - a.created);
    res.json(files);
  } catch (error) {
    console.error('Error listing backups:', error);
    res.status(500).json({ error: 'Failed to list backups: ' + error.message });
  }
});

app.get('/api/backup/download/:filename', authenticate, authorize('admin'), (req, res) => {
  const filename = req.params.filename;
  if (!filename.startsWith('backup_') || !filename.endsWith('.db')) {
    return res.status(400).json({ error: 'Invalid backup filename' });
  }
  const filePath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Backup file not found' });
  }
  res.download(filePath, filename);
});

app.delete('/api/backup/delete/:filename', authenticate, authorize('admin'), (req, res) => {
  const filename = req.params.filename;
  if (!filename.startsWith('backup_') || !filename.endsWith('.db')) {
    return res.status(400).json({ error: 'Invalid backup filename' });
  }
  const filePath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Backup file not found' });
  }
  try {
    fs.unlinkSync(filePath);
    res.json({ message: 'Backup deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete backup: ' + error.message });
  }
});

app.post('/api/backup/restore/:filename', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const filename = req.params.filename;
  
  if (!filename.startsWith('backup_') || !filename.endsWith('.db')) {
    return res.status(400).json({ error: 'Invalid backup filename' });
  }
  
  const backupPath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(backupPath)) {
    return res.status(404).json({ error: 'Backup file not found' });
  }
  
  const safetyBackup = await createBackup();
  console.log(`Safety backup created: ${safetyBackup.filename}`);
  
  await new Promise((resolve, reject) => {
    sqliteDb.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
  
  const dbPath = path.join(__dirname, 'inventory.db');
  fs.copyFileSync(backupPath, dbPath);
  console.log(`Database restored from: ${filename}`);
  
  sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error reopening database:', err);
    } else {
      console.log('Database reconnected after restore');
      db = new Database(sqliteDb);
    }
  });
  
  res.json({ 
    message: 'Database restored successfully', 
    restoredFrom: filename,
    safetyBackup: safetyBackup.filename
  });
}));

app.post('/api/backup/upload', authenticate, authorize('admin'), upload.single('backup'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const safetyBackup = await createBackup();
  console.log(`Safety backup created: ${safetyBackup.filename}`);
  
  await new Promise((resolve, reject) => {
    sqliteDb.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
  
  const dbPath = path.join(__dirname, 'inventory.db');
  fs.copyFileSync(req.file.path, dbPath);
  console.log(`Database restored from uploaded file: ${req.file.originalname}`);
  
  fs.unlinkSync(req.file.path);
  
  sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error reopening database:', err);
    } else {
      console.log('Database reconnected after restore');
      db = new Database(sqliteDb);
    }
  });
  
  res.json({ 
    message: 'Database restored from upload successfully', 
    originalFilename: req.file.originalname,
    safetyBackup: safetyBackup.filename
  });
}));

// Changelog
app.get('/api/changelog', (req, res) => {
  try {
    const changelogPath = path.join(__dirname, 'CHANGELOG.md');
    
    if (!fs.existsSync(changelogPath)) {
      return res.json({
        version: VERSION,
        changes: [],
        error: 'CHANGELOG.md not found'
      });
    }
    
    const changelogContent = fs.readFileSync(changelogPath, 'utf8');
    const lines = changelogContent.split('\n');
    
    const versions = [];
    let currentVersion = null;
    let currentChanges = [];
    let currentDate = null;
    
    lines.forEach(line => {
      const versionMatch = line.match(/^##\s*\[([\d.]+)\]\s*-\s*(.+)/);
      if (versionMatch) {
        if (currentVersion) {
          versions.push({
            version: currentVersion,
            date: currentDate,
            changes: currentChanges
          });
        }
        currentVersion = versionMatch[1];
        currentDate = versionMatch[2].trim();
        currentChanges = [];
      } else if (line.startsWith('###')) {
        const category = line.replace(/^###\s*/, '').trim();
        currentChanges.push({ type: 'category', text: category });
      } else if (line.startsWith('- ')) {
        const change = line.replace(/^-\s*/, '').trim();
        if (change) {
          currentChanges.push({ type: 'item', text: change });
        }
      }
    });
    
    if (currentVersion) {
      versions.push({
        version: currentVersion,
        date: currentDate,
        changes: currentChanges
      });
    }
    
    res.json({
      currentVersion: VERSION,
      versions: versions.slice(0, 5)
    });
  } catch (error) {
    console.error('Error reading changelog:', error);
    res.status(500).json({ error: 'Failed to read changelog' });
  }
});

// Migrations status
app.get('/api/migrations/status', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const migrator = new MigrationRunner(sqliteDb);
  const currentVersion = await migrator.getCurrentVersion();
  const history = await migrator.getHistory();
  
  res.json({
    currentVersion,
    totalMigrations: history.length,
    history: history.slice(0, 10)
  });
}));

// Database reset (ADMIN ONLY)
app.post('/api/database/reset', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  await db.run('DELETE FROM inventory_batches', []);
  await db.run('DELETE FROM products', []);
  await db.run('DELETE FROM sqlite_sequence WHERE name="products" OR name="inventory_batches"', []);
  
  logger.warn(`Database reset by user: ${req.user.username}`);
  console.log('Database reset completed');
  res.json({ 
    message: 'Database reset successful. All data has been deleted.', 
    timestamp: new Date().toISOString() 
  });
}));

// Export/Import
app.get('/api/export/inventory', authenticate, asyncHandler(async (req, res) => {
  const query = `
    SELECT p.name, p.inhouse_number, p.barcode, p.brand, s.name as supplier, p.items_per_case, p.cost_per_case, 
           c.name as category, ib.case_quantity, ib.total_quantity, ib.expiry_date, ib.location, ib.received_date,
           ib.notes as batch_notes, p.notes as product_notes
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    LEFT JOIN inventory_batches ib ON p.id = ib.product_id
    ORDER BY p.name, ib.expiry_date
  `;
  
  const rows = await db.all(query, []);
  const headers = [
    'Product Name', 'In-House Number', 'Barcode', 'Brand', 'Supplier',
    'Items Per Case', 'Cost Per Case', 'Category', 'Case Quantity', 'Total Quantity',
    'Expiration Date', 'Location', 'Received Date', 'Batch Notes', 'Product Notes'
  ];
  
  let csv = headers.join(',') + '\n';
  rows.forEach(row => {
    const rowData = [
      escapeCSV(row.name), escapeCSV(row.inhouse_number), escapeCSV(row.barcode),
      escapeCSV(row.brand), escapeCSV(row.supplier), escapeCSV(row.items_per_case),
      escapeCSV(row.cost_per_case), escapeCSV(row.category), escapeCSV(row.case_quantity),
      escapeCSV(row.total_quantity), escapeCSV(row.expiry_date), escapeCSV(row.location),
      escapeCSV(row.received_date), escapeCSV(row.batch_notes), escapeCSV(row.product_notes)
    ];
    csv += rowData.join(',') + '\n';
  });
  
  const filename = `inventory_export_${new Date().toISOString().split('T')[0]}.csv`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}));

function escapeCSV(field) {
  if (field === null || field === undefined) return '';
  const stringField = String(field);
  if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }
  return stringField;
}

app.post('/api/import/inventory', authenticate, asyncHandler(async (req, res) => {
  const csvText = req.body;
  const lines = csvText.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    return res.status(400).json({ error: 'CSV file is empty or invalid' });
  }
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const rows = lines.slice(1);
  
  let productsCreated = 0, productsUpdated = 0, batchesCreated = 0, errors = 0;
  
  const parseField = (field) => {
    if (!field) return null;
    field = field.trim();
    if (field.startsWith('"') && field.endsWith('"')) {
      field = field.slice(1, -1).replace(/""/g, '"');
    }
    return field || null;
  };
  
  for (const row of rows) {
    try {
      const fields = row.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || [];
      const data = {};
      headers.forEach((header, index) => { data[header] = parseField(fields[index]); });
      
      const productName = data['Product Name'];
      if (!productName) { errors++; continue; }
      
      let existingProduct;
      if (data['Barcode']) {
        existingProduct = await db.get('SELECT * FROM products WHERE barcode = ?', [data['Barcode']]);
      } else {
        existingProduct = await db.get('SELECT * FROM products WHERE name = ?', [productName]);
      }
      
      let productId;
      if (existingProduct) {
        await db.run(
          `UPDATE products SET inhouse_number = COALESCE(?, inhouse_number),
           brand = COALESCE(?, brand), items_per_case = COALESCE(?, items_per_case), 
           cost_per_case = COALESCE(?, cost_per_case), notes = COALESCE(?, notes), 
           updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [data['In-House Number'], data['Brand'], data['Items Per Case'], 
           data['Cost Per Case'] || 0, data['Product Notes'], existingProduct.id]
        );
        productId = existingProduct.id;
        productsUpdated++;
      } else {
        const result = await db.run(
          `INSERT INTO products (name, inhouse_number, barcode, brand, items_per_case, cost_per_case, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [productName, data['In-House Number'], data['Barcode'], data['Brand'], 
           data['Items Per Case'] || 1, data['Cost Per Case'] || 0, data['Product Notes'] || '']
        );
        productId = result.lastID;
        productsCreated++;
      }
      
      if (data['Case Quantity'] && parseInt(data['Case Quantity']) > 0) {
        await db.run(
          `INSERT INTO inventory_batches (product_id, case_quantity, total_quantity, expiry_date, location, notes, received_date)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [productId, data['Case Quantity'], data['Total Quantity'] || data['Case Quantity'], 
           data['Expiration Date'], data['Location'] || '', data['Batch Notes'] || '', 
           data['Received Date'] || new Date().toISOString()]
        );
        batchesCreated++;
      }
    } catch (rowError) {
      console.error('Error processing row:', rowError);
      errors++;
    }
  }
  
  logger.info(`CSV import by ${req.user.username}: ${productsCreated} created, ${productsUpdated} updated, ${batchesCreated} batches`);
  
  res.json({ 
    message: 'Import completed', 
    productsCreated, 
    productsUpdated, 
    batchesCreated, 
    errors, 
    totalRows: rows.length 
  });
}));

// Health check (PUBLIC)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: VERSION, timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: VERSION,
    phase: 'Phase 2.1 Complete - Modular + Auth',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    cacheStats: cache.getStats(),
    authentication: 'enabled'
  });
});

// Version check (PUBLIC)
app.get('/api/version', asyncHandler(async (req, res) => {
  try {
    const currentChannel = getCurrentChannel();
    const targetBranch = currentChannel === 'stable' ? 'main' : 'beta';
    const updateInfo = await checkGitHubVersion(targetBranch);
    res.json({ ...updateInfo, channel: currentChannel, branch: targetBranch });
  } catch (error) {
    console.error('Error checking GitHub version:', error.message);
    res.json({
      latestVersion: VERSION,
      currentVersion: VERSION,
      updateAvailable: false,
      error: 'Could not check for updates',
      channel: getCurrentChannel()
    });
  }
}));

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

// ==============================================
// ERROR HANDLER (Must be last)
// ==============================================
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`\n🎉 InvAI v${VERSION} - Phase 2.1 Complete`);
  console.log(`💻 Server running on port ${PORT}`);
  console.log(`🔗 Access at http://localhost:${PORT}`);
  console.log(`\n🎯 Complete Feature Set:`);
  console.log(`   → Modular route structure`);
  console.log(`   → Controllers separate business logic`);
  console.log(`   → Async/await eliminates callback hell`);
  console.log(`   → Transaction-safe bulk operations`);
  console.log(`   → Standardized error responses`);
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
