const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;
const VERSION = '2.0.3';
const GITHUB_REPO = 'zv20/invai'; // GitHub repo to check for updates

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.text({ limit: '10mb' }));
app.use(express.static('public'));

// Database setup
const db = new sqlite3.Database('./inventory.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initDatabase();
  }
});

// Initialize database tables
function initDatabase() {
  // Products table - master product definitions
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      inhouse_number TEXT,
      barcode TEXT UNIQUE,
      brand TEXT,
      supplier TEXT,
      items_per_case INTEGER,
      category TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Error creating products table:', err);
  });

  // Inventory batches table - specific deliveries with expiry dates
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

// Migrate legacy inventory data to new structure
function migrateLegacyData() {
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='inventory'", (err, row) => {
    if (!row) return; // No legacy table
    
    console.log('Migrating legacy inventory data...');
    
    db.all('SELECT * FROM inventory', [], (err, items) => {
      if (err || !items || items.length === 0) {
        console.log('No legacy data to migrate');
        return;
      }
      
      items.forEach(item => {
        // Insert into products
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
            
            // Insert into inventory_batches
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
      
      // Rename old table
      db.run('ALTER TABLE inventory RENAME TO inventory_old', (err) => {
        if (!err) console.log('Legacy table renamed to inventory_old (safe to delete later)');
      });
    });
  });
}

// Check GitHub for latest version
function checkGitHubVersion() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_REPO}/commits/main`,
      method: 'GET',
      headers: {
        'User-Agent': 'Grocery-Inventory-App'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const commit = JSON.parse(data);
          
          // Try to get version from package.json in latest commit
          const pkgOptions = {
            hostname: 'raw.githubusercontent.com',
            path: `/${GITHUB_REPO}/main/package.json`,
            method: 'GET',
            headers: {
              'User-Agent': 'Grocery-Inventory-App'
            }
          };

          const pkgReq = https.request(pkgOptions, (pkgRes) => {
            let pkgData = '';

            pkgRes.on('data', (chunk) => {
              pkgData += chunk;
            });

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
              } catch (err) {
                reject(err);
              }
            });
          });

          pkgReq.on('error', reject);
          pkgReq.end();

        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: VERSION, timestamp: new Date().toISOString() });
});

// Get version info and check for updates
app.get('/api/version', async (req, res) => {
  try {
    const updateInfo = await checkGitHubVersion();
    res.json(updateInfo);
  } catch (error) {
    console.error('Error checking GitHub version:', error.message);
    // Fallback to local version if GitHub check fails
    res.json({
      latestVersion: VERSION,
      currentVersion: VERSION,
      updateAvailable: false,
      error: 'Could not check for updates'
    });
  }
});

// Get all products
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
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// Get single product
app.get('/api/products/:id', (req, res) => {
  db.get('SELECT * FROM products WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!row) {
      res.status(404).json({ error: 'Product not found' });
    } else {
      res.json(row);
    }
  });
});

// Add new product
app.post('/api/products', (req, res) => {
  const { name, inhouse_number, barcode, brand, supplier, items_per_case, category, notes } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Product name is required' });
  }

  db.run(
    `INSERT INTO products (name, inhouse_number, barcode, brand, supplier, items_per_case, category, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, inhouse_number || null, barcode || null, brand || null, supplier || null,
     items_per_case || null, category || '', notes || ''],
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

// Update product
app.put('/api/products/:id', (req, res) => {
  const { name, inhouse_number, barcode, brand, supplier, items_per_case, category, notes } = req.body;

  db.run(
    `UPDATE products
     SET name = ?, inhouse_number = ?, barcode = ?, brand = ?, supplier = ?,
         items_per_case = ?, category = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [name, inhouse_number || null, barcode || null, brand || null, supplier || null,
     items_per_case || null, category || '', notes || '', req.params.id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else if (this.changes === 0) {
        res.status(404).json({ error: 'Product not found' });
      } else {
        res.json({ message: 'Product updated successfully' });
      }
    }
  );
});

// Delete product (cascades to batches)
app.delete('/api/products/:id', (req, res) => {
  db.run('DELETE FROM products WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'Product not found' });
    } else {
      res.json({ message: 'Product deleted successfully' });
    }
  });
});

// Get inventory summary (products with total quantities)
app.get('/api/inventory/summary', (req, res) => {
  const { search, category } = req.query;
  
  let query = `
    SELECT 
      p.*,
      COALESCE(SUM(ib.total_quantity), 0) as total_quantity,
      COUNT(ib.id) as batch_count,
      MIN(ib.expiry_date) as earliest_expiry
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
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// Get batches for a product
app.get('/api/products/:id/batches', (req, res) => {
  db.all(
    'SELECT * FROM inventory_batches WHERE product_id = ? ORDER BY expiry_date, received_date',
    [req.params.id],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json(rows);
      }
    }
  );
});

// Get single inventory batch
app.get('/api/inventory/batches/:id', (req, res) => {
  db.get('SELECT * FROM inventory_batches WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!row) {
      res.status(404).json({ error: 'Batch not found' });
    } else {
      res.json(row);
    }
  });
});

