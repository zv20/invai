/**
 * Analytics Routes - Sprint 5 Phase 1
 * 
 * Advanced analytics and reporting API
 */

const express = require('express');
const { requirePermission } = require('../middleware/permissions');
const AnalyticsService = require('../lib/analytics/analyticsService');
const ChartGenerator = require('../lib/analytics/chartGenerator');

module.exports = (db) => {
  const router = express.Router();
  const analytics = new AnalyticsService(db);

  // Get inventory turnover analysis
  router.get('/turnover', requirePermission('reports:view'), async (req, res, next) => {
    try {
      const days = parseInt(req.query.days || '30');
      const data = await analytics.getInventoryTurnover(days);
      
      res.json({
        data,
        chart: ChartGenerator.turnoverChart(data)
      });
    } catch (error) {
      next(error);
    }
  });

  // Get stock level trends
  router.get('/stock-trends', requirePermission('reports:view'), async (req, res, next) => {
    try {
      const days = parseInt(req.query.days || '30');
      const data = await analytics.getStockLevelTrends(days);
      
      res.json({
        data,
        chart: ChartGenerator.stockTrendChart(data)
      });
    } catch (error) {
      next(error);
    }
  });

  // Get inventory value trends
  router.get('/value-trends', requirePermission('reports:view'), async (req, res, next) => {
    try {
      const days = parseInt(req.query.days || '30');
      const data = await analytics.getValueTrends(days);
      
      res.json(data);
    } catch (error) {
      next(error);
    }
  });

  // Get expiration timeline
  router.get('/expiration-timeline', requirePermission('reports:view'), async (req, res, next) => {
    try {
      const data = await analytics.getExpirationTimeline();
      
      res.json({
        data,
        chart: ChartGenerator.expirationTimelineChart(data)
      });
    } catch (error) {
      next(error);
    }
  });

  // Get cost analytics
  router.get('/costs', requirePermission('reports:view'), async (req, res, next) => {
    try {
      const data = await analytics.getCostAnalytics();
      
      res.json({
        ...data,
        categoryChart: ChartGenerator.categoryValueChart(data.byCategory)
      });
    } catch (error) {
      next(error);
    }
  });

  // Get usage patterns
  router.get('/usage-patterns', requirePermission('reports:view'), async (req, res, next) => {
    try {
      const days = parseInt(req.query.days || '30');
      const data = await analytics.getUsagePatterns(days);
      
      res.json({
        data,
        chart: ChartGenerator.usagePatternChart(data)
      });
    } catch (error) {
      next(error);
    }
  });

  // Get product velocity (fast vs slow movers)
  router.get('/velocity', requirePermission('reports:view'), async (req, res, next) => {
    try {
      const days = parseInt(req.query.days || '30');
      const data = await analytics.getProductVelocity(days);
      
      res.json({
        data,
        chart: ChartGenerator.velocityChart(data)
      });
    } catch (error) {
      next(error);
    }
  });

  // Get performance metrics
  router.get('/metrics', requirePermission('reports:view'), async (req, res, next) => {
    try {
      const metrics = await analytics.getPerformanceMetrics();
      res.json(metrics);
    } catch (error) {
      next(error);
    }
  });

  // Get dashboard summary (all key metrics)
  router.get('/dashboard', requirePermission('reports:view'), async (req, res, next) => {
    try {
      const days = parseInt(req.query.days || '30');
      
      const [turnover, trends, expiration, costs, patterns, velocity, metrics] = await Promise.all([
        analytics.getInventoryTurnover(days),
        analytics.getStockLevelTrends(days),
        analytics.getExpirationTimeline(),
        analytics.getCostAnalytics(),
        analytics.getUsagePatterns(days),
        analytics.getProductVelocity(days),
        analytics.getPerformanceMetrics()
      ]);

      res.json({
        turnover: { data: turnover, chart: ChartGenerator.turnoverChart(turnover) },
        trends: { data: trends, chart: ChartGenerator.stockTrendChart(trends) },
        expiration: { data: expiration, chart: ChartGenerator.expirationTimelineChart(expiration) },
        costs: { ...costs, chart: ChartGenerator.categoryValueChart(costs.byCategory) },
        patterns: { data: patterns, chart: ChartGenerator.usagePatternChart(patterns) },
        velocity: { data: velocity, chart: ChartGenerator.velocityChart(velocity) },
        metrics
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
};