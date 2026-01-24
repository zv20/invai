/**
 * Import/Export Routes
 * CSV operations and activity logging
 */

const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { escapeCSV } = require('../utils/csv-helpers');

module.exports = (db, activityLogger, logger) => {
  const router = express.Router();

  // Activity log
  router.get('/activity-log', asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const activities = await activityLogger.getRecent(limit);
    res.json(activities);
  }));

  router.get('/activity-log/:entityType/:entityId', asyncHandler(async (req, res) => {
    const { entityType, entityId } = req.params;
    const activities = await activityLogger.getForEntity(entityType, parseInt(entityId));
    res.json(activities);
  }));

  // Export inventory to CSV
  router.get('/export/inventory', asyncHandler(async (req, res) => {
    const query = `
      SELECT p.name, p.inhouse_number, p.barcode, p.brand, s.name as supplier, p.items_per_case, p.cost_per_case, 
             c.name as category, ib.case_quantity, ib.total_quantity, ib.expiry_date, ib.location, ib.received_date,
             ib.notes as batch_notes, p.notes as product_notes
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN inventory_batches ib ON p.id = ib.product_id
      ORDER BY p.name, ib.expiry_date
    `;
    
    const rows = await db.all(query, []);
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
  }));

  // Import inventory from CSV
  router.post('/import/inventory', asyncHandler(async (req, res) => {
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
        
        let existingProduct;
        if (data['Barcode']) {
          existingProduct = await db.get('SELECT * FROM products WHERE barcode = ?', [data['Barcode']]);
        } else {
          existingProduct = await db.get('SELECT * FROM products WHERE name = ?', [productName]);
        }
        
        let productId;
        if (existingProduct) {
          await db.run(
            `UPDATE products SET inhouse_number = COALESCE(?, inhouse_number),
             brand = COALESCE(?, brand), items_per_case = COALESCE(?, items_per_case), 
             cost_per_case = COALESCE(?, cost_per_case), notes = COALESCE(?, notes), 
             updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [data['In-House Number'], data['Brand'], data['Items Per Case'], 
             data['Cost Per Case'] || 0, data['Product Notes'], existingProduct.id]
          );
          productId = existingProduct.id;
          productsUpdated++;
        } else {
          const result = await db.run(
            `INSERT INTO products (name, inhouse_number, barcode, brand, items_per_case, cost_per_case, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [productName, data['In-House Number'], data['Barcode'], data['Brand'], 
             data['Items Per Case'] || 1, data['Cost Per Case'] || 0, data['Product Notes'] || '']
          );
          productId = result.lastID;
          productsCreated++;
        }
        
        if (data['Case Quantity'] && parseInt(data['Case Quantity']) > 0) {
          await db.run(
            `INSERT INTO inventory_batches (product_id, case_quantity, total_quantity, expiry_date, location, notes, received_date)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [productId, data['Case Quantity'], data['Total Quantity'] || data['Case Quantity'], 
             data['Expiration Date'], data['Location'] || '', data['Batch Notes'] || '', 
             data['Received Date'] || new Date().toISOString()]
          );
          batchesCreated++;
        }
      } catch (rowError) {
        console.error('Error processing row:', rowError);
        errors++;
      }
    }
    
    logger.info(`CSV import by ${req.user.username}: ${productsCreated} created, ${productsUpdated} updated, ${batchesCreated} batches`);
    
    res.json({ 
      message: 'Import completed', 
      productsCreated, 
      productsUpdated, 
      batchesCreated, 
      errors, 
      totalRows: rows.length 
    });
  }));

  return router;
};
