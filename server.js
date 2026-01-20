const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
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
  db.run(`
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      inhouse_number TEXT,
      barcode TEXT,
      brand TEXT,
      quantity INTEGER NOT NULL,
      expiry_date TEXT,
      category TEXT,
      location TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating table:', err);
    } else {
      console.log('Database initialized');
      // Migrate existing database to add new columns
      migrateDatabase();
    }
  });
}

// Database migration to add new columns to existing databases
function migrateDatabase() {
  db.all("PRAGMA table_info(inventory)", (err, columns) => {
    if (err) {
      console.error('Error checking table schema:', err);
      return;
    }
    
    const columnNames = columns.map(col => col.name);
    
    // Check and add missing columns
    const migrations = [
      { column: 'barcode', type: 'TEXT' },
      { column: 'inhouse_number', type: 'TEXT' },
      { column: 'brand', type: 'TEXT' },
      { column: 'expiry_date', type: 'TEXT' }
    ];
    
    migrations.forEach(migration => {
      if (!columnNames.includes(migration.column)) {
        console.log(`Adding ${migration.column} column to database...`);
        db.run(`ALTER TABLE inventory ADD COLUMN ${migration.column} ${migration.type}`, (err) => {
          if (err) {
            console.error(`Error adding ${migration.column} column:`, err);
          } else {
            console.log(`${migration.column} column added successfully`);
          }
        });
      }
    });
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get all inventory items
app.get('/api/inventory', (req, res) => {
  const { search, category } = req.query;
  let query = 'SELECT * FROM inventory WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (name LIKE ? OR notes LIKE ? OR barcode LIKE ? OR brand LIKE ? OR inhouse_number LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }

  if (category && category !== 'all') {
    query += ' AND category = ?';
    params.push(category);
  }

  query += ' ORDER BY updated_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// Get single inventory item
app.get('/api/inventory/:id', (req, res) => {
  db.get('SELECT * FROM inventory WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!row) {
      res.status(404).json({ error: 'Item not found' });
    } else {
      res.json(row);
    }
  });
});

// Add new inventory item
app.post('/api/inventory', (req, res) => {
  const { name, inhouse_number, barcode, brand, quantity, expiry_date, category, location, notes } = req.body;

  if (!name || quantity === undefined) {
    return res.status(400).json({ error: 'Name and quantity are required' });
  }

  // Check if barcode already exists (only if barcode is provided)
  if (barcode) {
    db.get('SELECT id FROM inventory WHERE barcode = ?', [barcode], (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (row) {
        return res.status(409).json({ error: 'An item with this barcode already exists', existingId: row.id });
      }
      
      // Insert new item
      insertItem();
    });
  } else {
    insertItem();
  }

  function insertItem() {
    db.run(
      `INSERT INTO inventory (name, inhouse_number, barcode, brand, quantity, expiry_date, category, location, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, inhouse_number || null, barcode || null, brand || null, quantity, expiry_date || null, category || '', location || '', notes || ''],
      function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
        } else {
          res.json({ id: this.lastID, message: 'Item added successfully' });
        }
      }
    );
  }
});

// Update inventory item
app.put('/api/inventory/:id', (req, res) => {
  const { name, inhouse_number, barcode, brand, quantity, expiry_date, category, location, notes } = req.body;

  // Check if barcode is being changed to one that already exists
  if (barcode) {
    db.get('SELECT id FROM inventory WHERE barcode = ? AND id != ?', [barcode, req.params.id], (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (row) {
        return res.status(409).json({ error: 'Another item already has this barcode', existingId: row.id });
      }
      
      // Update item
      updateItem();
    });
  } else {
    updateItem();
  }

  function updateItem() {
    db.run(
      `UPDATE inventory 
       SET name = ?, inhouse_number = ?, barcode = ?, brand = ?, quantity = ?, expiry_date = ?, 
           category = ?, location = ?, notes = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [name, inhouse_number || null, barcode || null, brand || null, quantity, expiry_date || null, 
       category || '', location || '', notes || '', req.params.id],
      function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
        } else if (this.changes === 0) {
          res.status(404).json({ error: 'Item not found' });
        } else {
          res.json({ message: 'Item updated successfully' });
        }
      }
    );
  }
});

// Delete inventory item
app.delete('/api/inventory/:id', (req, res) => {
  db.run('DELETE FROM inventory WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'Item not found' });
    } else {
      res.json({ message: 'Item deleted successfully' });
    }
  });
});

// Get categories
app.get('/api/categories', (req, res) => {
  db.all('SELECT DISTINCT category FROM inventory WHERE category != "" ORDER BY category', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows.map(row => row.category));
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access at http://localhost:${PORT}`);
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