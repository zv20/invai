/**
 * Widget Engine
 * Manages widget registry, data providers, and lifecycle
 */

class WidgetEngine {
  constructor(db) {
    this.db = db;
    this.widgets = this.initializeWidgets();
  }

  /**
   * Initialize built-in widget types
   */
  initializeWidgets() {
    return {
      metric_card: {
        name: 'Metric Card',
        description: 'Display a single metric value',
        icon: '📊',
        defaultSize: { width: 1, height: 1 },
        configSchema: {
          metric: { type: 'select', label: 'Metric', required: true },
          color: { type: 'color', label: 'Color', default: '#4CAF50' },
          icon: { type: 'text', label: 'Icon' }
        },
        dataProvider: this.getMetricData.bind(this)
      },
      chart: {
        name: 'Chart Widget',
        description: 'Display data as charts',
        icon: '📈',
        defaultSize: { width: 2, height: 2 },
        configSchema: {
          chartType: { type: 'select', label: 'Chart Type', options: ['line', 'bar', 'pie'], required: true },
          dataSource: { type: 'select', label: 'Data Source', required: true },
          timeRange: { type: 'select', label: 'Time Range', options: ['7d', '30d', '90d'], default: '30d' }
        },
        dataProvider: this.getChartData.bind(this)
      },
      table: {
        name: 'Data Table',
        description: 'Display data in table format',
        icon: '📋',
        defaultSize: { width: 3, height: 2 },
        configSchema: {
          dataSource: { type: 'select', label: 'Data Source', required: true },
          columns: { type: 'multiselect', label: 'Columns' },
          limit: { type: 'number', label: 'Row Limit', default: 10 }
        },
        dataProvider: this.getTableData.bind(this)
      },
      alert_list: {
        name: 'Alert List',
        description: 'Display alerts and warnings',
        icon: '⚠️',
        defaultSize: { width: 2, height: 2 },
        configSchema: {
          alertTypes: { type: 'multiselect', label: 'Alert Types', options: ['low_stock', 'expiring', 'out_of_stock'] },
          limit: { type: 'number', label: 'Max Alerts', default: 10 }
        },
        dataProvider: this.getAlertData.bind(this)
      },
      recent_activity: {
        name: 'Recent Activity',
        description: 'Show recent transactions',
        icon: '🕐',
        defaultSize: { width: 2, height: 2 },
        configSchema: {
          activityType: { type: 'select', label: 'Activity Type', options: ['all', 'in', 'out', 'adjustment'] },
          limit: { type: 'number', label: 'Items', default: 10 }
        },
        dataProvider: this.getRecentActivity.bind(this)
      },
      quick_actions: {
        name: 'Quick Actions',
        description: 'Action buttons and shortcuts',
        icon: '⚡',
        defaultSize: { width: 1, height: 1 },
        configSchema: {
          actions: { type: 'multiselect', label: 'Actions', options: ['add_product', 'record_transaction', 'stock_take', 'reports'] }
        },
        dataProvider: async () => ({ actions: [] })
      },
      top_products: {
        name: 'Top Products',
        description: 'Best selling or most used products',
        icon: '🏆',
        defaultSize: { width: 2, height: 2 },
        configSchema: {
          sortBy: { type: 'select', label: 'Sort By', options: ['usage', 'value', 'transactions'], default: 'usage' },
          timeRange: { type: 'select', label: 'Time Range', options: ['7d', '30d', '90d'], default: '30d' },
          limit: { type: 'number', label: 'Products', default: 10 }
        },
        dataProvider: this.getTopProducts.bind(this)
      },
      stock_status: {
        name: 'Stock Status Overview',
        description: 'Inventory status summary',
        icon: '📦',
        defaultSize: { width: 2, height: 1 },
        configSchema: {},
        dataProvider: this.getStockStatus.bind(this)
      },
      value_summary: {
        name: 'Value Summary',
        description: 'Financial metrics overview',
        icon: '💰',
        defaultSize: { width: 2, height: 1 },
        configSchema: {
          metrics: { type: 'multiselect', label: 'Metrics', options: ['total_value', 'avg_value', 'low_stock_value'] }
        },
        dataProvider: this.getValueSummary.bind(this)
      },
      category_breakdown: {
        name: 'Category Breakdown',
        description: 'Distribution by category',
        icon: '🥧',
        defaultSize: { width: 2, height: 2 },
        configSchema: {
          metric: { type: 'select', label: 'Metric', options: ['count', 'value', 'stock'], default: 'value' }
        },
        dataProvider: this.getCategoryBreakdown.bind(this)
      },
      supplier_performance: {
        name: 'Supplier Performance',
        description: 'Supplier statistics',
        icon: '🤝',
        defaultSize: { width: 2, height: 2 },
        configSchema: {
          limit: { type: 'number', label: 'Suppliers', default: 5 }
        },
        dataProvider: this.getSupplierPerformance.bind(this)
      },
      custom_html: {
        name: 'Custom HTML',
        description: 'Custom content',
        icon: '✏️',
        defaultSize: { width: 2, height: 1 },
        configSchema: {
          content: { type: 'textarea', label: 'HTML Content' }
        },
        dataProvider: async (config) => ({ html: config.content })
      }
    };
  }

