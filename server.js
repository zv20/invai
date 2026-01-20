const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.text({ limit: '10mb' })); // For CSV upload
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

// Helper function to escape CSV fields
function escapeCSV(field) {
  if (field === null || field === undefined) return '';
  const stringField = String(field);
  // If field contains comma, quote, or newline, wrap in quotes and escape existing quotes
  if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }
  return stringField;
}

// Helper function to parse CSV line
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
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

// Export inventory to CSV
app.get('/api/inventory/export/csv', (req, res) => {
  const query = 'SELECT * FROM inventory ORDER BY name';
  
  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // CSV Header
    const headers = [
      'ID',
      'Name',
      'In-House Number',
      'Barcode',
      'Brand',
      'Quantity',
      'Expiration Date',
      'Category',
      'Location',
      'Notes',
      'Created At',
      'Updated At'
    ];
    
    let csv = headers.join(',') + '\n';
    
    // Add data rows
    rows.forEach(row => {
      const rowData = [
        escapeCSV(row.id),
        escapeCSV(row.name),
        escapeCSV(row.inhouse_number),
        escapeCSV(row.barcode),
        escapeCSV(row.brand),
        escapeCSV(row.quantity),
        escapeCSV(row.expiry_date),
        escapeCSV(row.category),
        escapeCSV(row.location),
        escapeCSV(row.notes),
        escapeCSV(row.created_at),
        escapeCSV(row.updated_at)
      ];
      csv += rowData.join(',') + '\n';
    });
    
    // Set headers for file download
    const filename = `inventory_export_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  });
});

// Import inventory from CSV
app.post('/api/inventory/import/csv', (req, res) => {
  const csvData = req.body;
  
  if (!csvData || typeof csvData !== 'string') {
    return res.status(400).json({ error: 'Invalid CSV data' });
  }
  
  try {
    const lines = csvData.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return res.status(400).json({ error: 'CSV file is empty or invalid' });
    }
    
    // Parse header
    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());
    
    // Find column indices
    const nameIdx = headers.findIndex(h => h === 'name');
    const inhouseIdx = headers.findIndex(h => h.includes('house') || h.includes('sku'));
    const barcodeIdx = headers.findIndex(h => h.includes('barcode') || h.includes('upc'));
    const brandIdx = headers.findIndex(h => h.includes('brand') || h.includes('manufacturer'));
    const quantityIdx = headers.findIndex(h => h === 'quantity' || h === 'qty');
    const expiryIdx = headers.findIndex(h => h.includes('expir'));
    const categoryIdx = headers.findIndex(h => h.includes('category'));
    const locationIdx = headers.findIndex(h => h.includes('location'));
    const notesIdx = headers.findIndex(h => h.includes('note'));
    
    if (nameIdx === -1 || quantityIdx === -1) {
      return res.status(400).json({ error: 'CSV must contain at least Name and Quantity columns' });
    }
    
    let imported = 0;
    let skipped = 0;
    let errors = [];
    
    // Process each data row
    const dataLines = lines.slice(1);
    let processed = 0;
    
    dataLines.forEach((line, index) => {
      const values = parseCSVLine(line);
      
      if (values.length < 2) {
        skipped++;
        processed++;
        return;
      }
      
      const name = values[nameIdx]?.trim();
      const quantity = parseInt(values[quantityIdx]);
      
      if (!name || isNaN(quantity)) {
        errors.push(`Line ${index + 2}: Missing or invalid name/quantity`);
        skipped++;
        processed++;
        return;
      }
      
      const item = {
        name,
        inhouse_number: inhouseIdx >= 0 ? values[inhouseIdx]?.trim() || null : null,
        barcode: barcodeIdx >= 0 ? values[barcodeIdx]?.trim() || null : null,
        brand: brandIdx >= 0 ? values[brandIdx]?.trim() || null : null,
        quantity,
        expiry_date: expiryIdx >= 0 ? values[expiryIdx]?.trim() || null : null,
        category: categoryIdx >= 0 ? values[categoryIdx]?.trim() || '' : '',
        location: locationIdx >= 0 ? values[locationIdx]?.trim() || '' : '',
        notes: notesIdx >= 0 ? values[notesIdx]?.trim() || '' : ''
      };
      
      // Insert into database
      db.run(
        `INSERT INTO inventory (name, inhouse_number, barcode, brand, quantity, expiry_date, category, location, notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [item.name, item.inhouse_number, item.barcode, item.brand, item.quantity, 
         item.expiry_date, item.category, item.location, item.notes],
        function(err) {
          processed++;
          
          if (err) {
            errors.push(`Line ${index + 2}: ${err.message}`);
            skipped++;
          } else {
            imported++;
          }
          
          // Send response when all rows are processed
          if (processed === dataLines.length) {
            res.json({
              message: 'Import completed',
              imported,
              skipped,
              total: dataLines.length,
              errors: errors.length > 0 ? errors.slice(0, 10) : [] // Limit error messages
            });
          }
        }
      );
    });
    
    // Handle empty data case
    if (dataLines.length === 0) {
      res.json({
        message: 'No data to import',
        imported: 0,
        skipped: 0,
        total: 0,
        errors: []
      });
    }
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to parse CSV: ' + error.message });
  }
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