const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const https = require('https');
const multer = require('multer');
const { execSync } = require('child_process');
const MigrationRunner = require('./migrations/migration-runner');

const packageJson = require('./package.json');
const app = express();
const PORT = process.env.PORT || 3000;
const VERSION = packageJson.version;
const GITHUB_REPO = 'zv20/invai';
const BACKUP_DIR = path.join(__dirname, 'backups');
const MAX_BACKUPS = 10;
const UPDATE_CHANNEL_FILE = path.join(__dirname, '.update-channel');

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
  }
});

/**
 * Initialize database with migration system
 */
async function initializeDatabase() {
  try {
    // First, ensure basic tables exist (for first-time setup)
    await initDatabase();
    
    // Then run migration system
    console.log('\n🔧 Checking database migrations...');
    
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
      branch: 'develop'
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
  
  const targetBranch = channel === 'stable' ? 'main' : 'develop';
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

// ========== DASHBOARD API ==========

app.get('/api/dashboard/stats', (req, res) => {
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
          CASE WHEN p.category IS NULL OR p.category = '' THEN 'Uncategorized' ELSE p.category END as category,
          COUNT(*) as count
        FROM products p
        GROUP BY category
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
      p.id, p.name, p.category,
      COALESCE(SUM(ib.total_quantity), 0) as total_quantity
    FROM products p
    LEFT JOIN inventory_batches ib ON p.id = ib.product_id
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
app.post('/api/inventory/batches/:id/adjust', (req, res) => {
  const { adjustment, reason } = req.body;
  const batchId = req.params.id;
  
  if (!adjustment || adjustment === 0) {
    return res.status(400).json({ error: 'Adjustment value required' });
  }
  
  db.get('SELECT * FROM inventory_batches WHERE id = ?', [batchId], (err, batch) => {
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
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
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
app.post('/api/inventory/batches/:id/mark-empty', (req, res) => {
  db.run(
    'UPDATE inventory_batches SET total_quantity = 0, case_quantity = 0 WHERE id = ?',
    [req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Batch not found' });
      }
      res.json({ message: 'Batch marked as empty' });
    }
  );
});

// Bulk Delete Batches
app.post('/api/inventory/bulk/delete', (req, res) => {
  const { batchIds } = req.body;
  
  if (!Array.isArray(batchIds) || batchIds.length === 0) {
    return res.status(400).json({ error: 'Batch IDs array required' });
  }
  
  const placeholders = batchIds.map(() => '?').join(',');
  
  db.run(
    `DELETE FROM inventory_batches WHERE id IN (${placeholders})`,
    batchIds,
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ 
        message: `Deleted ${this.changes} batch${this.changes !== 1 ? 'es' : ''}`, 
        count: this.changes 
      });
    }
  );
});

// Bulk Update Location
app.post('/api/inventory/bulk/update-location', (req, res) => {
  const { batchIds, location } = req.body;
  
  if (!Array.isArray(batchIds) || !location) {
    return res.status(400).json({ error: 'Batch IDs and location required' });
  }
  
  const placeholders = batchIds.map(() => '?').join(',');
  
  db.run(
    `UPDATE inventory_batches SET location = ? WHERE id IN (${placeholders})`,
    [location, ...batchIds],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ 
        message: `Updated ${this.changes} batch${this.changes !== 1 ? 'es' : ''}`, 
        count: this.changes 
      });
    }
  );
});

// Bulk Quantity Adjustment
app.post('/api/inventory/bulk/adjust', (req, res) => {
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
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
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
    const targetBranch = currentChannel === 'stable' ? 'main' : 'develop';
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
  let query = 'SELECT * FROM products WHERE 1=1';
  const params = [];
  if (search) {
    query += ' AND (name LIKE ? OR barcode LIKE ? OR brand LIKE ? OR supplier LIKE ? OR inhouse_number LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }
  query += ' ORDER BY name';
  db.all(query, params, (err, rows) => {
    if (err) res.status(500).json({ error: err.message });
    else res.json(rows);
  });
});

app.get('/api/products/:id', (req, res) => {
  db.get('SELECT * FROM products WHERE id = ?', [req.params.id], (err, row) => {
    if (err) res.status(500).json({ error: err.message });
    else if (!row) res.status(404).json({ error: 'Product not found' });
    else res.json(row);
  });
});

app.post('/api/products', (req, res) => {
  const { name, inhouse_number, barcode, brand, supplier, items_per_case, cost_per_case, category, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Product name is required' });
  db.run(
    `INSERT INTO products (name, inhouse_number, barcode, brand, supplier, items_per_case, cost_per_case, category, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, inhouse_number || null, barcode || null, brand || null, supplier || null,
     items_per_case || null, cost_per_case || 0, category || '', notes || ''],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint')) {
          res.status(409).json({ error: 'A product with this barcode already exists' });
        } else {
          res.status(500).json({ error: err.message });
        }
      } else {
        res.json({ id: this.lastID, message: 'Product added successfully' });
      }
    }
  );
});

app.put('/api/products/:id', (req, res) => {
  const { name, inhouse_number, barcode, brand, supplier, items_per_case, cost_per_case, category, notes } = req.body;
  db.run(
    `UPDATE products
     SET name = ?, inhouse_number = ?, barcode = ?, brand = ?, supplier = ?,
         items_per_case = ?, cost_per_case = ?, category = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [name, inhouse_number || null, barcode || null, brand || null, supplier || null,
     items_per_case || null, cost_per_case || 0, category || '', notes || '', req.params.id],
    function(err) {
      if (err) res.status(500).json({ error: err.message });
      else if (this.changes === 0) res.status(404).json({ error: 'Product not found' });
      else res.json({ message: 'Product updated successfully' });
    }
  );
});

app.delete('/api/products/:id', (req, res) => {
  db.run('DELETE FROM products WHERE id = ?', [req.params.id], function(err) {
    if (err) res.status(500).json({ error: err.message });
    else if (this.changes === 0) res.status(404).json({ error: 'Product not found' });
    else res.json({ message: 'Product deleted successfully' });
  });
});

app.get('/api/inventory/summary', (req, res) => {
  const { search, category } = req.query;
  let query = `
    SELECT p.*, COALESCE(SUM(ib.total_quantity), 0) as total_quantity,
           COUNT(ib.id) as batch_count, MIN(ib.expiry_date) as earliest_expiry
    FROM products p
    LEFT JOIN inventory_batches ib ON p.id = ib.product_id
    WHERE 1=1
  `;
  const params = [];
  if (search) {
    query += ' AND (p.name LIKE ? OR p.barcode LIKE ? OR p.brand LIKE ? OR p.supplier LIKE ? OR p.inhouse_number LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }
  if (category && category !== 'all') {
    query += ' AND p.category = ?';
    params.push(category);
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

app.post('/api/inventory/batches', (req, res) => {
  const { product_id, case_quantity, expiry_date, location, notes } = req.body;
  if (!product_id || !case_quantity) {
    return res.status(400).json({ error: 'Product ID and case quantity are required' });
  }
  db.get('SELECT items_per_case FROM products WHERE id = ?', [product_id], (err, product) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const itemsPerCase = product.items_per_case || 1;
    const totalQuantity = case_quantity * itemsPerCase;
    db.run(
      `INSERT INTO inventory_batches (product_id, case_quantity, total_quantity, expiry_date, location, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [product_id, case_quantity, totalQuantity, expiry_date || null, location || '', notes || ''],
      function(err) {
        if (err) res.status(500).json({ error: err.message });
        else res.json({ id: this.lastID, total_quantity: totalQuantity, message: 'Batch added successfully' });
      }
    );
  });
});

app.put('/api/inventory/batches/:id', (req, res) => {
  const { case_quantity, total_quantity, expiry_date, location, notes } = req.body;
  db.run(
    `UPDATE inventory_batches
     SET case_quantity = ?, total_quantity = ?, expiry_date = ?, location = ?, notes = ?
     WHERE id = ?`,
    [case_quantity, total_quantity, expiry_date || null, location || '', notes || '', req.params.id],
    function(err) {
      if (err) res.status(500).json({ error: err.message });
      else if (this.changes === 0) res.status(404).json({ error: 'Batch not found' });
      else res.json({ message: 'Batch updated successfully' });
    }
  );
});

app.delete('/api/inventory/batches/:id', (req, res) => {
  db.run('DELETE FROM inventory_batches WHERE id = ?', [req.params.id], function(err) {
    if (err) res.status(500).json({ error: err.message });
    else if (this.changes === 0) res.status(404).json({ error: 'Batch not found' });
    else res.json({ message: 'Batch deleted successfully' });
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
    SELECT p.name, p.inhouse_number, p.barcode, p.brand, p.supplier, p.items_per_case, p.cost_per_case, p.category,
           ib.case_quantity, ib.total_quantity, ib.expiry_date, ib.location, ib.received_date,
           ib.notes as batch_notes, p.notes as product_notes
    FROM products p
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
               brand = COALESCE(?, brand), supplier = COALESCE(?, supplier),
               items_per_case = COALESCE(?, items_per_case), cost_per_case = COALESCE(?, cost_per_case),
               category = COALESCE(?, category), notes = COALESCE(?, notes), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
              [data['In-House Number'], data['Brand'], data['Supplier'], 
               data['Items Per Case'], data['Cost Per Case'] || 0, data['Category'], data['Product Notes'], existingProduct.id],
              (err) => { if (err) reject(err); else resolve(); }
            );
          });
          productId = existingProduct.id;
          productsUpdated++;
        } else {
          productId = await new Promise((resolve, reject) => {
            db.run(
              `INSERT INTO products (name, inhouse_number, barcode, brand, supplier, items_per_case, cost_per_case, category, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [productName, data['In-House Number'], data['Barcode'], data['Brand'], 
               data['Supplier'], data['Items Per Case'] || 1, data['Cost Per Case'] || 0, data['Category'] || '', data['Product Notes'] || ''],
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

app.get('/api/categories', (req, res) => {
  db.all('SELECT DISTINCT category FROM products WHERE category != "" ORDER BY category', (err, rows) => {
    if (err) res.status(500).json({ error: err.message });
    else res.json(rows.map(row => row.category));
  });
});

app.get('/api/suppliers', (req, res) => {
  db.all('SELECT DISTINCT supplier FROM products WHERE supplier != "" AND supplier IS NOT NULL ORDER BY supplier', (err, rows) => {
    if (err) res.status(500).json({ error: err.message });
    else res.json(rows.map(row => row.supplier));
  });
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
  console.log(`Current channel: ${getCurrentChannel()}`);
  console.log('Checking for updates from GitHub...');
  const currentChannel = getCurrentChannel();
  const targetBranch = currentChannel === 'stable' ? 'main' : 'develop';
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