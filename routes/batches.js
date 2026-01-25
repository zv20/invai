/**
 * Batch Routes
 * HTTP layer for inventory batch operations
 */

const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const BatchController = require('../controllers/batchController');

module.exports = (db, activityLogger) => {
  const router = express.Router();
  const controller = new BatchController(db, activityLogger);

  // Get batches for a product
  router.get('/product/:productId', asyncHandler(async (req, res) => {
    const batches = await controller.getBatchesByProduct(req.params.productId);
    res.json(batches);
  }));

  // Get batch by ID
  router.get('/:id', asyncHandler(async (req, res) => {
    const batch = await controller.getBatchById(req.params.id);
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }
    res.json(batch);
  }));

  // Get expiring batches
  router.get('/expiring/:days?', asyncHandler(async (req, res) => {
    const days = parseInt(req.params.days) || 30;
    const batches = await controller.getExpiringBatches(days);
    res.json(batches);
  }));

  // Create batch
  router.post('/', asyncHandler(async (req, res) => {
    const { product_id, case_quantity } = req.body;
    if (!product_id || !case_quantity) {
      return res.status(400).json({ error: 'Product ID and case quantity are required' });
    }

    const batch = await controller.createBatch(req.body, req.user.username);
    res.status(201).json(batch);
  }));

  // Bulk create batches
  router.post('/bulk', asyncHandler(async (req, res) => {
    const { batches } = req.body;
    if (!Array.isArray(batches) || batches.length === 0) {
      return res.status(400).json({ error: 'Batches array is required' });
    }

    const results = await controller.bulkCreateBatches(batches, req.user.username);
    res.status(201).json(results);
  }));

  // Update batch
  router.put('/:id', asyncHandler(async (req, res) => {
    const batch = await controller.updateBatch(req.params.id, req.body, req.user.username);
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }
    res.json(batch);
  }));

  // Adjust batch quantity
  router.post('/:id/adjust', asyncHandler(async (req, res) => {
    const { adjustment, reason } = req.body;
    if (adjustment === undefined || adjustment === 0) {
      return res.status(400).json({ error: 'Adjustment value is required and must not be zero' });
    }

    try {
      const batch = await controller.adjustBatchQuantity(
        req.params.id, 
        adjustment, 
        reason || 'Manual adjustment', 
        req.user.username
      );
      if (!batch) {
        return res.status(404).json({ error: 'Batch not found' });
      }
      res.json(batch);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }));

  // Delete batch
  router.delete('/:id', asyncHandler(async (req, res) => {
    const batch = await controller.deleteBatch(req.params.id, req.user.username);
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }
    res.json({ message: 'Batch deleted successfully', batch });
  }));

  return router;
};
