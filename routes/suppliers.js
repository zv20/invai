/**
 * Supplier Routes
 * HTTP layer for supplier operations
 */

const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const SupplierController = require('../controllers/supplierController');

module.exports = (db, activityLogger) => {
  const router = express.Router();
  const controller = new SupplierController(db, activityLogger);

  // Get all suppliers
  router.get('/', asyncHandler(async (req, res) => {
    const { active } = req.query;
    const suppliers = active === 'true' 
      ? await controller.getActiveSuppliers()
      : await controller.getAllSuppliers();
    res.json(suppliers);
  }));

  // Get supplier by ID
  router.get('/:id', asyncHandler(async (req, res) => {
    const supplier = await controller.getSupplierById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    res.json(supplier);
  }));

  // Create supplier
  router.post('/', asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Supplier name is required' });
    }

    const supplier = await controller.createSupplier(req.body, req.user.username);
    res.status(201).json(supplier);
  }));

  // Update supplier
  router.put('/:id', asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Supplier name is required' });
    }

    const supplier = await controller.updateSupplier(req.params.id, req.body, req.user.username);
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    res.json(supplier);
  }));

  // Toggle supplier status
  router.post('/:id/toggle-status', asyncHandler(async (req, res) => {
    const supplier = await controller.toggleSupplierStatus(req.params.id, req.user.username);
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    res.json(supplier);
  }));

  // Delete supplier
  router.delete('/:id', asyncHandler(async (req, res) => {
    try {
      const supplier = await controller.deleteSupplier(req.params.id, req.user.username);
      if (!supplier) {
        return res.status(404).json({ error: 'Supplier not found' });
      }
      res.json({ message: 'Supplier deleted successfully', supplier });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }));

  return router;
};
