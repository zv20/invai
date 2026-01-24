/**
 * Supplier Routes
 * Phase 2: Modular route structure
 */

const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const SupplierController = require('../controllers/supplierController');

module.exports = (db, activityLogger) => {
  const controller = new SupplierController(db, activityLogger);

  router.get('/', asyncHandler(async (req, res) => {
    const suppliers = await controller.getSuppliers();
    res.json(suppliers);
  }));

  router.post('/', asyncHandler(async (req, res) => {
    const result = await controller.createSupplier(req.body);
    res.json(result);
  }));

  router.put('/:id', asyncHandler(async (req, res) => {
    const result = await controller.updateSupplier(req.params.id, req.body);
    res.json(result);
  }));

  router.delete('/:id', asyncHandler(async (req, res) => {
    const result = await controller.deleteSupplier(req.params.id);
    res.json(result);
  }));

  return router;
};
