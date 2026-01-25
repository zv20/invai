/**
 * Product Routes
 * HTTP layer for product operations
 */

const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const ProductController = require('../controllers/productController');

module.exports = (db, activityLogger, cache) => {
  const router = express.Router();
  const controller = new ProductController(db, activityLogger);

  // Get all products
  router.get('/', asyncHandler(async (req, res) => {
    const cacheKey = 'products:all';
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const products = await controller.getAllProducts();
    cache.set(cacheKey, products, 30000);
    res.json(products);
  }));

  // Search products
  router.get('/search', asyncHandler(async (req, res) => {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }
    
    const products = await controller.searchProducts(q);
    res.json(products);
  }));

  // Get batch suggestion for product (FIFO/FEFO) - MUST BE BEFORE /:id
  router.get('/:id/batch-suggestion', asyncHandler(async (req, res) => {
    const productId = req.params.id;
    
    // Get all batches for this product
    const batches = await db.all(
      `SELECT * FROM inventory_batches 
       WHERE product_id = ? AND total_quantity > 0
       ORDER BY 
         CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END,
         expiry_date ASC,
         received_date ASC`,
      [productId]
    );

    if (batches.length === 0) {
      return res.json({ suggestion: null, reason: 'No batches available' });
    }

    const suggestion = batches[0];
    const now = new Date();
    let urgency = 'normal';
    let reason = 'Use oldest batch first (FIFO)';

    if (suggestion.expiry_date) {
      const expiry = new Date(suggestion.expiry_date);
      const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry < 0) {
        urgency = 'expired';
        reason = '⚠️ This batch has expired - use or dispose immediately';
      } else if (daysUntilExpiry <= 7) {
        urgency = 'urgent';
        reason = `⚠️ Expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'} - use soon!`;
      } else if (daysUntilExpiry <= 30) {
        urgency = 'soon';
        reason = `Expires in ${daysUntilExpiry} days - use before newer batches`;
      } else {
        reason = 'Use oldest batch first (FEFO)';
      }
    }

    res.json({ suggestion, urgency, reason });
  }));

  // Get product by ID
  router.get('/:id', asyncHandler(async (req, res) => {
    const product = await controller.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  }));

  // Create product
  router.post('/', asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    const product = await controller.createProduct(req.body, req.user.username);
    cache.invalidate('products:all');
    res.status(201).json(product);
  }));

  // Bulk create products
  router.post('/bulk', asyncHandler(async (req, res) => {
    const { products } = req.body;
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'Products array is required' });
    }

    const results = await controller.bulkCreateProducts(products, req.user.username);
    cache.invalidate('products:all');
    res.status(201).json(results);
  }));

  // Update product
  router.put('/:id', asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    const product = await controller.updateProduct(req.params.id, req.body, req.user.username);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    cache.invalidate('products:all');
    res.json(product);
  }));

  // Delete product
  router.delete('/:id', asyncHandler(async (req, res) => {
    const product = await controller.deleteProduct(req.params.id, req.user.username);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    cache.invalidate('products:all');
    res.json({ message: 'Product deleted successfully', product });
  }));

  return router;
};
