/**
 * Dashboard Manager
 * Handles dashboard CRUD operations and user preferences
 */

class DashboardManager {
  constructor(db) {
    this.db = db;
  }

  /**
   * Create a new dashboard
   */
  async createDashboard(userId, dashboardData) {
    const {
      name,
      description = '',
      layout = [],
      isDefault = false,
      isShared = false
    } = dashboardData;

    const result = await this.db.run(`
      INSERT INTO dashboards (user_id, name, description, layout, is_default, is_shared, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [userId, name, description, JSON.stringify(layout), isDefault ? 1 : 0, isShared ? 1 : 0]);

    // If set as default, unset others
    if (isDefault) {
      await this.db.run(`
        UPDATE dashboards
        SET is_default = 0
        WHERE user_id = ? AND id != ?
      `, [userId, result.lastID]);
    }

    return result.lastID;
  }

  /**
   * Get user's dashboards
   */
  async getUserDashboards(userId, includeShared = true) {
    const condition = includeShared
      ? '(user_id = ? OR is_shared = 1)'
      : 'user_id = ?';

    const dashboards = await this.db.all(`
      SELECT 
        id,
        name,
        description,
        layout,
        is_default,
        is_shared,
        created_at,
        updated_at
      FROM dashboards
      WHERE ${condition}
      ORDER BY is_default DESC, updated_at DESC
    `, [userId]);

    return dashboards.map(d => ({
      ...d,
      layout: JSON.parse(d.layout),
      is_default: Boolean(d.is_default),
      is_shared: Boolean(d.is_shared)
    }));
  }

  /**
   * Get a specific dashboard
   */
  async getDashboard(dashboardId, userId) {
    const dashboard = await this.db.get(`
      SELECT *
      FROM dashboards
      WHERE id = ? AND (user_id = ? OR is_shared = 1)
    `, [dashboardId, userId]);

    if (!dashboard) return null;

    return {
      ...dashboard,
      layout: JSON.parse(dashboard.layout),
      is_default: Boolean(dashboard.is_default),
      is_shared: Boolean(dashboard.is_shared)
    };
  }

  /**
   * Update dashboard
   */
  async updateDashboard(dashboardId, userId, updates) {
    const allowedFields = ['name', 'description', 'layout', 'is_default', 'is_shared'];
    const updateFields = [];
    const params = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = ?`);
        if (key === 'layout') {
          params.push(JSON.stringify(value));
        } else if (key === 'is_default' || key === 'is_shared') {
          params.push(value ? 1 : 0);
        } else {
          params.push(value);
        }
      }
    }

    if (updateFields.length === 0) return false;

    updateFields.push('updated_at = datetime("now")');
    params.push(dashboardId, userId);

    const result = await this.db.run(`
      UPDATE dashboards
      SET ${updateFields.join(', ')}
      WHERE id = ? AND user_id = ?
    `, params);

    // If set as default, unset others
    if (updates.is_default) {
      await this.db.run(`
        UPDATE dashboards
        SET is_default = 0
        WHERE user_id = ? AND id != ?
      `, [userId, dashboardId]);
    }

    return result.changes > 0;
  }

  /**
   * Delete dashboard
   */
  async deleteDashboard(dashboardId, userId) {
    const result = await this.db.run(`
      DELETE FROM dashboards
      WHERE id = ? AND user_id = ?
    `, [dashboardId, userId]);

    return result.changes > 0;
  }

  /**
   * Clone dashboard
   */
  async cloneDashboard(dashboardId, userId, newName) {
    const dashboard = await this.getDashboard(dashboardId, userId);
    if (!dashboard) {
      throw new Error('Dashboard not found');
    }

    return await this.createDashboard(userId, {
      name: newName || `${dashboard.name} (Copy)`,
      description: dashboard.description,
      layout: dashboard.layout,
      isDefault: false,
      isShared: false
    });
  }

  /**
   * Get default dashboard for user
   */
  async getDefaultDashboard(userId) {
    const dashboard = await this.db.get(`
      SELECT *
      FROM dashboards
      WHERE user_id = ? AND is_default = 1
    `, [userId]);

    if (!dashboard) return null;

    return {
      ...dashboard,
      layout: JSON.parse(dashboard.layout),
      is_default: true,
      is_shared: Boolean(dashboard.is_shared)
    };
  }

  /**
   * Get dashboard templates
   */
  getTemplates() {
    return [
      {
        id: 'default',
        name: 'Default Dashboard',
        description: 'Standard overview dashboard',
        layout: [
          { i: '1', x: 0, y: 0, w: 1, h: 1, widgetType: 'metric_card', config: { metric: 'total_products' } },
          { i: '2', x: 1, y: 0, w: 1, h: 1, widgetType: 'metric_card', config: { metric: 'low_stock_count' } },
          { i: '3', x: 2, y: 0, w: 1, h: 1, widgetType: 'metric_card', config: { metric: 'total_value' } },
          { i: '4', x: 3, y: 0, w: 1, h: 1, widgetType: 'metric_card', config: { metric: 'out_of_stock' } },
          { i: '5', x: 0, y: 1, w: 2, h: 2, widgetType: 'chart', config: { chartType: 'line', dataSource: 'stock_trends' } },
          { i: '6', x: 2, y: 1, w: 2, h: 2, widgetType: 'alert_list', config: { alertTypes: ['low_stock', 'expiring'] } }
        ]
      },
      {
        id: 'analytics',
        name: 'Analytics Dashboard',
        description: 'Focus on charts and metrics',
        layout: [
          { i: '1', x: 0, y: 0, w: 2, h: 1, widgetType: 'value_summary', config: {} },
          { i: '2', x: 2, y: 0, w: 2, h: 1, widgetType: 'stock_status', config: {} },
          { i: '3', x: 0, y: 1, w: 2, h: 2, widgetType: 'category_breakdown', config: { metric: 'value' } },
          { i: '4', x: 2, y: 1, w: 2, h: 2, widgetType: 'top_products', config: { sortBy: 'usage', limit: 10 } }
        ]
      },
      {
        id: 'operations',
        name: 'Operations Dashboard',
        description: 'Focused on daily operations',
        layout: [
          { i: '1', x: 0, y: 0, w: 2, h: 2, widgetType: 'alert_list', config: { alertTypes: ['low_stock', 'out_of_stock'] } },
          { i: '2', x: 2, y: 0, w: 2, h: 2, widgetType: 'recent_activity', config: { limit: 15 } },
          { i: '3', x: 0, y: 2, w: 1, h: 1, widgetType: 'quick_actions', config: {} }
        ]
      },
      {
        id: 'executive',
        name: 'Executive Dashboard',
        description: 'High-level overview for management',
        layout: [
          { i: '1', x: 0, y: 0, w: 1, h: 1, widgetType: 'metric_card', config: { metric: 'total_value' } },
          { i: '2', x: 1, y: 0, w: 1, h: 1, widgetType: 'metric_card', config: { metric: 'total_products' } },
          { i: '3', x: 0, y: 1, w: 2, h: 2, widgetType: 'category_breakdown', config: { metric: 'value' } },
          { i: '4', x: 2, y: 0, w: 2, h: 3, widgetType: 'supplier_performance', config: { limit: 8 } }
        ]
      }
    ];
  }

  /**
   * Create dashboard from template
   */
  async createFromTemplate(userId, templateId, customName = null) {
    const templates = this.getTemplates();
    const template = templates.find(t => t.id === templateId);

    if (!template) {
      throw new Error('Template not found');
    }

    return await this.createDashboard(userId, {
      name: customName || template.name,
      description: template.description,
      layout: template.layout,
      isDefault: false
    });
  }

  /**
   * Export dashboard configuration
   */
  async exportDashboard(dashboardId, userId) {
    const dashboard = await this.getDashboard(dashboardId, userId);
    if (!dashboard) {
      throw new Error('Dashboard not found');
    }

    return {
      name: dashboard.name,
      description: dashboard.description,
      layout: dashboard.layout,
      version: '1.0',
      exported_at: new Date().toISOString()
    };
  }

  /**
   * Import dashboard configuration
   */
  async importDashboard(userId, dashboardConfig) {
    return await this.createDashboard(userId, {
      name: dashboardConfig.name,
      description: dashboardConfig.description,
      layout: dashboardConfig.layout
    });
  }
}

module.exports = DashboardManager;
