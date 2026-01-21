const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const https = require('https');
const multer = require('multer');

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

let db = new sqlite3.Database('./inventory.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initDatabase();
  }
});

function initDatabase() {
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
      console.error('Error creating products table:', err);
    } else {
      db.run(`ALTER TABLE products ADD COLUMN cost_per_case REAL DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding cost_per_case column:', err);
        }
      });
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
    if (err) console.error('Error creating inventory_batches table:', err);
    else migrateLegacyData();
  });
}

function migrateLegacyData() {
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='inventory'", (err, row) => {
    if (!row) return;
    console.log('Migrating legacy inventory data...');
    db.all('SELECT * FROM inventory', [], (err, items) => {
      if (err || !items || items.length === 0) {
        console.log('No legacy data to migrate');
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

// ========== BACKUP SYSTEM ==========

function createBackup() {
  return new Promise((resolve, reject) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
    const backupName = `backup_${timestamp}.db`;
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
    const updateInfo = await checkGitHubVersion();
    res.json(updateInfo);
  } catch (error) {
    console.error('Error checking GitHub version:', error.message);
    res.json({
      latestVersion: VERSION,
      currentVersion: VERSION,
      updateAvailable: false,
      error: 'Could not check for updates'
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
    if (err) return res.status(500).json({ error: 'Failed to delete batches: ' + error.message });
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
  console.log('Checking for updates from GitHub...');
  checkGitHubVersion()
    .then(info => {
      if (info.updateAvailable) {
        console.log(`\n⚠️  UPDATE AVAILABLE!`);
        console.log(`   Current: ${info.currentVersion}`);
        console.log(`   Latest:  ${info.latestVersion}`);
        console.log(`   Run 'update' command to upgrade\n`);
      } else {
        console.log(`✓ Running latest version (${VERSION})`);
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