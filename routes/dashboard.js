/**
 * Dashboard Routes
 * Phase 2: Modular route structure
 */

const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');

module.exports = (db, cache) => {
  // Dashboard stats
  router.get('/stats', asyncHandler(async (req, res) => {
    const cacheKey = 'dashboard:stats';
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const stats = {};

    // Total products and value
    const valueData = await db.get(`
      SELECT 
        COUNT(DISTINCT p.id) as total_products,
        COALESCE(SUM(ib.total_quantity), 0) as total_items,
        COALESCE(SUM((p.cost_per_case / NULLIF(p.items_per_case, 0)) * ib.total_quantity), 0) as total_value
      FROM products p
      LEFT JOIN inventory_batches ib ON p.id = ib.product_id
    `, []);

    stats.totalProducts = valueData.total_products || 0;
    stats.totalItems = valueData.total_items || 0;
    stats.totalValue = valueData.total_value || 0;

    // Low stock count
    const lowStockData = await db.get(`
      SELECT COUNT(*) as low_stock
      FROM (
        SELECT p.id, COALESCE(SUM(ib.total_quantity), 0) as qty
        FROM products p
        LEFT JOIN inventory_batches ib ON p.id = ib.product_id
        GROUP BY p.id
        HAVING qty < 10 AND qty > 0
      )
    `, []);

    stats.lowStock = lowStockData.low_stock || 0;

    // Category breakdown
    const categoryData = await db.all(`
      SELECT 
        COALESCE(c.name, 'Uncategorized') as category,
        COUNT(*) as count
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      GROUP BY c.name
      ORDER BY count DESC
      LIMIT 5
    `, []);

    stats.categoryBreakdown = categoryData || [];

    // Recent products
    const recentProducts = await db.all(`
      SELECT id, name, created_at
      FROM products
      ORDER BY created_at DESC
      LIMIT 5
    `, []);

    stats.recentProducts = recentProducts || [];

    cache.set(cacheKey, stats, 30000); // 30s cache
    res.json(stats);
  }));

  // Expiration alerts
  router.get('/expiration-alerts', asyncHandler(async (req, res) => {
    const now = new Date().toISOString().split('T')[0];
    const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const expired = await db.all(`
      SELECT 
        ib.id, ib.product_id, ib.total_quantity, ib.expiry_date, ib.location,
        p.name as product_name
      FROM inventory_batches ib
      JOIN products p ON ib.product_id = p.id
      WHERE ib.expiry_date IS NOT NULL AND ib.expiry_date < ?
      ORDER BY ib.expiry_date
    `, [now]);

    const urgent = await db.all(`
      SELECT 
        ib.id, ib.product_id, ib.total_quantity, ib.expiry_date, ib.location,
        p.name as product_name
      FROM inventory_batches ib
      JOIN products p ON ib.product_id = p.id
      WHERE ib.expiry_date IS NOT NULL 
        AND ib.expiry_date >= ? 
        AND ib.expiry_date <= ?
      ORDER BY ib.expiry_date
    `, [now, sevenDays]);

    const soon = await db.all(`
      SELECT 
        ib.id, ib.product_id, ib.total_quantity, ib.expiry_date, ib.location,
        p.name as product_name
      FROM inventory_batches ib
      JOIN products p ON ib.product_id = p.id
      WHERE ib.expiry_date IS NOT NULL 
        AND ib.expiry_date > ? 
        AND ib.expiry_date <= ?
      ORDER BY ib.expiry_date
      LIMIT 10
    `, [sevenDays, thirtyDays]);

    res.json({ expired: expired || [], urgent: urgent || [], soon: soon || [] });
  }));

  return router;
};
