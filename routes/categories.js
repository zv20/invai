/**
 * Category Routes
 * Phase 2: Modular route structure
 */

const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const CategoryController = require('../controllers/categoryController');

module.exports = (db, activityLogger) => {
  const controller = new CategoryController(db, activityLogger);

  router.get('/', asyncHandler(async (req, res) => {
    const categories = await controller.getCategories();
    res.json(categories);
  }));

  router.post('/', asyncHandler(async (req, res) => {
    const result = await controller.createCategory(req.body);
    res.json(result);
  }));

  router.put('/:id', asyncHandler(async (req, res) => {
    const result = await controller.updateCategory(req.params.id, req.body);
    res.json(result);
  }));

  router.delete('/:id', asyncHandler(async (req, res) => {
    const result = await controller.deleteCategory(req.params.id);
    res.json(result);
  }));

  return router;
};
