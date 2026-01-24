/**
 * Reports Routes
 * Stock value, expiration, and low-stock reports
 */

const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');

module.exports = (db, cache, csvExporter) => {
  const router = express.Router();

  // Stock value report
  router.get('/stock-value', asyncHandler(async (req, res) => {
    const cacheKey = 'report:stock-value';
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const query = `
      SELECT 
        p.id, p.name,
        c.name as category,
        s.name as supplier,
        COALESCE(SUM(ib.total_quantity), 0) as quantity,
        p.cost_per_case / NULLIF(p.items_per_case, 0) as unit_cost,
        COALESCE(SUM((p.cost_per_case / NULLIF(p.items_per_case, 0)) * ib.total_quantity), 0) as total_value
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN inventory_batches ib ON p.id = ib.product_id
      GROUP BY p.id
      ORDER BY total_value DESC
    `;

    const rows = await db.all(query, []);
    const totalValue = rows.reduce((sum, r) => sum + (r.total_value || 0), 0);
    const totalItems = rows.reduce((sum, r) => sum + r.quantity, 0);
    
    const result = { products: rows, totalValue, totalItems };
    cache.set(cacheKey, result, 60000);
    res.json(result);
  }));

  // Expiration report
  router.get('/expiration', asyncHandler(async (req, res) => {
    const query = `
      SELECT 
        p.name as product_name,
        ib.total_quantity as quantity,
        ib.expiry_date,
        ib.location,
        JULIANDAY(ib.expiry_date) - JULIANDAY('now') as days_until_expiry
      FROM inventory_batches ib
      JOIN products p ON ib.product_id = p.id
      WHERE ib.expiry_date IS NOT NULL
      ORDER BY ib.expiry_date
    `;

    const rows = await db.all(query, []);
    const expired = rows.filter(r => r.days_until_expiry < 0);
    const urgent = rows.filter(r => r.days_until_expiry >= 0 && r.days_until_expiry <= 7);
    const soon = rows.filter(r => r.days_until_expiry > 7 && r.days_until_expiry <= 30);
    
    res.json({ expired, urgent, soon, all: rows });
  }));

  // Low stock report
  router.get('/low-stock', asyncHandler(async (req, res) => {
    const query = `
      SELECT 
        p.id, p.name,
        c.name as category,
        s.name as supplier,
        COALESCE(SUM(ib.total_quantity), 0) as quantity,
        p.reorder_point
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN inventory_batches ib ON p.id = ib.product_id
      GROUP BY p.id
      HAVING quantity < p.reorder_point AND p.reorder_point > 0
      ORDER BY quantity
    `;

    const rows = await db.all(query, []);
    res.json({ products: rows });
  }));

  // Export report to CSV
  router.get('/export/:type', asyncHandler(async (req, res) => {
    const { type } = req.params;
    let csv;
    
    switch(type) {
      case 'stock-value':
        csv = await csvExporter.exportStockValue();
        break;
      case 'expiration':
        csv = await csvExporter.exportExpiration();
        break;
      case 'low-stock':
        csv = await csvExporter.exportLowStock();
        break;
      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  }));

  return router;
};
