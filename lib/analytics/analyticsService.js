/**
 * Analytics Service - Sprint 5 Phase 1
 * 
 * Core analytics engine for inventory insights
 */

class AnalyticsService {
  constructor(dbAdapter) {
    this.db = dbAdapter;
  }

  /**
   * Calculate inventory turnover rate
   * Formula: Cost of Goods Sold / Average Inventory Value
   */
  async calculateTurnoverRate(productId = null, startDate, endDate) {
    const dateFilter = `WHERE date(created_at) BETWEEN date('${startDate}') AND date('${endDate}')`;
    const productFilter = productId ? `AND product_id = ${productId}` : '';

    // Get total usage/sales in period
    const usage = await this.db.get(
      `SELECT SUM(quantity_change * -1) as total_sold
       FROM inventory_transactions
       ${dateFilter} ${productFilter}
       AND quantity_change < 0`
    );

    // Get average inventory value
    const avgInventory = await this.db.get(
      `SELECT AVG(total_value) as avg_value
       FROM (
         SELECT date(created_at) as date,
                SUM(quantity_change) as quantity,
                SUM(quantity_change * unit_cost) as total_value
         FROM inventory_transactions
         ${dateFilter} ${productFilter}
         GROUP BY date(created_at)
       )`
    );

    const turnoverRate = avgInventory.avg_value > 0 
      ? (usage.total_sold || 0) / avgInventory.avg_value 
      : 0;

    return {
      turnoverRate: parseFloat(turnoverRate.toFixed(2)),
      totalSold: usage.total_sold || 0,
      avgInventoryValue: avgInventory.avg_value || 0
    };
  }

  /**
   * Calculate days on hand (inventory)
   * Formula: (Current Inventory / Average Daily Usage) 
   */
  async calculateDaysOnHand(productId) {
    // Get current inventory
    const current = await this.db.get(
      `SELECT SUM(total_quantity) as current_qty
       FROM inventory_batches
       WHERE product_id = ? AND total_quantity > 0`,
      [productId]
    );

    // Get average daily usage (last 30 days)
    const avgUsage = await this.db.get(
      `SELECT AVG(daily_usage) as avg_daily
       FROM (
         SELECT date(created_at) as date,
                SUM(quantity_change * -1) as daily_usage
         FROM inventory_transactions
         WHERE product_id = ?
         AND quantity_change < 0
         AND date(created_at) >= date('now', '-30 days')
         GROUP BY date(created_at)
       )`,
      [productId]
    );

    const daysOnHand = avgUsage.avg_daily > 0
      ? (current.current_qty || 0) / avgUsage.avg_daily
      : 0;

    return {
      daysOnHand: parseFloat(daysOnHand.toFixed(1)),
      currentQuantity: current.current_qty || 0,
      avgDailyUsage: avgUsage.avg_daily || 0
    };
  }

  /**
   * Get inventory value trends over time
   */
  async getValueTrends(startDate, endDate, groupBy = 'day') {
    const groupFormat = {
      day: '%Y-%m-%d',
      week: '%Y-W%W',
      month: '%Y-%m'
    }[groupBy] || '%Y-%m-%d';

    const trends = await this.db.all(
      `SELECT strftime('${groupFormat}', created_at) as period,
              SUM(CASE WHEN quantity_change > 0 THEN quantity_change * unit_cost ELSE 0 END) as value_added,
              SUM(CASE WHEN quantity_change < 0 THEN quantity_change * unit_cost ELSE 0 END) as value_removed,
              SUM(quantity_change * unit_cost) as net_change
       FROM inventory_transactions
       WHERE date(created_at) BETWEEN date(?) AND date(?)
       GROUP BY period
       ORDER BY period`,
      [startDate, endDate]
    );

    return trends;
  }

  /**
   * Get cost per unit trends for a product
   */
  async getCostTrends(productId, startDate, endDate) {
    const trends = await this.db.all(
      `SELECT date(created_at) as date,
              AVG(unit_cost) as avg_cost,
              MIN(unit_cost) as min_cost,
              MAX(unit_cost) as max_cost
       FROM inventory_transactions
       WHERE product_id = ?
       AND date(created_at) BETWEEN date(?) AND date(?)
       GROUP BY date(created_at)
       ORDER BY date`,
      [productId, startDate, endDate]
    );

    return trends;
  }

  /**
   * Get usage patterns by day of week
   */
  async getUsagePatterns(productId = null, startDate, endDate) {
    const productFilter = productId ? 'AND product_id = ?' : '';
    const params = productId ? [productId, startDate, endDate] : [startDate, endDate];

    const patterns = await this.db.all(
      `SELECT CAST(strftime('%w', created_at) AS INTEGER) as day_of_week,
              AVG(quantity_change * -1) as avg_usage,
              SUM(quantity_change * -1) as total_usage
       FROM inventory_transactions
       WHERE quantity_change < 0
       ${productFilter}
       AND date(created_at) BETWEEN date(?) AND date(?)
       GROUP BY day_of_week
       ORDER BY day_of_week`,
      params
    );

    // Map to day names
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return patterns.map(p => ({
      ...p,
      day_name: dayNames[p.day_of_week]
    }));
  }

