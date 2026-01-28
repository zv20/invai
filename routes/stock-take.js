/**
 * Stock Take Routes - Sprint 4 Phase 3
 * 
 * Physical inventory / stock count API
 */

const express = require('express');
const { requirePermission } = require('../middleware/permissions');

module.exports = (db, activityLogger) => {
  const router = express.Router();

  // Start new stock count
  router.post('/start', requirePermission('products:create'), async (req, res, next) => {
    try {
      const { count_name, location, notes } = req.body;
      const userId = req.user.id;

      const result = await db.run(
        `INSERT INTO stock_counts (count_name, location, started_by, notes) 
         VALUES (?, ?, ?, ?)`,
        [count_name, location || null, userId, notes || null]
      );

      await activityLogger.log(
        userId,
        'stock_count_started',
        'stock_counts',
        result.lastID,
        { count_name, location }
      );

      res.json({ id: result.lastID, message: 'Stock count started' });
    } catch (error) {
      next(error);
    }
  });

  // Get active stock counts
  router.get('/active', requirePermission('products:view'), async (req, res, next) => {
    try {
      const counts = await db.all(
        `SELECT sc.*, u.username as started_by_username,
                (SELECT COUNT(*) FROM stock_count_items WHERE count_id = sc.id) as items_counted,
                (SELECT COUNT(*) FROM stock_count_items WHERE count_id = sc.id AND counted_quantity IS NOT NULL) as items_completed
         FROM stock_counts sc
         LEFT JOIN users u ON sc.started_by = u.id
         WHERE sc.status = 'in_progress'
         ORDER BY sc.started_at DESC`
      );

      res.json(counts);
    } catch (error) {
      next(error);
    }
  });

  // Get stock count details
  router.get('/:id', requirePermission('products:view'), async (req, res, next) => {
    try {
      const countId = req.params.id;

      const count = await db.get(
        `SELECT sc.*, u.username as started_by_username
         FROM stock_counts sc
         LEFT JOIN users u ON sc.started_by = u.id
         WHERE sc.id = ?`,
        [countId]
      );

      if (!count) {
        return res.status(404).json({ error: 'Stock count not found' });
      }

      const items = await db.all(
        `SELECT sci.*, p.name as product_name, p.barcode,
                u.username as counted_by_username
         FROM stock_count_items sci
         LEFT JOIN products p ON sci.product_id = p.id
         LEFT JOIN users u ON sci.counted_by = u.id
         WHERE sci.count_id = ?
         ORDER BY p.name`,
        [countId]
      );

      res.json({ ...count, items });
    } catch (error) {
      next(error);
    }
  });

  // Add item to count
  router.post('/:id/items', requirePermission('products:create'), async (req, res, next) => {
    try {
      const countId = req.params.id;
      const { product_id, batch_id, expected_quantity } = req.body;

      const result = await db.run(
        `INSERT INTO stock_count_items (count_id, product_id, batch_id, expected_quantity)
         VALUES (?, ?, ?, ?)`,
        [countId, product_id, batch_id || null, expected_quantity]
      );

      res.json({ id: result.lastID, message: 'Item added to count' });
    } catch (error) {
      next(error);
    }
  });

  // Update count for item
  router.put('/:id/items/:itemId', requirePermission('products:update'), async (req, res, next) => {
    try {
      const { itemId } = req.params;
      const { counted_quantity, adjustment_reason, adjustment_notes } = req.body;
      const userId = req.user.id;

      // Get item details for variance calculation
      const item = await db.get(
        `SELECT sci.*, p.cost_per_case, p.items_per_case
         FROM stock_count_items sci
         LEFT JOIN products p ON sci.product_id = p.id
         WHERE sci.id = ?`,
        [itemId]
      );

      if (!item) {
        return res.status(404).json({ error: 'Count item not found' });
      }

      const variance = counted_quantity - item.expected_quantity;
      const costPerItem = (item.cost_per_case || 0) / (item.items_per_case || 1);
      const varianceCost = variance * costPerItem;

      await db.run(
        `UPDATE stock_count_items 
         SET counted_quantity = ?, variance = ?, variance_cost = ?,
             adjustment_reason = ?, adjustment_notes = ?,
             counted_at = CURRENT_TIMESTAMP, counted_by = ?
         WHERE id = ?`,
        [counted_quantity, variance, varianceCost, adjustment_reason || null,
         adjustment_notes || null, userId, itemId]
      );

      res.json({ message: 'Count updated', variance, varianceCost });
    } catch (error) {
      next(error);
    }
  });

  // Complete stock count
  router.post('/:id/complete', requirePermission('products:update'), async (req, res, next) => {
    try {
      const countId = req.params.id;
      const userId = req.user.id;

      await db.run(
        `UPDATE stock_counts 
         SET status = 'completed', completed_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [countId]
      );

      // Apply adjustments to inventory
      const items = await db.all(
        `SELECT * FROM stock_count_items 
         WHERE count_id = ? AND variance != 0`,
        [countId]
      );

      for (const item of items) {
        if (item.batch_id) {
          // Update batch quantity
          await db.run(
            `UPDATE inventory_batches 
             SET total_quantity = total_quantity + ?
             WHERE id = ?`,
            [item.variance, item.batch_id]
          );
        }

        // Record adjustment
        await db.run(
          `INSERT INTO variance_adjustments 
           (count_item_id, product_id, batch_id, adjustment_quantity, 
            adjustment_reason, cost_impact, approved_by, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [item.id, item.product_id, item.batch_id, item.variance,
           item.adjustment_reason, item.variance_cost, userId, item.adjustment_notes]
        );
      }

      await activityLogger.log(
        userId,
        'stock_count_completed',
        'stock_counts',
        countId,
        { adjustments: items.length }
      );

      res.json({ message: 'Stock count completed', adjustments: items.length });
    } catch (error) {
      next(error);
    }
  });

  // Get variance report
  router.get('/:id/variance-report', requirePermission('reports:view'), async (req, res, next) => {
    try {
      const countId = req.params.id;

      const summary = await db.get(
        `SELECT 
           COUNT(*) as total_items,
           SUM(CASE WHEN variance > 0 THEN 1 ELSE 0 END) as overage_count,
           SUM(CASE WHEN variance < 0 THEN 1 ELSE 0 END) as shortage_count,
           SUM(CASE WHEN variance = 0 THEN 1 ELSE 0 END) as exact_count,
           SUM(variance_cost) as total_cost_impact,
           SUM(CASE WHEN variance > 0 THEN variance_cost ELSE 0 END) as overage_cost,
           SUM(CASE WHEN variance < 0 THEN variance_cost ELSE 0 END) as shortage_cost
         FROM stock_count_items
         WHERE count_id = ?`,
        [countId]
      );

      const byReason = await db.all(
        `SELECT adjustment_reason, 
           COUNT(*) as count,
           SUM(variance) as total_variance,
           SUM(variance_cost) as total_cost
         FROM stock_count_items
         WHERE count_id = ? AND adjustment_reason IS NOT NULL
         GROUP BY adjustment_reason`,
        [countId]
      );

      const topVariances = await db.all(
        `SELECT sci.*, p.name as product_name
         FROM stock_count_items sci
         LEFT JOIN products p ON sci.product_id = p.id
         WHERE sci.count_id = ?
         ORDER BY ABS(sci.variance_cost) DESC
         LIMIT 10`,
        [countId]
      );

      res.json({ summary, byReason, topVariances });
    } catch (error) {
      next(error);
    }
  });

  return router;
};