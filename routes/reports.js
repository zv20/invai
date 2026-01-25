/**
 * Reports Routes
 * HTTP layer for report generation
 */

const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const ReportController = require('../controllers/reportController');

module.exports = (db, cache, csvExporter) => {
  const router = express.Router();
  const controller = new ReportController(db, csvExporter);

  // Stock value report (owner, manager only - contains cost data)
  router.get('/stock-value',
    authenticate,
    requirePermission('reports:view_costs'),
    asyncHandler(async (req, res) => {
      const cacheKey = 'report:stock-value';
      const cached = cache.get(cacheKey);
      if (cached) return res.json(cached);

      const report = await controller.getStockValueReport();
      cache.set(cacheKey, report, 60000);
      res.json(report);
    })
  );

  // Expiration report (all roles)
  router.get('/expiration',
    authenticate,
    requirePermission('reports:view'),
    asyncHandler(async (req, res) => {
      const report = await controller.getExpirationReport();
      res.json(report);
    })
  );

  // Low stock report (all roles)
  router.get('/low-stock',
    authenticate,
    requirePermission('reports:view'),
    asyncHandler(async (req, res) => {
      const report = await controller.getLowStockReport();
      res.json(report);
    })
  );

  // Supplier performance report (all roles)
  router.get('/supplier-performance',
    authenticate,
    requirePermission('reports:view'),
    asyncHandler(async (req, res) => {
      const report = await controller.getSupplierPerformanceReport();
      res.json(report);
    })
  );

  // Category breakdown report (all roles)
  router.get('/category-breakdown',
    authenticate,
    requirePermission('reports:view'),
    asyncHandler(async (req, res) => {
      const report = await controller.getCategoryBreakdownReport();
      res.json(report);
    })
  );

  // Export report to CSV (owner, manager only)
  router.get('/export/:type',
    authenticate,
    requirePermission('reports:export'),
    asyncHandler(async (req, res) => {
      const { type } = req.params;
      
      try {
        const csv = await controller.exportReport(type);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${type}_${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    })
  );

  return router;
};