  /**
   * Identify fast-moving vs slow-moving products
   */
  async getProductVelocity(startDate, endDate, limit = 20) {
    const products = await this.db.all(
      `SELECT p.id, p.name, p.barcode,
              SUM(it.quantity_change * -1) as total_sold,
              AVG(it.quantity_change * -1) as avg_daily_sold,
              COUNT(DISTINCT date(it.created_at)) as active_days
       FROM products p
       LEFT JOIN inventory_transactions it ON p.id = it.product_id
       WHERE it.quantity_change < 0
       AND date(it.created_at) BETWEEN date(?) AND date(?)
       GROUP BY p.id
       ORDER BY total_sold DESC
       LIMIT ?`,
      [startDate, endDate, limit]
    );

    // Categorize
    const median = products[Math.floor(products.length / 2)]?.total_sold || 0;
    
    return products.map(p => ({
      ...p,
      velocity: p.total_sold > median ? 'fast' : 'slow',
      velocity_score: parseFloat((p.total_sold / (p.active_days || 1)).toFixed(2))
    }));
  }

  /**
   * Get category breakdown
   */
  async getCategoryBreakdown() {
    const breakdown = await this.db.all(
      `SELECT c.name as category,
              COUNT(DISTINCT p.id) as product_count,
              SUM(ib.total_quantity) as total_quantity,
              SUM(ib.total_quantity * p.cost_per_case / p.items_per_case) as total_value
       FROM categories c
       LEFT JOIN products p ON c.id = p.category_id
       LEFT JOIN inventory_batches ib ON p.id = ib.product_id
       WHERE ib.total_quantity > 0
       GROUP BY c.id
       ORDER BY total_value DESC`
    );

    return breakdown;
  }

  /**
   * Get expiration timeline
   */
  async getExpirationTimeline(daysAhead = 90) {
    const timeline = await this.db.all(
      `SELECT date(expiration_date) as exp_date,
              COUNT(*) as batch_count,
              SUM(total_quantity) as total_quantity,
              SUM(total_quantity * unit_cost) as total_value
       FROM inventory_batches
       WHERE expiration_date IS NOT NULL
       AND expiration_date BETWEEN date('now') AND date('now', '+${daysAhead} days')
       AND total_quantity > 0
       GROUP BY date(expiration_date)
       ORDER BY exp_date`
    );

    return timeline;
  }

  /**
   * Calculate stockout frequency
   */
  async getStockoutFrequency(startDate, endDate) {
    const stockouts = await this.db.all(
      `SELECT p.id, p.name,
              COUNT(*) as stockout_count,
              COUNT(*) * 1.0 / JULIANDAY(?) - JULIANDAY(?) as stockouts_per_day
       FROM products p
       INNER JOIN inventory_transactions it ON p.id = it.product_id
       WHERE it.notes LIKE '%out of stock%'
       AND date(it.created_at) BETWEEN date(?) AND date(?)
       GROUP BY p.id
       ORDER BY stockout_count DESC`,
      [endDate, startDate, startDate, endDate]
    );

    return stockouts;
  }

  /**
   * Get top products by various metrics
   */
  async getTopProducts(metric = 'value', limit = 10) {
    const metrics = {
      value: 'SUM(ib.total_quantity * p.cost_per_case / p.items_per_case) as metric_value',
      quantity: 'SUM(ib.total_quantity) as metric_value',
      batches: 'COUNT(ib.id) as metric_value'
    };

    const metricSql = metrics[metric] || metrics.value;

    const products = await this.db.all(
      `SELECT p.id, p.name, p.barcode,
              ${metricSql}
       FROM products p
       LEFT JOIN inventory_batches ib ON p.id = ib.product_id
       WHERE ib.total_quantity > 0
       GROUP BY p.id
       ORDER BY metric_value DESC
       LIMIT ?`,
      [limit]
    );

    return products;
  }

  /**
   * Get comparative analytics (period over period)
   */
  async getComparativeAnalytics(currentStart, currentEnd, previousStart, previousEnd) {
    const current = await this.getValueTrends(currentStart, currentEnd);
    const previous = await this.getValueTrends(previousStart, previousEnd);

    const currentTotal = current.reduce((sum, t) => sum + t.net_change, 0);
    const previousTotal = previous.reduce((sum, t) => sum + t.net_change, 0);
    const change = currentTotal - previousTotal;
    const changePercent = previousTotal !== 0 ? (change / previousTotal) * 100 : 0;

    return {
      current: {
        total: currentTotal,
        trends: current
      },
      previous: {
        total: previousTotal,
        trends: previous
      },
      change: {
        absolute: change,
        percent: parseFloat(changePercent.toFixed(2)),
        direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
      }
    };
  }
}

module.exports = AnalyticsService;