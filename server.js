const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const https = require('https');
const multer = require('multer');
const { execSync } = require('child_process');
const MigrationRunner = require('./migrations/migration-runner');
const ActivityLogger = require('./lib/activity-logger');
const CSVExporter = require('./lib/csv-export');
const CacheManager = require('./lib/cache-manager');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const packageJson = require('./package.json');
const app = express();
const PORT = process.env.PORT || 3000;
const VERSION = packageJson.version;
const GITHUB_REPO = 'zv20/invai';
const BACKUP_DIR = path.join(__dirname, 'backups');
const MAX_BACKUPS = 10;
const UPDATE_CHANNEL_FILE = path.join(__dirname, '.update-channel');

// Initialize modules
const cache = new CacheManager();
let activityLogger;
let csvExporter;

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

// Ensure log directory exists
if (!fs.existsSync(path.join(__dirname, 'logs'))) {
  fs.mkdirSync(path.join(__dirname, 'logs'), { recursive: true });
  console.log('Created logs directory');
}

// Configure multer for file uploads
const upload = multer({
  dest: path.join(__dirname, 'temp'),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.db')) {
      cb(null, true);
    } else {
      cb(new Error('Only .db files are allowed'));
    }
  }
});

// Ensure directories exist
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log('Created backups directory');
}

if (!fs.existsSync(path.join(__dirname, 'temp'))) {
  fs.mkdirSync(path.join(__dirname, 'temp'), { recursive: true });
  console.log('Created temp directory');
}

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

let db = new sqlite3.Database('./inventory.db', async (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  } else {
    console.log('Connected to SQLite database');
    await initializeDatabase();
    // Initialize activity logger and CSV exporter after database is ready
    activityLogger = new ActivityLogger(db);
    csvExporter = new CSVExporter(db);
    logger.info('Activity logger and CSV exporter initialized');
  }
});

/**
 * PRE-MIGRATION SAFETY FIX
 * Ensures critical columns exist before migrations run
 * This prevents migration failures and never blocks startup
 */
async function preMigrationFixes(db) {
  return new Promise((resolve) => {
    console.log('\n🔧 Running pre-migration safety checks...');
    
    // Fix 1: Ensure suppliers.is_active column exists
    db.run(`ALTER TABLE suppliers ADD COLUMN is_active INTEGER DEFAULT 1`, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.log('   ℹ️  Suppliers table may not exist yet (will be created by migrations)');
      } else if (!err) {
        console.log('   ✓ Added missing is_active column to suppliers table');
      } else {
        console.log('   ✓ Suppliers table schema already complete');
      }
      
      // Always resolve - never block startup
      console.log('✓ Pre-migration checks complete\n');
      resolve();
    });
  });
}

/**
 * Initialize database with migration system
 */
async function initializeDatabase() {
  try {
    // First, ensure basic tables exist (for first-time setup)
    await initDatabase();
    
    // Run pre-migration fixes BEFORE migrations
    await preMigrationFixes(db);
    
    // Then run migration system
    console.log('🔧 Checking database migrations...');
    
    const migrator = new MigrationRunner(db);
    await migrator.initialize();
    
    const currentVersion = await migrator.getCurrentVersion();
    console.log(`📊 Current schema version: ${currentVersion}`);
    
    // Run pending migrations
    const result = await migrator.runPendingMigrations(createBackup);
    
    if (result.migrationsRun > 0) {
      console.log(`✅ ${result.message}\n`);
    } else {
      console.log(`✓ ${result.message}\n`);
    }
    
    // Continue with legacy data migration if needed
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
    db.run(`
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
        db.run(`ALTER TABLE products ADD COLUMN cost_per_case REAL DEFAULT 0`, (err) => {
          if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding cost_per_case column:', err);
          }
        });

        db.run(`
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
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='inventory'", (err, row) => {
      if (!row) {
        resolve();
        return;
      }
      console.log('Migrating legacy inventory data...');
      db.all('SELECT * FROM inventory', [], (err, items) => {
        if (err || !items || items.length === 0) {
          console.log('No legacy data to migrate');
          resolve();
          return;
        }
        items.forEach(item => {
          db.run(
            `INSERT INTO products (name, inhouse_number, barcode, brand, supplier, items_per_case, category, notes, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [item.name, item.inhouse_number, item.barcode, item.brand, item.supplier, 
             item.items_per_case, item.category, item.notes, item.created_at, item.updated_at],
            function(err) {
              if (err) {
                console.error('Error migrating product:', err);
                return;
              }
              const productId = this.lastID;
              db.run(
                `INSERT INTO inventory_batches (product_id, case_quantity, total_quantity, expiry_date, location, received_date)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [productId, item.case_quantity || 0, item.quantity, item.expiry_date, item.location, item.created_at],
                (err) => {
                  if (err) console.error('Error migrating batch:', err);
                }
              );
            }
          );
        });
        console.log(`Migrated ${items.length} legacy items`);
        db.run('ALTER TABLE inventory RENAME TO inventory_old', (err) => {
          if (!err) console.log('Legacy table renamed to inventory_old (safe to delete later)');
          resolve();
        });
      });
    });
  });
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

function getCurrentChannel() {
  try {
    if (fs.existsSync(UPDATE_CHANNEL_FILE)) {
      return fs.readFileSync(UPDATE_CHANNEL_FILE, 'utf8').trim();
    }
  } catch (err) {
    console.error('Error reading channel file:', err);
  }
  return 'stable';
}

function getCurrentBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  } catch (err) {
    return 'unknown';
  }
}

