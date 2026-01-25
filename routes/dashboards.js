/**
 * Dashboard API Routes
 * Provides endpoints for dashboard customization
 */

const express = require('express');
const router = express.Router();
const DashboardManager = require('../lib/dashboard/dashboardManager');
const WidgetEngine = require('../lib/dashboard/widgetEngine');

/**
 * GET /api/dashboards
 * Get user's dashboards
 */
router.get('/', async (req, res) => {
  try {
    const manager = new DashboardManager(req.app.locals.db);
    const dashboards = await manager.getUserDashboards(req.user?.id || 0);

    res.json({
      success: true,
      data: dashboards
    });
  } catch (error) {
    console.error('Get dashboards error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/dashboards
 * Create a new dashboard
 */
router.post('/', async (req, res) => {
  try {
    const manager = new DashboardManager(req.app.locals.db);
    const dashboardId = await manager.createDashboard(req.user?.id || 0, req.body);

    res.json({
      success: true,
      id: dashboardId
    });
  } catch (error) {
    console.error('Create dashboard error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/dashboards/:id
 * Get a specific dashboard
 */
router.get('/:id', async (req, res) => {
  try {
    const dashboardId = parseInt(req.params.id);
    const manager = new DashboardManager(req.app.locals.db);
    const dashboard = await manager.getDashboard(dashboardId, req.user?.id || 0);

    if (!dashboard) {
      return res.status(404).json({
        success: false,
        error: 'Dashboard not found'
      });
    }

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/dashboards/:id
 * Update a dashboard
 */
router.put('/:id', async (req, res) => {
  try {
    const dashboardId = parseInt(req.params.id);
    const manager = new DashboardManager(req.app.locals.db);
    const success = await manager.updateDashboard(dashboardId, req.user?.id || 0, req.body);

    res.json({ success });
  } catch (error) {
    console.error('Update dashboard error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/dashboards/:id
 * Delete a dashboard
 */
router.delete('/:id', async (req, res) => {
  try {
    const dashboardId = parseInt(req.params.id);
    const manager = new DashboardManager(req.app.locals.db);
    const success = await manager.deleteDashboard(dashboardId, req.user?.id || 0);

    res.json({ success });
  } catch (error) {
    console.error('Delete dashboard error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/dashboards/:id/clone
 * Clone a dashboard
 */
router.post('/:id/clone', async (req, res) => {
  try {
    const dashboardId = parseInt(req.params.id);
    const { name } = req.body;
    const manager = new DashboardManager(req.app.locals.db);
    const newId = await manager.cloneDashboard(dashboardId, req.user?.id || 0, name);

    res.json({
      success: true,
      id: newId
    });
  } catch (error) {
    console.error('Clone dashboard error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/dashboards/templates/list
 * Get dashboard templates
 */
router.get('/templates/list', async (req, res) => {
  try {
    const manager = new DashboardManager(req.app.locals.db);
    const templates = manager.getTemplates();

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/dashboards/templates/:templateId
 * Create dashboard from template
 */
router.post('/templates/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    const { name } = req.body;
    const manager = new DashboardManager(req.app.locals.db);
    const dashboardId = await manager.createFromTemplate(req.user?.id || 0, templateId, name);

    res.json({
      success: true,
      id: dashboardId
    });
  } catch (error) {
    console.error('Create from template error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/dashboards/:id/export
 * Export dashboard configuration
 */
router.get('/:id/export', async (req, res) => {
  try {
    const dashboardId = parseInt(req.params.id);
    const manager = new DashboardManager(req.app.locals.db);
    const config = await manager.exportDashboard(dashboardId, req.user?.id || 0);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=dashboard-${dashboardId}.json`);
    res.json(config);
  } catch (error) {
    console.error('Export dashboard error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/dashboards/import
 * Import dashboard configuration
 */
router.post('/import', async (req, res) => {
  try {
    const manager = new DashboardManager(req.app.locals.db);
    const dashboardId = await manager.importDashboard(req.user?.id || 0, req.body);

    res.json({
      success: true,
      id: dashboardId
    });
  } catch (error) {
    console.error('Import dashboard error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/widgets/types
 * Get available widget types
 */
router.get('/widgets/types', async (req, res) => {
  try {
    const engine = new WidgetEngine(req.app.locals.db);
    const types = engine.getWidgetTypes();

    res.json({
      success: true,
      data: types
    });
  } catch (error) {
    console.error('Get widget types error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/widgets/:type/data
 * Get data for a specific widget type
 */
router.post('/widgets/:type/data', async (req, res) => {
  try {
    const { type } = req.params;
    const config = req.body;
    const engine = new WidgetEngine(req.app.locals.db);
    const data = await engine.getWidgetData(type, config);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get widget data error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
