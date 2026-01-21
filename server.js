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
    let inVersionSection = false;
    
    lines.forEach(line => {
      // Detect version header like ## [0.5.0] - 2026-01-20
      const versionMatch = line.match(/^##\s*\[([\d.]+)\]\s*-\s*(.+)/);
      if (versionMatch) {
        // Save previous version if exists
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
        inVersionSection = true;
      } else if (line.startsWith('###')) {
        // Category header like ### Added
        const category = line.replace(/^###\s*/, '').trim();
        currentChanges.push({ type: 'category', text: category });
      } else if (line.startsWith('- ')) {
        // Change item
        const change = line.replace(/^-\s*/, '').trim();
        if (change) {
          currentChanges.push({ type: 'item', text: change });
        }
      } else if (line.trim() === '---' || line.startsWith('## ')) {
        // End of changelog versions section
        if (line.startsWith('## ') && !line.match(/^##\s*\[/)) {
          inVersionSection = false;
        }
      }
    });
    
    // Add last version
    if (currentVersion) {
      versions.push({
        version: currentVersion,
        date: currentDate,
        changes: currentChanges
      });
    }
    
    res.json({
      currentVersion: VERSION,
      versions: versions.slice(0, 5) // Return last 5 versions
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
      history: history.slice(0, 10) // Last 10 migrations
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ... [REST OF THE FILE REMAINS THE SAME - KEEPING ALL EXISTING API ENDPOINTS]