// ========== v0.8.0: ACTIVITY LOG API ==========

app.get('/api/activity-log', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const activities = await activityLogger.getRecent(limit);
    res.json(activities);
  } catch (error) {
    logger.error('Activity log error:', error);
    res.status(500).json({ error: 'Failed to load activity log' });
  }
});

app.get('/api/activity-log/:entityType/:entityId', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const activities = await activityLogger.getForEntity(entityType, parseInt(entityId));
    res.json(activities);
  } catch (error) {
    logger.error('Entity history error:', error);
    res.status(500).json({ error: 'Failed to load entity history' });
  }
});

// ========== v0.8.0: REPORTS API ==========

app.get('/api/reports/stock-value', async (req, res) => {
  try {
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

    db.all(query, [], (err, rows) => {
      if (err) {
        logger.error('Stock value report error:', err);
        return res.status(500).json({ error: err.message });
      }
      
      const totalValue = rows.reduce((sum, r) => sum + (r.total_value || 0), 0);
      const totalItems = rows.reduce((sum, r) => sum + r.quantity, 0);
      
      const result = {
        products: rows,
        totalValue,
        totalItems
      };
      
      cache.set(cacheKey, result, 60000); // 1 minute cache
      res.json(result);
    });
  } catch (error) {
    logger.error('Stock value report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

app.get('/api/reports/expiration', async (req, res) => {
  try {
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

    db.all(query, [], (err, rows) => {
      if (err) {
        logger.error('Expiration report error:', err);
        return res.status(500).json({ error: err.message });
      }
      
      const expired = rows.filter(r => r.days_until_expiry < 0);
      const urgent = rows.filter(r => r.days_until_expiry >= 0 && r.days_until_expiry <= 7);
      const soon = rows.filter(r => r.days_until_expiry > 7 && r.days_until_expiry <= 30);
      
      res.json({ expired, urgent, soon, all: rows });
    });
  } catch (error) {
    logger.error('Expiration report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

app.get('/api/reports/low-stock', async (req, res) => {
  try {
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

    db.all(query, [], (err, rows) => {
      if (err) {
        logger.error('Low stock report error:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ products: rows });
    });
  } catch (error) {
    logger.error('Low stock report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

app.get('/api/reports/turnover', async (req, res) => {
  try {
    // Placeholder for turnover report - foundation for future implementation
    res.json({ 
      message: 'Turnover report coming in v0.9.0',
      products: []
    });
  } catch (error) {
    logger.error('Turnover report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

app.get('/api/reports/export/:type', async (req, res) => {
  try {
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
  } catch (error) {
    logger.error('CSV export error:', error);
    res.status(500).json({ error: 'Failed to export report' });
  }
});

// ========== v0.8.0: FAVORITES API ==========

app.post('/api/products/:id/favorite', (req, res) => {
  const { id } = req.params;
  const { is_favorite } = req.body;
  
  db.run(
    'UPDATE products SET is_favorite = ? WHERE id = ?',
    [is_favorite ? 1 : 0, id],
    async function(err) {
      if (err) {
        logger.error('Favorite update error:', err);
        return res.status(500).json({ error: err.message });
      }
      
      // Log activity
      if (activityLogger) {
        await activityLogger.log(
          'update',
          'product',
          id,
          'Product',
          is_favorite ? 'Added to favorites' : 'Removed from favorites'
        );
      }
      
      cache.invalidatePattern('products');
      res.json({ success: true, is_favorite });
    }
  );
});

// ========== v0.8.0: PREFERENCES API ==========

app.get('/api/preferences', (req, res) => {
  db.get(
    'SELECT * FROM user_preferences WHERE user_id = 1',
    [],
    (err, row) => {
      if (err) {
        logger.error('Preferences get error:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json(row || { theme: 'auto' });
    }
  );
});

app.post('/api/preferences', (req, res) => {
  const { theme } = req.body;
  
  db.run(
    `INSERT OR REPLACE INTO user_preferences (user_id, theme, updated_at) VALUES (1, ?, CURRENT_TIMESTAMP)`,
    [theme],
    function(err) {
      if (err) {
        logger.error('Preferences save error:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, theme });
    }
  );
});

// ========== v0.8.0: HEALTH CHECK ==========

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: VERSION,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    cacheStats: cache.getStats()
  });
});

// ========== UPDATE CHANNEL MANAGEMENT ==========

app.get('/api/settings/update-channel', (req, res) => {
  const currentChannel = getCurrentChannel();
  const currentBranch = getCurrentBranch();
  
  const availableChannels = [
    {
      id: 'stable',
      name: 'Stable',
      description: 'Production-ready releases. Most reliable and thoroughly tested.',
      branch: 'main'
    },
    {
      id: 'beta',
      name: 'Beta',
      description: 'Latest features and improvements. May have minor bugs.',
      branch: 'beta'
    }
  ];
  
  res.json({
    channel: currentChannel,
    currentBranch,
    availableChannels
  });
});

app.post('/api/settings/update-channel', (req, res) => {
  const { channel } = req.body;
  
  if (!channel || !['stable', 'beta'].includes(channel)) {
    return res.status(400).json({ error: 'Invalid channel. Must be "stable" or "beta"' });
  }
  
  try {
    fs.writeFileSync(UPDATE_CHANNEL_FILE, channel, 'utf8');
    res.json({ message: 'Channel preference saved', channel });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save channel preference: ' + error.message });
  }
});

app.post('/api/settings/switch-channel', async (req, res) => {
  const { channel } = req.body;
  
  if (!channel || !['stable', 'beta'].includes(channel)) {
    return res.status(400).json({ error: 'Invalid channel. Must be "stable" or "beta"' });
  }
  
  const targetBranch = channel === 'stable' ? 'main' : 'beta';
  const currentBranch = getCurrentBranch();
  
  if (currentBranch === targetBranch) {
    return res.json({ 
      message: 'Already on target branch', 
      branch: targetBranch,
      channel 
    });
  }
  
  try {
    // Step 1: Create backup
    console.log(`Creating backup before switching to ${channel} channel...`);
    const backup = await createBackup(`pre_channel_switch_${channel}`);
    console.log(`Backup created: ${backup.filename}`);
    
    // Step 2: Fetch latest
    console.log('Fetching latest changes...');
    execSync('git fetch origin', { cwd: __dirname, encoding: 'utf8' });
    
    // Step 3: Switch branch
    console.log(`Switching to ${targetBranch} branch...`);
    execSync(`git checkout ${targetBranch}`, { cwd: __dirname, encoding: 'utf8' });
    
    // Step 4: Pull latest
    console.log('Pulling latest changes...');
    execSync(`git pull origin ${targetBranch}`, { cwd: __dirname, encoding: 'utf8' });
    
    // Step 5: Update dependencies
    console.log('Updating dependencies...');
    execSync('npm install --production', { cwd: __dirname, encoding: 'utf8' });
    
    // Step 6: Save channel preference
    fs.writeFileSync(UPDATE_CHANNEL_FILE, channel, 'utf8');
    
    console.log(`✅ Successfully switched to ${channel} channel (${targetBranch} branch)`);
    
    res.json({
      message: `Successfully switched to ${channel} channel`,
      channel,
      branch: targetBranch,
      backupFile: backup.filename,
      restartRequired: true
    });
    
  } catch (error) {
    console.error('Channel switch failed:', error);
    res.status(500).json({ 
      error: 'Failed to switch channel: ' + error.message,
      hint: 'You can manually revert with: git checkout ' + currentBranch
    });
  }
});

// ========== CHANGELOG API ==========

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

// ========== MIGRATION API ==========

app.get('/api/migrations/status', async (req, res) => {
  try {
    const migrator = new MigrationRunner(db);
    const currentVersion = await migrator.getCurrentVersion();
    const history = await migrator.getHistory();
    
    res.json({
      currentVersion,
      totalMigrations: history.length,
      history: history.slice(0, 10)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== v0.7.4: CATEGORIES MANAGEMENT ==========

app.get('/api/categories', (req, res) => {
  db.all('SELECT * FROM categories ORDER BY display_order, name', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows || []);
  });
});

app.post('/api/categories', async (req, res) => {
  const { name, description, color, icon } = req.body;
  
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Category name is required' });
  }
  
  db.run(
    `INSERT INTO categories (name, description, color, icon) VALUES (?, ?, ?, ?)`,
    [name.trim(), description || '', color || '#9333ea', icon || '📦'],
    async function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint')) {
          return res.status(409).json({ error: 'Category name already exists' });
        }
        return res.status(500).json({ error: err.message });
      }
      
      // Log activity
      if (activityLogger) {
        await activityLogger.log('create', 'category', this.lastID, name, `Created category: ${name}`);
      }
      
      res.json({ id: this.lastID, message: 'Category created successfully' });
    }
  );
});

app.put('/api/categories/:id', async (req, res) => {
  const { name, description, color, icon, display_order } = req.body;
  
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Category name is required' });
  }
  
  db.run(
    `UPDATE categories SET name = ?, description = ?, color = ?, icon = ?, display_order = COALESCE(?, display_order), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [name.trim(), description || '', color || '#9333ea', icon || '📦', display_order, req.params.id],
    async function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint')) {
          return res.status(409).json({ error: 'Category name already exists' });
        }
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }
      
      // Log activity
      if (activityLogger) {
        await activityLogger.log('update', 'category', req.params.id, name, `Updated category: ${name}`);
      }
      
      res.json({ message: 'Category updated successfully' });
    }
  );
});

app.delete('/api/categories/:id', async (req, res) => {
  // Check if any products use this category
  db.get('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [req.params.id], async (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (row.count > 0) {
      return res.status(400).json({ 
        error: `Cannot delete category. ${row.count} product(s) are using this category. Please reassign them first.` 
      });
    }
    
    // Get category name for logging
    db.get('SELECT name FROM categories WHERE id = ?', [req.params.id], async (err, category) => {
      const categoryName = category ? category.name : 'Unknown';
      
      db.run('DELETE FROM categories WHERE id = ?', [req.params.id], async function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Category not found' });
        }
        
        // Log activity
        if (activityLogger) {
          await activityLogger.log('delete', 'category', req.params.id, categoryName, `Deleted category: ${categoryName}`);
        }
        
        res.json({ message: 'Category deleted successfully' });
      });
    });
  });
});

// ========== v0.7.4: SUPPLIERS MANAGEMENT ==========

app.get('/api/suppliers', (req, res) => {
  db.all('SELECT * FROM suppliers ORDER BY name', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows || []);
  });
});

app.post('/api/suppliers', async (req, res) => {
  const { name, contact_name, phone, email, address, notes, is_active } = req.body;
  
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Supplier name is required' });
  }
  
  db.run(
    `INSERT INTO suppliers (name, contact_name, phone, email, address, notes, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name.trim(), contact_name || '', phone || '', email || '', address || '', notes || '', is_active !== undefined ? is_active : 1],
    async function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint')) {
          return res.status(409).json({ error: 'Supplier name already exists' });
        }
        return res.status(500).json({ error: err.message });
      }
      
      // Log activity
      if (activityLogger) {
        await activityLogger.log('create', 'supplier', this.lastID, name, `Created supplier: ${name}`);
      }
      
      res.json({ id: this.lastID, message: 'Supplier created successfully' });
    }
  );
});

app.put('/api/suppliers/:id', async (req, res) => {
  const { name, contact_name, phone, email, address, notes, is_active } = req.body;
  
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Supplier name is required' });
  }
  
  db.run(
    `UPDATE suppliers SET name = ?, contact_name = ?, phone = ?, email = ?, address = ?, notes = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [name.trim(), contact_name || '', phone || '', email || '', address || '', notes || '', is_active !== undefined ? is_active : 1, req.params.id],
    async function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint')) {
          return res.status(409).json({ error: 'Supplier name already exists' });
        }
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Supplier not found' });
      }
      
      // Log activity
      if (activityLogger) {
        await activityLogger.log('update', 'supplier', req.params.id, name, `Updated supplier: ${name}`);
      }
      
      res.json({ message: 'Supplier updated successfully' });
    }
  );
});

app.delete('/api/suppliers/:id', async (req, res) => {
  // Check if any products use this supplier
  db.get('SELECT COUNT(*) as count FROM products WHERE supplier_id = ?', [req.params.id], async (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (row.count > 0) {
      return res.status(400).json({ 
        error: `Cannot delete supplier. ${row.count} product(s) are using this supplier. Please reassign them first.` 
      });
    }
    
    // Get supplier name for logging
    db.get('SELECT name FROM suppliers WHERE id = ?', [req.params.id], async (err, supplier) => {
      const supplierName = supplier ? supplier.name : 'Unknown';
      
      db.run('DELETE FROM suppliers WHERE id = ?', [req.params.id], async function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Supplier not found' });
        }
        
        // Log activity
        if (activityLogger) {
          await activityLogger.log('delete', 'supplier', req.params.id, supplierName, `Deleted supplier: ${supplierName}`);
        }
        
        res.json({ message: 'Supplier deleted successfully' });
      });
    });
  });
});

// ========== DASHBOARD API ==========

app.get('/api/dashboard/stats', (req, res) => {
  const cacheKey = 'dashboard:stats';
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);
  
  const stats = {};
  
  // Get total products and value
  db.get(`
    SELECT 
      COUNT(DISTINCT p.id) as total_products,
      COALESCE(SUM(ib.total_quantity), 0) as total_items,
      COALESCE(SUM((p.cost_per_case / NULLIF(p.items_per_case, 0)) * ib.total_quantity), 0) as total_value
    FROM products p
    LEFT JOIN inventory_batches ib ON p.id = ib.product_id
  `, [], (err, valueData) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    stats.totalProducts = valueData.total_products || 0;
    stats.totalItems = valueData.total_items || 0;
    stats.totalValue = valueData.total_value || 0;
    
    // Get low stock count (products with < 10 items)
    db.get(`
      SELECT COUNT(*) as low_stock
      FROM (
        SELECT p.id, COALESCE(SUM(ib.total_quantity), 0) as qty
        FROM products p
        LEFT JOIN inventory_batches ib ON p.id = ib.product_id
        GROUP BY p.id
        HAVING qty < 10 AND qty > 0
      )
    `, [], (err, lowStockData) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      stats.lowStock = lowStockData.low_stock || 0;
      
      // Get category breakdown
      db.all(`
        SELECT 
          COALESCE(c.name, 'Uncategorized') as category,
          COUNT(*) as count
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        GROUP BY c.name
        ORDER BY count DESC
        LIMIT 5
      `, [], (err, categoryData) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        stats.categoryBreakdown = categoryData || [];
        
        // Get recent products (last 5)
        db.all(`
          SELECT id, name, created_at
          FROM products
          ORDER BY created_at DESC
          LIMIT 5
        `, [], (err, recentProducts) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          stats.recentProducts = recentProducts || [];
          cache.set(cacheKey, stats, 30000); // 30s cache
          res.json(stats);
        });
      });
    });
  });
});

app.get('/api/dashboard/expiration-alerts', (req, res) => {
  const now = new Date().toISOString().split('T')[0];
  const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const alerts = {};
  
  // Expired items
  db.all(`
    SELECT 
      ib.id, ib.product_id, ib.total_quantity, ib.expiry_date, ib.location,
      p.name as product_name
    FROM inventory_batches ib
    JOIN products p ON ib.product_id = p.id
    WHERE ib.expiry_date IS NOT NULL AND ib.expiry_date < ?
    ORDER BY ib.expiry_date
  `, [now], (err, expired) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    alerts.expired = expired || [];
    
    // Expiring within 7 days (urgent)
    db.all(`
      SELECT 
        ib.id, ib.product_id, ib.total_quantity, ib.expiry_date, ib.location,
        p.name as product_name
      FROM inventory_batches ib
      JOIN products p ON ib.product_id = p.id
      WHERE ib.expiry_date IS NOT NULL 
        AND ib.expiry_date >= ? 
        AND ib.expiry_date <= ?
      ORDER BY ib.expiry_date
    `, [now, sevenDays], (err, urgent) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      alerts.urgent = urgent || [];
      
      // Expiring within 30 days (soon)
      db.all(`
        SELECT 
          ib.id, ib.product_id, ib.total_quantity, ib.expiry_date, ib.location,
          p.name as product_name
        FROM inventory_batches ib
        JOIN products p ON ib.product_id = p.id
        WHERE ib.expiry_date IS NOT NULL 
          AND ib.expiry_date > ? 
          AND ib.expiry_date <= ?
        ORDER BY ib.expiry_date
        LIMIT 10
      `, [sevenDays, thirtyDays], (err, soon) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        alerts.soon = soon || [];
        res.json(alerts);
      });
    });
  });
});

// ========== V0.6.0: SMART INVENTORY ACTIONS ==========

// FIFO/FEFO Batch Suggestion
app.get('/api/products/:id/batch-suggestion', (req, res) => {
  const productId = req.params.id;
  
  db.all(`
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
  `, [productId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
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
    
    res.json({
      suggestion: batch,
      urgency,
      reason,
      daysUntilExpiry
    });
  });
});

// Low Stock Alerts
app.get('/api/alerts/low-stock', (req, res) => {
  const threshold = parseInt(req.query.threshold) || 10;
  
  db.all(`
    SELECT 
      p.id, p.name, c.name as category,
      COALESCE(SUM(ib.total_quantity), 0) as total_quantity
    FROM products p
    LEFT JOIN inventory_batches ib ON p.id = ib.product_id
    LEFT JOIN categories c ON p.category_id = c.id
    GROUP BY p.id
    HAVING total_quantity > 0 AND total_quantity < ?
    ORDER BY total_quantity ASC
  `, [threshold], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Quick Quantity Adjustment
app.post('/api/inventory/batches/:id/adjust', async (req, res) => {
  const { adjustment, reason } = req.body;
  const batchId = req.params.id;
  
  if (!adjustment || adjustment === 0) {
    return res.status(400).json({ error: 'Adjustment value required' });
  }
  
  db.get('SELECT * FROM inventory_batches WHERE id = ?', [batchId], async (err, batch) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }
    
    const newQuantity = batch.total_quantity + adjustment;
    
    if (newQuantity < 0) {
      return res.status(400).json({ error: 'Cannot reduce quantity below zero' });
    }
    
    db.run(
      'UPDATE inventory_batches SET total_quantity = ?, case_quantity = ? WHERE id = ?',
      [newQuantity, Math.ceil(newQuantity / (batch.total_quantity / batch.case_quantity || 1)), batchId],
      async function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        // Log activity
        if (activityLogger) {
          await activityLogger.log(
            'update',
            'batch',
            batchId,
            `Batch #${batchId}`,
            `Adjusted quantity by ${adjustment > 0 ? '+' : ''}${adjustment} (${reason || 'Manual adjustment'})`,
            { old_quantity: batch.total_quantity },
            { new_quantity: newQuantity }
          );
        }
        
        res.json({ 
          message: 'Quantity adjusted', 
          newQuantity,
          adjustment,
          reason: reason || 'Manual adjustment'
        });
      }
    );
  });
});

// Mark Batch as Empty
app.post('/api/inventory/batches/:id/mark-empty', async (req, res) => {
  db.run(
    'UPDATE inventory_batches SET total_quantity = 0, case_quantity = 0 WHERE id = ?',
    [req.params.id],
    async function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Batch not found' });
      }
      
      // Log activity
      if (activityLogger) {
        await activityLogger.log(
          'update',
          'batch',
          req.params.id,
          `Batch #${req.params.id}`,
          'Marked batch as empty'
        );
      }
      
      res.json({ message: 'Batch marked as empty' });
    }
  );
});

// Bulk Delete Batches
app.post('/api/inventory/bulk/delete', async (req, res) => {
  const { batchIds } = req.body;
  
  if (!Array.isArray(batchIds) || batchIds.length === 0) {
    return res.status(400).json({ error: 'Batch IDs array required' });
  }
  
  const placeholders = batchIds.map(() => '?').join(',');
  
  db.run(
    `DELETE FROM inventory_batches WHERE id IN (${placeholders})`,
    batchIds,
    async function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Log activity
      if (activityLogger) {
        await activityLogger.log(
          'delete',
          'batch',
          0,
          'Multiple Batches',
          `Deleted ${this.changes} batch${this.changes !== 1 ? 'es' : ''}`
        );
      }
      
      res.json({ 
        message: `Deleted ${this.changes} batch${this.changes !== 1 ? 'es' : ''}`, 
        count: this.changes 
      });
    }
  );
});

// Bulk Update Location
app.post('/api/inventory/bulk/update-location', async (req, res) => {
  const { batchIds, location } = req.body;
  
  if (!Array.isArray(batchIds) || !location) {
    return res.status(400).json({ error: 'Batch IDs and location required' });
  }
  
  const placeholders = batchIds.map(() => '?').join(',');
  
  db.run(
    `UPDATE inventory_batches SET location = ? WHERE id IN (${placeholders})`,
    [location, ...batchIds],
    async function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Log activity
      if (activityLogger) {
        await activityLogger.log(
          'update',
          'batch',
          0,
          'Multiple Batches',
          `Updated location to "${location}" for ${this.changes} batch${this.changes !== 1 ? 'es' : ''}`
        );
      }
      
      res.json({ 
        message: `Updated ${this.changes} batch${this.changes !== 1 ? 'es' : ''}`, 
        count: this.changes 
      });
    }
  );
});

// Bulk Quantity Adjustment
app.post('/api/inventory/bulk/adjust', async (req, res) => {
  const { batchIds, adjustment } = req.body;
  
  if (!Array.isArray(batchIds) || adjustment === undefined) {
    return res.status(400).json({ error: 'Batch IDs and adjustment value required' });
  }
  
  const placeholders = batchIds.map(() => '?').join(',');
  
  db.run(
    `UPDATE inventory_batches 
     SET total_quantity = MAX(0, total_quantity + ?)
     WHERE id IN (${placeholders})`,
    [adjustment, ...batchIds],
    async function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Log activity
      if (activityLogger) {
        await activityLogger.log(
          'update',
          'batch',
          0,
          'Multiple Batches',
          `Adjusted quantity by ${adjustment > 0 ? '+' : ''}${adjustment} for ${this.changes} batch${this.changes !== 1 ? 'es' : ''}`
        );
      }
      
      res.json({ 
        message: `Adjusted ${this.changes} batch${this.changes !== 1 ? 'es' : ''}`, 
        count: this.changes 
      });
    }
  );
});

// ========== BACKUP SYSTEM ==========

app.post('/api/backup/create', async (req, res) => {
  try {
    const backup = await createBackup();
    const stats = fs.statSync(backup.path);
    res.json({ 
      message: 'Backup created successfully', 
      filename: backup.filename,
      size: stats.size,
      created: stats.mtime
    });
  } catch (error) {
    console.error('Backup creation error:', error);
    res.status(500).json({ error: 'Failed to create backup: ' + error.message });
  }
});

app.get('/api/backup/list', (req, res) => {
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

app.get('/api/backup/download/:filename', (req, res) => {
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

app.delete('/api/backup/delete/:filename', (req, res) => {
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

app.post('/api/backup/restore/:filename', async (req, res) => {
  const filename = req.params.filename;
  
  if (!filename.startsWith('backup_') || !filename.endsWith('.db')) {
    return res.status(400).json({ error: 'Invalid backup filename' });
  }
  
  const backupPath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(backupPath)) {
    return res.status(404).json({ error: 'Backup file not found' });
  }
  
  try {
    const safetyBackup = await createBackup();
    console.log(`Safety backup created: ${safetyBackup.filename}`);
    
    await new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    const dbPath = path.join(__dirname, 'inventory.db');
    fs.copyFileSync(backupPath, dbPath);
    console.log(`Database restored from: ${filename}`);
    
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error reopening database:', err);
      } else {
        console.log('Database reconnected after restore');
      }
    });
    
    res.json({ 
      message: 'Database restored successfully', 
      restoredFrom: filename,
      safetyBackup: safetyBackup.filename
    });
  } catch (error) {
    console.error('Restore error:', error);
    res.status(500).json({ error: 'Failed to restore backup: ' + error.message });
  }
});

app.post('/api/backup/upload', upload.single('backup'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  try {
    const safetyBackup = await createBackup();
    console.log(`Safety backup created: ${safetyBackup.filename}`);
    
    await new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    const dbPath = path.join(__dirname, 'inventory.db');
    fs.copyFileSync(req.file.path, dbPath);
    console.log(`Database restored from uploaded file: ${req.file.originalname}`);
    
    fs.unlinkSync(req.file.path);
    
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error reopening database:', err);
      } else {
        console.log('Database reconnected after restore');
      }
    });
    
    res.json({ 
      message: 'Database restored from upload successfully', 
      originalFilename: req.file.originalname,
      safetyBackup: safetyBackup.filename
    });
  } catch (error) {
    console.error('Upload restore error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Failed to restore from upload: ' + error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: VERSION, timestamp: new Date().toISOString() });
});

app.get('/api/version', async (req, res) => {
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
});

app.get('/api/products', (req, res) => {
  const { search } = req.query;
  let query = `
    SELECT p.*, c.name as category_name, c.color as category_color, c.icon as category_icon,
           s.name as supplier_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    WHERE 1=1
  `;
  const params = [];
  if (search) {
    query += ' AND (p.name LIKE ? OR p.barcode LIKE ? OR p.brand LIKE ? OR s.name LIKE ? OR p.inhouse_number LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }
  query += ' ORDER BY p.name';
  db.all(query, params, (err, rows) => {
    if (err) res.status(500).json({ error: err.message });
    else res.json(rows);
  });
});

app.get('/api/products/:id', (req, res) => {
  db.get(`
    SELECT p.*, c.name as category_name, c.color as category_color, c.icon as category_icon,
           s.name as supplier_name, s.phone as supplier_phone, s.email as supplier_email
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    WHERE p.id = ?
  `, [req.params.id], (err, row) => {
    if (err) res.status(500).json({ error: err.message });
    else if (!row) res.status(404).json({ error: 'Product not found' });
    else res.json(row);
  });
});

app.post('/api/products', async (req, res) => {
  const { name, inhouse_number, barcode, brand, supplier_id, category_id, items_per_case, cost_per_case, notes, 
          product_image, allergen_info, nutritional_data, storage_temp } = req.body;
  if (!name) return res.status(400).json({ error: 'Product name is required' });
  db.run(
    `INSERT INTO products (name, inhouse_number, barcode, brand, supplier_id, category_id, items_per_case, cost_per_case, notes,
                          product_image, allergen_info, nutritional_data, storage_temp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, inhouse_number || null, barcode || null, brand || null, supplier_id || null, category_id || null,
     items_per_case || null, cost_per_case || 0, notes || '', product_image || null, allergen_info || null,
     nutritional_data || null, storage_temp || null],
    async function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint')) {
          res.status(409).json({ error: 'A product with this barcode already exists' });
        } else {
          res.status(500).json({ error: err.message });
        }
      } else {
        // Log activity
        if (activityLogger) {
          await activityLogger.log('create', 'product', this.lastID, name, `Created product: ${name}`);
        }
        cache.invalidatePattern('products');
        res.json({ id: this.lastID, message: 'Product added successfully' });
      }
    }
  );
});

app.put('/api/products/:id', async (req, res) => {
  const { name, inhouse_number, barcode, brand, supplier_id, category_id, items_per_case, cost_per_case, notes,
          product_image, allergen_info, nutritional_data, storage_temp } = req.body;
  db.run(
    `UPDATE products
     SET name = ?, inhouse_number = ?, barcode = ?, brand = ?, supplier_id = ?, category_id = ?,
         items_per_case = ?, cost_per_case = ?, notes = ?, product_image = ?, allergen_info = ?,
         nutritional_data = ?, storage_temp = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [name, inhouse_number || null, barcode || null, brand || null, supplier_id || null, category_id || null,
     items_per_case || null, cost_per_case || 0, notes || '', product_image || null, allergen_info || null,
     nutritional_data || null, storage_temp || null, req.params.id],
    async function(err) {
      if (err) res.status(500).json({ error: err.message });
      else if (this.changes === 0) res.status(404).json({ error: 'Product not found' });
      else {
        // Log activity
        if (activityLogger) {
          await activityLogger.log('update', 'product', req.params.id, name, `Updated product: ${name}`);
        }
        cache.invalidatePattern('products');
        res.json({ message: 'Product updated successfully' });
      }
    }
  );
});

app.delete('/api/products/:id', async (req, res) => {
  // Get product name for logging
  db.get('SELECT name FROM products WHERE id = ?', [req.params.id], async (err, product) => {
    const productName = product ? product.name : 'Unknown';
    
    db.run('DELETE FROM products WHERE id = ?', [req.params.id], async function(err) {
      if (err) res.status(500).json({ error: err.message });
      else if (this.changes === 0) res.status(404).json({ error: 'Product not found' });
      else {
        // Log activity
        if (activityLogger) {
          await activityLogger.log('delete', 'product', req.params.id, productName, `Deleted product: ${productName}`);
        }
        cache.invalidatePattern('products');
        res.json({ message: 'Product deleted successfully' });
      }
    });
  });
});

app.get('/api/inventory/summary', (req, res) => {
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
  db.all(query, params, (err, rows) => {
    if (err) res.status(500).json({ error: err.message });
    else res.json(rows);
  });
});

app.get('/api/inventory/value', (req, res) => {
  const query = `
    SELECT 
      COUNT(DISTINCT p.id) as total_products,
      COALESCE(SUM(ib.total_quantity), 0) as total_items,
      COALESCE(SUM((p.cost_per_case / NULLIF(p.items_per_case, 0)) * ib.total_quantity), 0) as total_value
    FROM products p
    LEFT JOIN inventory_batches ib ON p.id = ib.product_id
  `;
  db.get(query, [], (err, row) => {
    if (err) res.status(500).json({ error: err.message });
    else res.json(row);
  });
});

app.get('/api/products/:id/batches', (req, res) => {
  db.all(
    'SELECT * FROM inventory_batches WHERE product_id = ? ORDER BY expiry_date, received_date',
    [req.params.id],
    (err, rows) => {
      if (err) res.status(500).json({ error: err.message });
      else res.json(rows);
    }
  );
});

app.get('/api/inventory/batches/:id', (req, res) => {
  db.get('SELECT * FROM inventory_batches WHERE id = ?', [req.params.id], (err, row) => {
    if (err) res.status(500).json({ error: err.message });
    else if (!row) res.status(404).json({ error: 'Batch not found' });
    else res.json(row);
  });
});

app.post('/api/inventory/batches', async (req, res) => {
  const { product_id, case_quantity, expiry_date, location, notes } = req.body;
  if (!product_id || !case_quantity) {
    return res.status(400).json({ error: 'Product ID and case quantity are required' });
  }
  db.get('SELECT items_per_case, name FROM products WHERE id = ?', [product_id], async (err, product) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const itemsPerCase = product.items_per_case || 1;
    const totalQuantity = case_quantity * itemsPerCase;
    db.run(
      `INSERT INTO inventory_batches (product_id, case_quantity, total_quantity, expiry_date, location, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [product_id, case_quantity, totalQuantity, expiry_date || null, location || '', notes || ''],
      async function(err) {
        if (err) res.status(500).json({ error: err.message });
        else {
          // Log activity
          if (activityLogger) {
            await activityLogger.log(
              'create',
              'batch',
              this.lastID,
              `Batch for ${product.name}`,
              `Added batch: ${case_quantity} cases (${totalQuantity} items)${expiry_date ? `, expires ${expiry_date}` : ''}`,
              null,
              { product_id, case_quantity, total_quantity: totalQuantity, expiry_date, location }
            );
          }
          res.json({ id: this.lastID, total_quantity: totalQuantity, message: 'Batch added successfully' });
        }
      }
    );
  });
});

app.put('/api/inventory/batches/:id', async (req, res) => {
  const { case_quantity, total_quantity, expiry_date, location, notes } = req.body;
  db.run(
    `UPDATE inventory_batches
     SET case_quantity = ?, total_quantity = ?, expiry_date = ?, location = ?, notes = ?
     WHERE id = ?`,
    [case_quantity, total_quantity, expiry_date || null, location || '', notes || '', req.params.id],
    async function(err) {
      if (err) res.status(500).json({ error: err.message });
      else if (this.changes === 0) res.status(404).json({ error: 'Batch not found' });
      else {
        // Log activity
        if (activityLogger) {
          await activityLogger.log('update', 'batch', req.params.id, `Batch #${req.params.id}`, `Updated batch details`);
        }
        res.json({ message: 'Batch updated successfully' });
      }
    }
  );
});