  /**
   * Get widget types
   */
  getWidgetTypes() {
    return Object.keys(this.widgets).map(key => ({
      type: key,
      ...this.widgets[key],
      dataProvider: undefined // Don't expose functions
    }));
  }

  /**
   * Get widget data
   */
  async getWidgetData(widgetType, config = {}) {
    const widget = this.widgets[widgetType];
    if (!widget || !widget.dataProvider) {
      throw new Error(`Unknown widget type: ${widgetType}`);
    }

    return await widget.dataProvider(config);
  }

  /**
   * Data Providers
   */
  async getMetricData(config) {
    const metrics = {
      total_products: async () => {
        const result = await this.db.get('SELECT COUNT(*) as count FROM products WHERE active = 1');
        return { value: result.count, label: 'Total Products', trend: '+5%' };
      },
      low_stock_count: async () => {
        const result = await this.db.get('SELECT COUNT(*) as count FROM products WHERE stock_quantity <= min_stock_level AND active = 1');
        return { value: result.count, label: 'Low Stock Items', trend: '-2%' };
      },
      total_value: async () => {
        const result = await this.db.get('SELECT SUM(stock_quantity * cost) as value FROM products WHERE active = 1');
        return { value: `$${(result.value || 0).toFixed(2)}`, label: 'Total Inventory Value', trend: '+12%' };
      },
      out_of_stock: async () => {
        const result = await this.db.get('SELECT COUNT(*) as count FROM products WHERE stock_quantity = 0 AND active = 1');
        return { value: result.count, label: 'Out of Stock', trend: 'stable' };
      }
    };

    const metricFn = metrics[config.metric];
    if (!metricFn) {
      return { value: 0, label: 'Unknown Metric' };
    }

    return await metricFn();
  }

