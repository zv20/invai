/**
 * Unit Tests for CSV Export
 * Tests CSV generation and export functionality
 */

const CSVExporter = require('../../lib/csv-export');
const sqlite3 = require('sqlite3').verbose();

describe('CSVExporter', () => {
  let db;
  let exporter;

  beforeEach((done) => {
    // Create in-memory database with test data
    db = new sqlite3.Database(':memory:');
    exporter = new CSVExporter(db);

    // Create tables and insert test data
    db.serialize(() => {
      // Categories
      db.run(`CREATE TABLE categories (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL
      )`);

      // Suppliers
      db.run(`CREATE TABLE suppliers (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL
      )`);

      // Products
      db.run(`CREATE TABLE products (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        category_id INTEGER,
        supplier_id INTEGER,
        cost_per_case REAL,
        items_per_case INTEGER,
        reorder_point INTEGER DEFAULT 0,
        FOREIGN KEY (category_id) REFERENCES categories(id),
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
      )`);

      // Inventory Batches
      db.run(`CREATE TABLE inventory_batches (
        id INTEGER PRIMARY KEY,
        product_id INTEGER,
        total_quantity INTEGER,
        expiry_date TEXT,
        location TEXT,
        FOREIGN KEY (product_id) REFERENCES products(id)
      )`);

      // Insert test data
      db.run(`INSERT INTO categories (id, name) VALUES (1, 'Dairy'), (2, 'Produce')`);
      db.run(`INSERT INTO suppliers (id, name) VALUES (1, 'Local Farm'), (2, 'Fresh Foods')`);
      db.run(`INSERT INTO products (id, name, category_id, supplier_id, cost_per_case, items_per_case, reorder_point) 
              VALUES (1, 'Milk', 1, 1, 24.00, 12, 10),
                     (2, 'Cheese', 1, 1, 36.00, 6, 5),
                     (3, 'Apples', 2, 2, 15.00, 20, 15)`);
      db.run(`INSERT INTO inventory_batches (id, product_id, total_quantity, expiry_date, location) 
              VALUES (1, 1, 20, '2026-02-15', 'Cooler A'),
                     (2, 2, 8, '2026-03-01', 'Cooler A'),
                     (3, 3, 5, '2026-02-01', 'Shelf B')`, done);
    });
  });

  afterEach((done) => {
    if (db) {
      db.close(done);
    } else {
      done();
    }
  });

  describe('CSV Escaping', () => {
    test('should escape commas', () => {
      const result = exporter.escapeCSV('Product, with comma');
      expect(result).toBe('"Product, with comma"');
    });

    test('should escape double quotes', () => {
      const result = exporter.escapeCSV('Product "Special"');
      expect(result).toBe('"Product ""Special"""');
    });

    test('should escape newlines', () => {
      const result = exporter.escapeCSV('Line 1\nLine 2');
      expect(result).toBe('"Line 1\nLine 2"');
    });

    test('should handle null and undefined', () => {
      expect(exporter.escapeCSV(null)).toBe('');
      expect(exporter.escapeCSV(undefined)).toBe('');
    });

    test('should handle numbers', () => {
      expect(exporter.escapeCSV(123)).toBe('123');
      expect(exporter.escapeCSV(45.67)).toBe('45.67');
    });

    test('should not escape simple strings', () => {
      expect(exporter.escapeCSV('Simple String')).toBe('Simple String');
      expect(exporter.escapeCSV('Product123')).toBe('Product123');
    });
  });

  describe('Stock Value Report Export', () => {
    test('should export stock value report with correct headers', async () => {
      const csv = await exporter.exportStockValue();
      
      expect(csv).toContain('Product,Category,Supplier,Quantity,Unit Cost,Total Value');
    });

    test('should include product data', async () => {
      const csv = await exporter.exportStockValue();
      
      expect(csv).toContain('Milk');
      expect(csv).toContain('Dairy');
      expect(csv).toContain('Local Farm');
    });

    test('should calculate values correctly', async () => {
      const csv = await exporter.exportStockValue();
      
      // Milk: cost_per_case (24) / items_per_case (12) = 2.00 per unit
      // Quantity: 20, so total value = 40.00
      expect(csv).toContain('2.00');
      expect(csv).toContain('40.00');
    });

    test('should handle products with no inventory', async () => {
      // Add product with no batches
      await new Promise((resolve, reject) => {
        db.run(`INSERT INTO products (id, name, category_id, supplier_id, cost_per_case, items_per_case) 
                VALUES (4, 'No Stock', 1, 1, 10.00, 5)`, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const csv = await exporter.exportStockValue();
      expect(csv).toContain('No Stock');
      expect(csv).toContain(',0,'); // Zero quantity
    });
  });

  describe('Expiration Report Export', () => {
    test('should export expiration report with correct headers', async () => {
      const csv = await exporter.exportExpiration();
      
      expect(csv).toContain('Product,Quantity,Expiry Date,Location,Days Until Expiry,Status');
    });

    test('should include batch data', async () => {
      const csv = await exporter.exportExpiration();
      
      expect(csv).toContain('Milk');
      expect(csv).toContain('2026-02-15');
      expect(csv).toContain('Cooler A');
    });

    test('should calculate expiry status correctly', async () => {
      const csv = await exporter.exportExpiration();
      
      // Status should be SOON or URGENT depending on dates
      expect(csv).toMatch(/OK|SOON|URGENT|EXPIRED/);
    });

    test('should sort by expiry date', async () => {
      const csv = await exporter.exportExpiration();
      const lines = csv.split('\n').filter(line => line.trim());
      
      // First data line (index 1) should be earliest expiry
      expect(lines[1]).toContain('2026-02-01'); // Apples expire first
    });
  });

  describe('Low Stock Report Export', () => {
    test('should export low stock report with correct headers', async () => {
      const csv = await exporter.exportLowStock();
      
      expect(csv).toContain('Product,Category,Supplier,Current Quantity,Reorder Point');
    });

    test('should only include products below reorder point', async () => {
      const csv = await exporter.exportLowStock();
      
      // Apples: quantity 5, reorder point 15 (should be included)
      expect(csv).toContain('Apples');
      expect(csv).toContain(',5,');
      expect(csv).toContain(',15');
    });

    test('should not include products above reorder point', async () => {
      const csv = await exporter.exportLowStock();
      
      // Milk: quantity 20, reorder point 10 (should NOT be included)
      expect(csv).not.toContain('Milk,Dairy,Local Farm,20,10');
    });

    test('should handle empty results', async () => {
      // Update all products to have sufficient stock
      await new Promise((resolve, reject) => {
        db.run(`UPDATE products SET reorder_point = 0`, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const csv = await exporter.exportLowStock();
      
      // Should only contain headers
      const lines = csv.split('\n').filter(line => line.trim());
      expect(lines.length).toBe(1); // Only header row
    });
  });

  describe('Edge Cases', () => {
    test('should handle products with special characters', async () => {
      await new Promise((resolve, reject) => {
        db.run(`INSERT INTO products (id, name, category_id, supplier_id, cost_per_case, items_per_case, reorder_point) 
                VALUES (5, 'Product "Special", Inc.', 1, 1, 10.00, 5, 0)`, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      await new Promise((resolve, reject) => {
        db.run(`INSERT INTO inventory_batches (product_id, total_quantity, expiry_date, location) 
                VALUES (5, 10, '2026-03-01', 'Shelf C')`, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const csv = await exporter.exportStockValue();
      expect(csv).toContain('"Product ""Special"", Inc."');
    });

    test('should handle null locations', async () => {
      await new Promise((resolve, reject) => {
        db.run(`INSERT INTO inventory_batches (product_id, total_quantity, expiry_date, location) 
                VALUES (1, 5, '2026-03-15', NULL)`, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const csv = await exporter.exportExpiration();
      expect(csv).toBeDefined();
    });

    test('should handle division by zero in cost calculations', async () => {
      await new Promise((resolve, reject) => {
        db.run(`INSERT INTO products (id, name, category_id, supplier_id, cost_per_case, items_per_case, reorder_point) 
                VALUES (6, 'Zero Items', 1, 1, 10.00, 0, 0)`, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      await new Promise((resolve, reject) => {
        db.run(`INSERT INTO inventory_batches (product_id, total_quantity, expiry_date, location) 
                VALUES (6, 10, '2026-03-01', 'Shelf D')`, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const csv = await exporter.exportStockValue();
      expect(csv).toBeDefined();
      // Should handle gracefully without crashing
    });
  });
});
