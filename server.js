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
      barcode TEXT,
      quantity INTEGER NOT NULL,
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
      // Migrate existing database to add barcode column
      migrateDatabase();
    }
  });
}

// Database migration to add barcode column to existing databases
function migrateDatabase() {
  db.all("PRAGMA table_info(inventory)", (err, columns) => {
    if (err) {
      console.error('Error checking table schema:', err);
      return;
    }
    
    const hasBarcodeColumn = columns.some(col => col.name === 'barcode');
    
    if (!hasBarcodeColumn) {
      console.log('Adding barcode column to existing database...');
      db.run('ALTER TABLE inventory ADD COLUMN barcode TEXT', (err) => {
        if (err) {
          console.error('Error adding barcode column:', err);
        } else {
          console.log('Barcode column added successfully');
        }
      });
    }
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
    query += ' AND (name LIKE ? OR notes LIKE ? OR barcode LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
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
  const { name, barcode, quantity, category, location, notes } = req.body;

  if (!name || quantity === undefined) {
    return res.status(400).json({ error: 'Name and quantity are required' });
  }

  // Check if barcode already exists
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
      'INSERT INTO inventory (name, barcode, quantity, category, location, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [name, barcode || null, quantity, category || '', location || '', notes || ''],
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
  const { name, barcode, quantity, category, location, notes } = req.body;

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
      'UPDATE inventory SET name = ?, barcode = ?, quantity = ?, category = ?, location = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, barcode || null, quantity, category || '', location || '', notes || '', req.params.id],
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