  async getChartData(config) {
    // Simplified - integrate with chartGenerator from analytics
    return {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        label: 'Sample Data',
        data: [12, 19, 3, 5, 2, 3, 7]
      }]
    };
  }

  async getTableData(config) {
    const limit = config.limit || 10;
    const products = await this.db.all(`
      SELECT id, name, sku, stock_quantity, price
      FROM products
      WHERE active = 1
      ORDER BY created_at DESC
      LIMIT ?
    `, [limit]);

    return { rows: products };
  }

  async getAlertData(config) {
    const alerts = [];
    
    // Low stock alerts
    const lowStock = await this.db.all(`
      SELECT id, name, stock_quantity, min_stock_level
      FROM products
      WHERE stock_quantity <= min_stock_level AND active = 1
      LIMIT 10
    `);
    
    lowStock.forEach(p => {
      alerts.push({
        type: 'warning',
        title: 'Low Stock',
        message: `${p.name} is running low (${p.stock_quantity} units)`,
        product_id: p.id
      });
    });

    // Expiring items
    const expiring = await this.db.all(`
      SELECT id, name, expiration_date
      FROM products
      WHERE expiration_date <= datetime('now', '+30 days') AND active = 1
      LIMIT 10
    `);

    expiring.forEach(p => {
      alerts.push({
        type: 'danger',
        title: 'Expiring Soon',
        message: `${p.name} expires on ${p.expiration_date}`,
        product_id: p.id
      });
    });

    return { alerts: alerts.slice(0, config.limit || 10) };
  }

  async getRecentActivity(config) {
    const limit = config.limit || 10;
    const transactions = await this.db.all(`
      SELECT 
        it.*,
        p.name as product_name,
        u.username
      FROM inventory_transactions it
      LEFT JOIN products p ON it.product_id = p.id
      LEFT JOIN users u ON it.user_id = u.id
      ORDER BY it.created_at DESC
      LIMIT ?
    `, [limit]);

    return { activities: transactions };
  }

  async getTopProducts(config) {
    const timeRange = config.timeRange || '30d';
    const days = parseInt(timeRange);

    const products = await this.db.all(`
      SELECT 
        p.id,
        p.name,
        p.sku,
        SUM(ABS(it.quantity_change)) as total_usage,
        COUNT(it.id) as transaction_count
      FROM products p
      INNER JOIN inventory_transactions it ON p.id = it.product_id
      WHERE it.created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY p.id
      ORDER BY total_usage DESC
      LIMIT ?
    `, [days, config.limit || 10]);

    return { products };
  }

  async getStockStatus() {
    const stats = await this.db.get(`
      SELECT 
        COUNT(*) as total_products,
        SUM(CASE WHEN stock_quantity <= min_stock_level THEN 1 ELSE 0 END) as low_stock,
        SUM(CASE WHEN stock_quantity = 0 THEN 1 ELSE 0 END) as out_of_stock,
        SUM(CASE WHEN stock_quantity > max_stock_level THEN 1 ELSE 0 END) as excess_stock,
        SUM(CASE WHEN stock_quantity > min_stock_level AND stock_quantity <= max_stock_level THEN 1 ELSE 0 END) as adequate_stock
      FROM products
      WHERE active = 1
    `);

    return stats;
  }

  async getValueSummary() {
    const summary = await this.db.get(`
      SELECT 
        SUM(stock_quantity * cost) as total_value,
        AVG(stock_quantity * cost) as avg_value,
        COUNT(*) as product_count
      FROM products
      WHERE active = 1
    `);

    return {
      total_value: summary.total_value || 0,
      avg_value: summary.avg_value || 0,
      product_count: summary.product_count || 0
    };
  }

  async getCategoryBreakdown(config) {
    const metric = config.metric || 'value';
    
    let selectClause;
    if (metric === 'value') {
      selectClause = 'SUM(p.stock_quantity * p.cost) as value';
    } else if (metric === 'stock') {
      selectClause = 'SUM(p.stock_quantity) as value';
    } else {
      selectClause = 'COUNT(*) as value';
    }

    const categories = await this.db.all(`
      SELECT 
        c.name,
        ${selectClause}
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.active = 1
      GROUP BY c.id
      ORDER BY value DESC
    `);

    return { categories };
  }

  async getSupplierPerformance(config) {
    const suppliers = await this.db.all(`
      SELECT 
        s.name,
        COUNT(p.id) as product_count,
        SUM(p.stock_quantity * p.cost) as total_value,
        AVG(p.stock_quantity) as avg_stock
      FROM suppliers s
      LEFT JOIN products p ON s.id = p.supplier_id AND p.active = 1
      WHERE s.active = 1
      GROUP BY s.id
      ORDER BY total_value DESC
      LIMIT ?
    `, [config.limit || 5]);

    return { suppliers };
  }
}

module.exports = WidgetEngine;
