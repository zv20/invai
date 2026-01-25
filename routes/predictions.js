/**
 * Predictions API Routes
 * Provides endpoints for demand forecasting and inventory optimization
 */

const express = require('express');
const router = express.Router();
const PredictionService = require('../lib/analytics/predictionService');
const InventoryOptimizer = require('../lib/analytics/inventoryOptimizer');

/**
 * POST /api/predictions/demand/:productId
 * Get demand forecast for a specific product
 */
router.post('/demand/:productId', async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    const options = req.body || {};

    const predictionService = new PredictionService(req.app.locals.db);
    const forecast = await predictionService.predictDemand(productId, options);

    res.json({
      success: true,
      data: forecast
    });
  } catch (error) {
    console.error('Error predicting demand:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/predictions/reorder-points
 * Get reorder recommendations for all products
 */
router.get('/reorder-points', async (req, res) => {
  try {
    const predictionService = new PredictionService(req.app.locals.db);
    const recommendations = await predictionService.getReorderRecommendations();

    res.json({
      success: true,
      count: recommendations.length,
      data: recommendations
    });
  } catch (error) {
    console.error('Error getting reorder points:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/predictions/reorder/:productId
 * Get reorder point calculation for a specific product
 */
router.get('/reorder/:productId', async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    const predictionService = new PredictionService(req.app.locals.db);
    const reorderInfo = await predictionService.calculateReorderPoint(productId);

    res.json({
      success: true,
      data: reorderInfo
    });
  } catch (error) {
    console.error('Error calculating reorder point:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/predictions/patterns/:productId
 * Analyze demand patterns for a product
 */
router.get('/patterns/:productId', async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    const predictionService = new PredictionService(req.app.locals.db);
    const patterns = await predictionService.analyzeDemandPatterns(productId);

    res.json({
      success: true,
      data: patterns
    });
  } catch (error) {
    console.error('Error analyzing patterns:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/predictions/optimization/abc
 * Get ABC analysis for inventory
 */
router.get('/optimization/abc', async (req, res) => {
  try {
    const optimizer = new InventoryOptimizer(req.app.locals.db);
    const analysis = await optimizer.abcAnalysis();

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Error performing ABC analysis:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/predictions/optimization/slow-moving
 * Identify slow-moving inventory
 */
router.get('/optimization/slow-moving', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 90;
    const optimizer = new InventoryOptimizer(req.app.locals.db);
    const slowMoving = await optimizer.identifySlowMoving(days);

    res.json({
      success: true,
      count: slowMoving.length,
      data: slowMoving
    });
  } catch (error) {
    console.error('Error identifying slow-moving inventory:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/predictions/optimization/excess
 * Identify excess inventory
 */
router.get('/optimization/excess', async (req, res) => {
  try {
    const optimizer = new InventoryOptimizer(req.app.locals.db);
    const excess = await optimizer.identifyExcessInventory();

    res.json({
      success: true,
      count: excess.length,
      data: excess
    });
  } catch (error) {
    console.error('Error identifying excess inventory:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/predictions/optimization/report
 * Get comprehensive optimization report
 */
router.get('/optimization/report', async (req, res) => {
  try {
    const optimizer = new InventoryOptimizer(req.app.locals.db);
    const report = await optimizer.generateOptimizationReport();

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating optimization report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
