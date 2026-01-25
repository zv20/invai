/**
 * Performance Monitoring Routes - Sprint 4 Phase 4
 */

const express = require('express');
const { requirePermission } = require('../middleware/permissions');

module.exports = (queryAnalyzer, cacheManager, dbAdapter, logger) => {
  const router = express.Router();

  // Get performance metrics
  router.get('/metrics', requirePermission('settings:view'), async (req, res, next) => {
    try {
      const queryStats = queryAnalyzer.getStats();
      const cacheStats = cacheManager.getStats();
      const dbConnected = await dbAdapter.isConnected();

      res.json({
        database: {
          type: dbAdapter.getType(),
          connected: dbConnected
        },
        queries: queryStats,
        cache: cacheStats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  });

  // Get slow queries
  router.get('/slow-queries', requirePermission('settings:view'), async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit || '10');
      const slowQueries = queryAnalyzer.getSlowQueries(limit);

      res.json(slowQueries);
    } catch (error) {
      next(error);
    }
  });

  // Get performance recommendations
  router.get('/recommendations', requirePermission('settings:view'), async (req, res, next) => {
    try {
      const recommendations = await queryAnalyzer.getRecommendations();
      res.json(recommendations);
    } catch (error) {
      next(error);
    }
  });

  // Clear cache
  router.post('/cache/clear', requirePermission('settings:update'), async (req, res, next) => {
    try {
      cacheManager.flush();
      logger.info('Cache cleared by user', { userId: req.user.id });
      res.json({ message: 'Cache cleared successfully' });
    } catch (error) {
      next(error);
    }
  });

  // Invalidate cache pattern
  router.post('/cache/invalidate', requirePermission('settings:update'), async (req, res, next) => {
    try {
      const { pattern } = req.body;
      const deleted = cacheManager.invalidatePattern(pattern);
      
      logger.info('Cache pattern invalidated', { userId: req.user.id, pattern, deleted });
      res.json({ message: `Invalidated ${deleted} cache entries` });
    } catch (error) {
      next(error);
    }
  });

  return router;
};