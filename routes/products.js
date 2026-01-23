/**
 * Product Routes
 * Phase 2: Modular route structure
 */

const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const ProductController = require('../controllers/productController');

module.exports = (db, activityLogger, cache) => {
  const controller = new ProductController(db, activityLogger, cache);

  router.get('/', asyncHandler(async (req, res) => {
    const products = await controller.getProducts(req.query.search);
    res.json(products);
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const product = await controller.getProductById(req.params.id);
    res.json(product);
  }));

  router.post('/', asyncHandler(async (req, res) => {
    const result = await controller.createProduct(req.body);
    res.json(result);
  }));

  router.put('/:id', asyncHandler(async (req, res) => {
    const result = await controller.updateProduct(req.params.id, req.body);
    res.json(result);
  }));

  router.delete('/:id', asyncHandler(async (req, res) => {
    const result = await controller.deleteProduct(req.params.id);
    res.json(result);
  }));

  router.post('/:id/favorite', asyncHandler(async (req, res) => {
    const result = await controller.setFavorite(req.params.id, req.body.is_favorite);
    res.json(result);
  }));

  return router;
};
