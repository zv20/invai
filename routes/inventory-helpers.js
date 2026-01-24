/**
 * Inventory Helper Routes
 * Summary, value calculations, batch suggestions, and alerts
 */

const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');

module.exports = (db) => {
  const router = express.Router();

  // Inventory summary with filters
  router.get('/summary', asyncHandler(async (req, res) => {
    const { search, category, supplier } = req.query;
    let query = `
      SELECT p.*, c.name as category_name, c.color as category_color, c.icon as category_icon,
             s.name as supplier_name,
             COALESCE(SUM(ib.total_quantity), 0) as total_quantity,
             COUNT(ib.id) as batch_count, MIN(ib.expiry_date) as earliest_expiry
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN inventory_batches ib ON p.id = ib.product_id
      WHERE 1=1
    `;
    const params = [];
    
    if (search) {
      query += ' AND (p.name LIKE ? OR p.barcode LIKE ? OR p.brand LIKE ? OR s.name LIKE ? OR p.inhouse_number LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }
    if (category && category !== 'all') {
      query += ' AND p.category_id = ?';
      params.push(category);
    }
    if (supplier && supplier !== 'all') {
      query += ' AND p.supplier_id = ?';
      params.push(supplier);
    }
    
    query += ' GROUP BY p.id ORDER BY p.name';
    const rows = await db.all(query, params);
    res.json(rows);
  }));

  // Total inventory value
  router.get('/value', asyncHandler(async (req, res) => {
    const query = `
      SELECT 
        COUNT(DISTINCT p.id) as total_products,
        COALESCE(SUM(ib.total_quantity), 0) as total_items,
        COALESCE(SUM((p.cost_per_case / NULLIF(p.items_per_case, 0)) * ib.total_quantity), 0) as total_value
      FROM products p
      LEFT JOIN inventory_batches ib ON p.id = ib.product_id
    `;
    const row = await db.get(query, []);
    res.json(row);
  }));

  // FIFO/FEFO batch suggestion for product
  router.get('/products/:id/batch-suggestion', asyncHandler(async (req, res) => {
    const productId = req.params.id;
    
    const rows = await db.all(`
      SELECT ib.*, p.name as product_name
      FROM inventory_batches ib
      JOIN products p ON ib.product_id = p.id
      WHERE ib.product_id = ? AND ib.total_quantity > 0
      ORDER BY 
        CASE 
          WHEN ib.expiry_date IS NULL THEN 1
          ELSE 0
        END,
        ib.expiry_date ASC,
        ib.received_date ASC
      LIMIT 1
    `, [productId]);
    
    if (rows.length === 0) {
      return res.json({ suggestion: null, message: 'No available batches' });
    }
    
    const batch = rows[0];
    const now = new Date();
    const expiryDate = batch.expiry_date ? new Date(batch.expiry_date) : null;
    
    let urgency = 'normal';
    let reason = 'Oldest batch';
    let daysUntilExpiry = null;
    
    if (expiryDate) {
      daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry < 0) {
        urgency = 'expired';
        reason = 'EXPIRED - Remove immediately';
      } else if (daysUntilExpiry <= 7) {
        urgency = 'urgent';
        reason = `Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''} - Use immediately`;
      } else if (daysUntilExpiry <= 30) {
        urgency = 'soon';
        reason = `Expires in ${daysUntilExpiry} days - Use soon`;
      } else {
        reason = `Expires in ${daysUntilExpiry} days`;
      }
    }
    
    res.json({ suggestion: batch, urgency, reason, daysUntilExpiry });
  }));

  // Low stock alerts
  router.get('/alerts/low-stock', asyncHandler(async (req, res) => {
    const threshold = parseInt(req.query.threshold) || 10;
    
    const rows = await db.all(`
      SELECT 
        p.id, p.name, c.name as category,
        COALESCE(SUM(ib.total_quantity), 0) as total_quantity
      FROM products p
      LEFT JOIN inventory_batches ib ON p.id = ib.product_id
      LEFT JOIN categories c ON p.category_id = c.id
      GROUP BY p.id
      HAVING total_quantity > 0 AND total_quantity < ?
      ORDER BY total_quantity ASC
    `, [threshold]);
    
    res.json(rows);
  }));

  return router;
};
