/**
 * Category Routes
 * HTTP layer for category operations
 */

const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const CategoryController = require('../controllers/categoryController');

module.exports = (db, activityLogger) => {
  const router = express.Router();
  const controller = new CategoryController(db, activityLogger);

  // Get all categories
  router.get('/', asyncHandler(async (req, res) => {
    const categories = await controller.getAllCategories();
    res.json(categories);
  }));

  // Get category by ID
  router.get('/:id', asyncHandler(async (req, res) => {
    const category = await controller.getCategoryById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(category);
  }));

  // Create category
  router.post('/', asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const category = await controller.createCategory(req.body, req.user.username);
    res.status(201).json(category);
  }));

  // Update category
  router.put('/:id', asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const category = await controller.updateCategory(req.params.id, req.body, req.user.username);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(category);
  }));

  // Reorder categories
  router.post('/reorder', asyncHandler(async (req, res) => {
    const { orders } = req.body;
    if (!Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({ error: 'Orders array is required' });
    }

    const categories = await controller.reorderCategories(orders, req.user.username);
    res.json(categories);
  }));

  // Delete category
  router.delete('/:id', asyncHandler(async (req, res) => {
    try {
      const category = await controller.deleteCategory(req.params.id, req.user.username);
      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }
      res.json({ message: 'Category deleted successfully', category });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }));

  return router;
};