app.delete('/api/inventory/batches/:id', async (req, res) => {
  db.run('DELETE FROM inventory_batches WHERE id = ?', [req.params.id], async function(err) {
    if (err) res.status(500).json({ error: err.message });
    else if (this.changes === 0) res.status(404).json({ error: 'Batch not found' });
    else {
      // Log activity
      if (activityLogger) {
        await activityLogger.log('delete', 'batch', req.params.id, `Batch #${req.params.id}`, `Deleted batch`);
      }
      res.json({ message: 'Batch deleted successfully' });
    }
  });
});

app.post('/api/database/reset', (req, res) => {
  db.run('DELETE FROM inventory_batches', (err) => {
    if (err) return res.status(500).json({ error: 'Failed to delete batches: ' + err.message });
    db.run('DELETE FROM products', (err) => {
      if (err) return res.status(500).json({ error: 'Failed to delete products: ' + err.message });
      db.run('DELETE FROM sqlite_sequence WHERE name="products" OR name="inventory_batches"', (err) => {
        if (err) console.error('Failed to reset autoincrement:', err);
        console.log('Database reset completed');
        res.json({ message: 'Database reset successful. All data has been deleted.', timestamp: new Date().toISOString() });
      });
    });
  });
});

app.get('/api/export/inventory', (req, res) => {
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
  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
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
  });
});

