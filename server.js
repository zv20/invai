const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const https = require('https');
const multer = require('multer');
const MigrationRunner = require('./migrations/migration-runner');

const packageJson = require('./package.json');
const app = express();
const PORT = process.env.PORT || 3000;
const VERSION = packageJson.version;
const GITHUB_REPO = 'zv20/invai';
const BACKUP_DIR = path.join(__dirname, 'backups');
const MAX_BACKUPS = 10;

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

function checkGitHubVersion() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_REPO}/commits/main`,
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
            path: `/${GITHUB_REPO}/main/package.json`,
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

// ========== BACKUP SYSTEM ========== (continues in batch 2)