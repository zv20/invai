/**
 * Batch/Inventory Routes
 * Phase 2: Modular route structure with transaction support
 */

const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const BatchController = require('../controllers/batchController');

module.exports = (db, activityLogger) => {
  const controller = new BatchController(db, activityLogger);

  // Get batches for a product
  router.get('/product/:productId', asyncHandler(async (req, res) => {
    const batches = await controller.getBatchesByProduct(req.params.productId);
    res.json(batches);
  }));

  // Get single batch
  router.get('/:id', asyncHandler(async (req, res) => {
    const batch = await controller.getBatchById(req.params.id);
    res.json(batch);
  }));

  // Create batch
  router.post('/', asyncHandler(async (req, res) => {
    const result = await controller.createBatch(req.body);
    res.json(result);
  }));

  // Update batch
  router.put('/:id', asyncHandler(async (req, res) => {
    const result = await controller.updateBatch(req.params.id, req.body);
    res.json(result);
  }));

  // Delete batch
  router.delete('/:id', asyncHandler(async (req, res) => {
    const result = await controller.deleteBatch(req.params.id);
    res.json(result);
  }));

  // Bulk operations with TRANSACTION SUPPORT
  router.post('/bulk/delete', asyncHandler(async (req, res) => {
    const result = await controller.bulkDelete(req.body.batchIds);
    res.json(result);
  }));

  router.post('/bulk/update-location', asyncHandler(async (req, res) => {
    const result = await controller.bulkUpdateLocation(req.body.batchIds, req.body.location);
    res.json(result);
  }));

  router.post('/bulk/adjust', asyncHandler(async (req, res) => {
    const result = await controller.bulkAdjust(req.body.batchIds, req.body.adjustment);
    res.json(result);
  }));

  // Quick actions
  router.post('/:id/adjust', asyncHandler(async (req, res) => {
    const result = await controller.adjustQuantity(req.params.id, req.body.adjustment, req.body.reason);
    res.json(result);
  }));

  router.post('/:id/mark-empty', asyncHandler(async (req, res) => {
    const result = await controller.markEmpty(req.params.id);
    res.json(result);
  }));

  return router;
};