// Add inventory batch
app.post('/api/inventory/batches', (req, res) => {
  const { product_id, case_quantity, expiry_date, location, notes } = req.body;

  if (!product_id || !case_quantity) {
    return res.status(400).json({ error: 'Product ID and case quantity are required' });
  }

  // Get product to calculate total quantity
  db.get('SELECT items_per_case FROM products WHERE id = ?', [product_id], (err, product) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const itemsPerCase = product.items_per_case || 1;
    const totalQuantity = case_quantity * itemsPerCase;

    db.run(
      `INSERT INTO inventory_batches (product_id, case_quantity, total_quantity, expiry_date, location, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [product_id, case_quantity, totalQuantity, expiry_date || null, location || '', notes || ''],
      function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
        } else {
          res.json({ id: this.lastID, total_quantity: totalQuantity, message: 'Batch added successfully' });
        }
      }
    );
  });
});

// Update inventory batch
app.put('/api/inventory/batches/:id', (req, res) => {
  const { case_quantity, total_quantity, expiry_date, location, notes } = req.body;

  db.run(
    `UPDATE inventory_batches
     SET case_quantity = ?, total_quantity = ?, expiry_date = ?, location = ?, notes = ?
     WHERE id = ?`,
    [case_quantity, total_quantity, expiry_date || null, location || '', notes || '', req.params.id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else if (this.changes === 0) {
        res.status(404).json({ error: 'Batch not found' });
      } else {
        res.json({ message: 'Batch updated successfully' });
      }
    }
  );
});

// Delete inventory batch
app.delete('/api/inventory/batches/:id', (req, res) => {
  db.run('DELETE FROM inventory_batches WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'Batch not found' });
    } else {
      res.json({ message: 'Batch deleted successfully' });
    }
  });
});

// Export inventory to CSV
app.get('/api/export/inventory', (req, res) => {
  const query = `
    SELECT 
      p.name, p.inhouse_number, p.barcode, p.brand, p.supplier,
      p.items_per_case, p.category,
      ib.case_quantity, ib.total_quantity, ib.expiry_date, ib.location,
      ib.received_date, ib.notes as batch_notes, p.notes as product_notes
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
      'Items Per Case', 'Category', 'Case Quantity', 'Total Quantity',
      'Expiration Date', 'Location', 'Received Date', 'Batch Notes', 'Product Notes'
    ];
    
    let csv = headers.join(',') + '\n';
    
    rows.forEach(row => {
      const rowData = [
        escapeCSV(row.name),
        escapeCSV(row.inhouse_number),
        escapeCSV(row.barcode),
        escapeCSV(row.brand),
        escapeCSV(row.supplier),
        escapeCSV(row.items_per_case),
        escapeCSV(row.category),
        escapeCSV(row.case_quantity),
        escapeCSV(row.total_quantity),
        escapeCSV(row.expiry_date),
        escapeCSV(row.location),
        escapeCSV(row.received_date),
        escapeCSV(row.batch_notes),
        escapeCSV(row.product_notes)
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

// Get categories
app.get('/api/categories', (req, res) => {
  db.all('SELECT DISTINCT category FROM products WHERE category != "" ORDER BY category', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows.map(row => row.category));
    }
  });
});

// Get suppliers
app.get('/api/suppliers', (req, res) => {
  db.all('SELECT DISTINCT supplier FROM products WHERE supplier != "" AND supplier IS NOT NULL ORDER BY supplier', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows.map(row => row.supplier));
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Grocery Inventory Management v${VERSION}`);
  console.log(`Server running on port ${PORT}`);
  console.log(`Access at http://localhost:${PORT}`);
  console.log('Checking for updates from GitHub...');
  
  // Check for updates on startup
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
    .catch(err => {
      console.log(`Could not check for updates: ${err.message}`);
    });
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});