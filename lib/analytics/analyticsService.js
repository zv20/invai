/**
 * Analytics Service - Sprint 5 Phase 1
 * 
 * Core analytics calculations and data aggregation
 */

class AnalyticsService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Get inventory turnover analysis
   */
  async getInventoryTurnover(dateRange = 30) {
    // Calculate turnover = COGS / Average Inventory Value
    const sql = `
      SELECT 
        p.id,
        p.name,
        p.category_id,
        c.name as category_name,
        COALESCE(SUM(ib.total_quantity), 0) as current_stock,
        p.cost_per_case,
        p.items_per_case,
        COALESCE(usage.total_used, 0) as units_used,
        COALESCE(usage.total_cost, 0) as cogs
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN inventory_batches ib ON p.id = ib.product_id AND ib.status = 'active'
      LEFT JOIN (
        SELECT 
          product_id,
          SUM(quantity_change) as total_used,
          SUM(quantity_change * (cost_per_case / items_per_case)) as total_cost
        FROM activity_logs
        WHERE action IN ('batch_depleted', 'quantity_adjusted')
          AND created_at >= datetime('now', '-' || ? || ' days')
        GROUP BY product_id
      ) usage ON p.id = usage.product_id
      GROUP BY p.id
      HAVING current_stock > 0 OR units_used > 0
    `;

    const data = await this.db.all(sql, [dateRange]);

    return data.map(row => {
      const avgInventoryValue = (row.current_stock * row.cost_per_case) / 2; // Simplified average
      const turnoverRatio = avgInventoryValue > 0 ? row.cogs / avgInventoryValue : 0;
      const daysOnHand = turnoverRatio > 0 ? dateRange / turnoverRatio : 0;

      return {
        productId: row.id,
        productName: row.name,
        category: row.category_name,
        currentStock: row.current_stock,
        unitsUsed: row.units_used,
        cogs: row.cogs,
        turnoverRatio: parseFloat(turnoverRatio.toFixed(2)),
        daysOnHand: Math.round(daysOnHand),
        performance: this.classifyPerformance(turnoverRatio)
      };
    });
  }

  /**
   * Get stock level trends over time
   */
  async getStockLevelTrends(days = 30) {
    const sql = `
      SELECT 
        DATE(al.created_at) as date,
        p.id as product_id,
        p.name as product_name,
        SUM(CASE WHEN al.action LIKE '%added%' THEN al.quantity_change ELSE 0 END) as additions,
        SUM(CASE WHEN al.action LIKE '%depleted%' OR al.action LIKE '%adjusted%' THEN ABS(al.quantity_change) ELSE 0 END) as depletions
      FROM activity_logs al
      LEFT JOIN products p ON al.product_id = p.id
      WHERE al.created_at >= datetime('now', '-' || ? || ' days')
        AND al.product_id IS NOT NULL
      GROUP BY DATE(al.created_at), p.id
      ORDER BY date DESC, p.name
    `;

    const data = await this.db.all(sql, [days]);

    // Aggregate by date
    const trendsByDate = {};
    data.forEach(row => {
      if (!trendsByDate[row.date]) {
        trendsByDate[row.date] = {
          date: row.date,
          totalAdditions: 0,
          totalDepletions: 0,
          netChange: 0
        };
      }
      trendsByDate[row.date].totalAdditions += row.additions;
      trendsByDate[row.date].totalDepletions += row.depletions;
      trendsByDate[row.date].netChange += (row.additions - row.depletions);
    });

    return Object.values(trendsByDate).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
  }

  /**
   * Get inventory value trends
   */
  async getValueTrends(days = 30) {
    // Simplified - in production, you'd track historical snapshots
    const currentValue = await this.db.get(`
      SELECT 
        SUM(ib.total_quantity * (p.cost_per_case / p.items_per_case)) as total_value
      FROM inventory_batches ib
      LEFT JOIN products p ON ib.product_id = p.id
      WHERE ib.status = 'active'
    `);

    return {
      current: currentValue?.total_value || 0,
      trend: 'stable', // Would calculate from historical data
      changePercent: 0 // Would calculate from historical data
    };
  }

  /**
   * Get expiration timeline
   */
  async getExpirationTimeline() {
    const sql = `
      SELECT 
        DATE(ib.expiry_date) as expiry_date,
        COUNT(DISTINCT ib.id) as batch_count,
        SUM(ib.total_quantity) as total_items,
        SUM(ib.total_quantity * (p.cost_per_case / p.items_per_case)) as total_value,
        CASE 
          WHEN julianday(ib.expiry_date) - julianday('now') <= 7 THEN 'critical'
          WHEN julianday(ib.expiry_date) - julianday('now') <= 14 THEN 'warning'
          ELSE 'normal'
        END as urgency
      FROM inventory_batches ib
      LEFT JOIN products p ON ib.product_id = p.id
      WHERE ib.status = 'active'
        AND ib.expiry_date >= date('now')
        AND ib.expiry_date <= date('now', '+90 days')
      GROUP BY DATE(ib.expiry_date)
      ORDER BY expiry_date
    `;

    return await this.db.all(sql);
  }

  /**
   * Get cost analytics
   */
  async getCostAnalytics() {
    // Cost by category
    const byCategory = await this.db.all(`
      SELECT 
        c.name as category,
        COUNT(DISTINCT p.id) as product_count,
        SUM(ib.total_quantity) as total_items,
        SUM(ib.total_quantity * (p.cost_per_case / p.items_per_case)) as total_value,
        AVG(p.cost_per_case / p.items_per_case) as avg_cost_per_item
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      LEFT JOIN inventory_batches ib ON p.id = ib.product_id AND ib.status = 'active'
      GROUP BY c.id
      HAVING total_value > 0
      ORDER BY total_value DESC
    `);

    // Price change tracking
    const priceChanges = await this.db.all(`
      SELECT 
        p.id,
        p.name,
        p.cost_per_case as current_cost,
        ph.old_cost,
        ph.new_cost,
        ph.changed_at,
        ((ph.new_cost - ph.old_cost) / ph.old_cost * 100) as percent_change
      FROM products p
      LEFT JOIN (
        SELECT 
          product_id,
          old_value as old_cost,
          new_value as new_cost,
          created_at as changed_at
        FROM activity_logs
        WHERE action = 'product_updated'
          AND field_changed = 'cost_per_case'
        ORDER BY created_at DESC
      ) ph ON p.id = ph.product_id
      WHERE ph.changed_at IS NOT NULL
      ORDER BY ph.changed_at DESC
      LIMIT 20
    `);

    return { byCategory, priceChanges };
  }

  /**
   * Get usage patterns
   */
  async getUsagePatterns(days = 30) {
    const sql = `
      SELECT 
        CASE CAST(strftime('%w', al.created_at) AS INTEGER)
          WHEN 0 THEN 'Sunday'
          WHEN 1 THEN 'Monday'
          WHEN 2 THEN 'Tuesday'
          WHEN 3 THEN 'Wednesday'
          WHEN 4 THEN 'Thursday'
          WHEN 5 THEN 'Friday'
          WHEN 6 THEN 'Saturday'
        END as day_of_week,
        CAST(strftime('%w', al.created_at) AS INTEGER) as day_num,
        COUNT(*) as transaction_count,
        SUM(ABS(al.quantity_change)) as total_quantity
      FROM activity_logs al
      WHERE al.created_at >= datetime('now', '-' || ? || ' days')
        AND al.action IN ('batch_depleted', 'quantity_adjusted')
      GROUP BY day_of_week, day_num
      ORDER BY day_num
    `;

    return await this.db.all(sql, [days]);
  }

  /**
   * Get fast vs slow moving products
   */
  async getProductVelocity(days = 30) {
    const sql = `
      SELECT 
        p.id,
        p.name,
        p.category_id,
        c.name as category,
        COALESCE(SUM(ABS(al.quantity_change)), 0) as units_moved,
        COALESCE(SUM(ib.total_quantity), 0) as current_stock,
        CASE 
          WHEN SUM(ABS(al.quantity_change)) > 100 THEN 'fast'
          WHEN SUM(ABS(al.quantity_change)) > 20 THEN 'medium'
          ELSE 'slow'
        END as velocity
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN activity_logs al ON p.id = al.product_id 
        AND al.created_at >= datetime('now', '-' || ? || ' days')
        AND al.action IN ('batch_depleted', 'quantity_adjusted')
      LEFT JOIN inventory_batches ib ON p.id = ib.product_id AND ib.status = 'active'
      GROUP BY p.id
      ORDER BY units_moved DESC
    `;

    return await this.db.all(sql, [days]);
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics() {
    // Stockout frequency (products with 0 stock)
    const stockouts = await this.db.get(`
      SELECT COUNT(*) as stockout_count
      FROM products p
      LEFT JOIN inventory_batches ib ON p.id = ib.product_id AND ib.status = 'active'
      GROUP BY p.id
      HAVING COALESCE(SUM(ib.total_quantity), 0) = 0
    `);

    // Overall inventory value
    const totalValue = await this.db.get(`
      SELECT 
        SUM(ib.total_quantity * (p.cost_per_case / p.items_per_case)) as value,
        SUM(ib.total_quantity) as total_items,
        COUNT(DISTINCT p.id) as product_count
      FROM inventory_batches ib
      LEFT JOIN products p ON ib.product_id = p.id
      WHERE ib.status = 'active'
    `);

    // Low stock items
    const lowStock = await this.db.get(`
      SELECT COUNT(*) as low_stock_count
      FROM (
        SELECT 
          p.id,
          COALESCE(SUM(ib.total_quantity), 0) as current,
          p.reorder_point
        FROM products p
        LEFT JOIN inventory_batches ib ON p.id = ib.product_id AND ib.status = 'active'
        GROUP BY p.id
        HAVING current <= reorder_point AND current > 0
      )
    `);

    return {
      stockoutCount: stockouts?.stockout_count || 0,
      totalValue: totalValue?.value || 0,
      totalItems: totalValue?.total_items || 0,
      productCount: totalValue?.product_count || 0,
      lowStockCount: lowStock?.low_stock_count || 0,
      fillRate: this.calculateFillRate(stockouts?.stockout_count || 0, totalValue?.product_count || 1)
    };
  }

  /**
   * Classify performance based on turnover ratio
   */
  classifyPerformance(ratio) {
    if (ratio >= 12) return 'excellent';  // >12x per year
    if (ratio >= 6) return 'good';         // 6-12x per year
    if (ratio >= 2) return 'fair';         // 2-6x per year
    return 'poor';                         // <2x per year
  }

  /**
   * Calculate fill rate percentage
   */
  calculateFillRate(stockouts, totalProducts) {
    const filled = totalProducts - stockouts;
    return ((filled / totalProducts) * 100).toFixed(1);
  }
}

module.exports = AnalyticsService;