function escapeCSV(field) {
  if (field === null || field === undefined) return '';
  const stringField = String(field);
  if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }
  return stringField;
}

app.post('/api/import/inventory', async (req, res) => {
  try {
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
        const existingProduct = await new Promise((resolve, reject) => {
          if (data['Barcode']) {
            db.get('SELECT * FROM products WHERE barcode = ?', [data['Barcode']], (err, row) => {
              if (err) reject(err); else resolve(row);
            });
          } else {
            db.get('SELECT * FROM products WHERE name = ?', [productName], (err, row) => {
              if (err) reject(err); else resolve(row);
            });
          }
        });
        let productId;
        if (existingProduct) {
          await new Promise((resolve, reject) => {
            db.run(
              `UPDATE products SET inhouse_number = COALESCE(?, inhouse_number),
               brand = COALESCE(?, brand), items_per_case = COALESCE(?, items_per_case), 
               cost_per_case = COALESCE(?, cost_per_case), notes = COALESCE(?, notes), 
               updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
              [data['In-House Number'], data['Brand'], data['Items Per Case'], 
               data['Cost Per Case'] || 0, data['Product Notes'], existingProduct.id],
              (err) => { if (err) reject(err); else resolve(); }
            );
          });
          productId = existingProduct.id;
          productsUpdated++;
        } else {
          productId = await new Promise((resolve, reject) => {
            db.run(
              `INSERT INTO products (name, inhouse_number, barcode, brand, items_per_case, cost_per_case, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [productName, data['In-House Number'], data['Barcode'], data['Brand'], 
               data['Items Per Case'] || 1, data['Cost Per Case'] || 0, data['Product Notes'] || ''],
              function(err) { if (err) reject(err); else resolve(this.lastID); }
            );
          });
          productsCreated++;
        }
        if (data['Case Quantity'] && parseInt(data['Case Quantity']) > 0) {
          await new Promise((resolve, reject) => {
            db.run(
              `INSERT INTO inventory_batches (product_id, case_quantity, total_quantity, expiry_date, location, notes, received_date)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [productId, data['Case Quantity'], data['Total Quantity'] || data['Case Quantity'], 
               data['Expiration Date'], data['Location'] || '', data['Batch Notes'] || '', 
               data['Received Date'] || new Date().toISOString()],
              function(err) { if (err) reject(err); else resolve(); }
            );
          });
          batchesCreated++;
        }
      } catch (rowError) {
        console.error('Error processing row:', rowError);
        errors++;
      }
    }
    res.json({ message: 'Import completed', productsCreated, productsUpdated, batchesCreated, errors, totalRows: rows.length });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Failed to import CSV: ' + error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Grocery Inventory Management v${VERSION}`);
  console.log(`Server running on port ${PORT}`);
  console.log(`Access at http://localhost:${PORT}`);
  console.log('✨ Cache busting enabled');
  console.log('💰 Product-level pricing enabled');
  console.log(`💾 Backup system enabled - Max ${MAX_BACKUPS} backups retained`);
  console.log('📤 Backup restore & upload enabled');
  console.log('📊 Dashboard with expiration alerts enabled');
  console.log('📋 Changelog API enabled');
  console.log('🎯 v0.6.0: Smart inventory actions enabled');
  console.log('🔧 v0.7.0: Migration system enabled');
  console.log('📡 Update channel system enabled');
  console.log('🏷️  v0.7.4: Categories & Suppliers management enabled');
  console.log('📝 v0.8.0: Activity logging, reports, and dark mode enabled');
  console.log(`Current channel: ${getCurrentChannel()}`);
  console.log('Checking for updates from GitHub...');
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
    .catch(err => { console.log(`Could not check for updates: ${err.message}`); });
});

process.on('SIGINT', () => {
  db.close((err) => {
    if (err) console.error('Error closing database:', err);
    else console.log('Database connection closed');
    process.exit(0);
  });
});