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