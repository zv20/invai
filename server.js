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

// Restore from existing backup
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
    // Create safety backup before restore
    const safetyBackup = await createBackup();
    console.log(`Safety backup created: ${safetyBackup.filename}`);
    
    // Close database connection
    await new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // Replace database file
    const dbPath = path.join(__dirname, 'inventory.db');
    fs.copyFileSync(backupPath, dbPath);
    console.log(`Database restored from: ${filename}`);
    
    // Reopen database
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

// Upload and restore from file
app.post('/api/backup/upload', upload.single('backup'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  try {
    // Create safety backup before restore
    const safetyBackup = await createBackup();
    console.log(`Safety backup created: ${safetyBackup.filename}`);
    
    // Close database connection
    await new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // Replace database file with uploaded file
    const dbPath = path.join(__dirname, 'inventory.db');
    fs.copyFileSync(req.file.path, dbPath);
    console.log(`Database restored from uploaded file: ${req.file.originalname}`);
    
    // Delete temp file
    fs.unlinkSync(req.file.path);
    
    // Reopen database
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
    // Try to delete temp file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Failed to restore from upload: ' + error.message });
  }
});

// ========== EXISTING API ENDPOINTS ==========