/**
 * Inventory Optimizer
 * Provides optimization recommendations for inventory management
 */

class InventoryOptimizer {
  constructor(db) {
    this.db = db;
  }

  /**
   * Analyze ABC classification for inventory
   * @returns {Promise<Object>} ABC analysis results
   */
  async abcAnalysis() {
    const query = `
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.stock_quantity,
        p.cost,
        (p.stock_quantity * p.cost) as inventory_value,
        COUNT(it.id) as transaction_count
      FROM products p
      LEFT JOIN inventory_transactions it ON p.id = it.product_id
        AND it.created_at >= datetime('now', '-90 days')
      WHERE p.active = 1
      GROUP BY p.id
      ORDER BY inventory_value DESC
    `;

    const products = await this.db.all(query);
    
    // Calculate total inventory value
    const totalValue = products.reduce((sum, p) => sum + p.inventory_value, 0);
    
    let cumulativeValue = 0;
    const classified = products.map(product => {
      cumulativeValue += product.inventory_value;
      const cumulativePercent = (cumulativeValue / totalValue) * 100;
      
      let classification;
      if (cumulativePercent <= 80) {
        classification = 'A'; // Top 80% value
      } else if (cumulativePercent <= 95) {
        classification = 'B'; // Next 15% value
      } else {
        classification = 'C'; // Bottom 5% value
      }
      
      return {
        ...product,
        classification,
        valuePercent: Math.round((product.inventory_value / totalValue) * 100 * 100) / 100
      };
    });

    // Group by classification
    const summary = {
      A: classified.filter(p => p.classification === 'A'),
      B: classified.filter(p => p.classification === 'B'),
      C: classified.filter(p => p.classification === 'C')
    };

    return {
      totalValue,
      totalProducts: products.length,
      classifications: {
        A: {
          count: summary.A.length,
          value: summary.A.reduce((sum, p) => sum + p.inventory_value, 0),
          products: summary.A.slice(0, 20) // Top 20
        },
        B: {
          count: summary.B.length,
          value: summary.B.reduce((sum, p) => sum + p.inventory_value, 0),
          products: summary.B.slice(0, 20)
        },
        C: {
          count: summary.C.length,
          value: summary.C.reduce((sum, p) => sum + p.inventory_value, 0),
          products: summary.C.slice(0, 20)
        }
      },
      recommendations: this.generateABCRecommendations(summary)
    };
  }

  /**
   * Identify slow-moving inventory
   * @param {number} days - Period to analyze
   * @returns {Promise<Array>} Slow-moving items
   */
  async identifySlowMoving(days = 90) {
    const query = `
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.stock_quantity,
        p.cost,
        (p.stock_quantity * p.cost) as inventory_value,
        COALESCE(SUM(ABS(it.quantity_change)), 0) as total_movement,
        COALESCE(COUNT(it.id), 0) as transaction_count,
        MAX(it.created_at) as last_movement
      FROM products p
      LEFT JOIN inventory_transactions it ON p.id = it.product_id
        AND it.created_at >= datetime('now', '-' || ? || ' days')
        AND it.quantity_change < 0
      WHERE p.active = 1 AND p.stock_quantity > 0
      GROUP BY p.id
      HAVING total_movement < 5
      ORDER BY inventory_value DESC
    `;

    const slowMoving = await this.db.all(query, [days]);

    return slowMoving.map(item => ({
      ...item,
      daysWithoutMovement: this.calculateDaysSince(item.last_movement),
      recommendation: this.getSlowMovingRecommendation(item)
    }));
  }

  /**
   * Identify excess inventory
   * @returns {Promise<Array>} Excess inventory items
   */
  async identifyExcessInventory() {
    const query = `
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.stock_quantity,
        p.min_stock_level,
        p.max_stock_level,
        p.cost,
        (p.stock_quantity * p.cost) as inventory_value,
        AVG(ABS(it.quantity_change)) as avg_daily_usage
      FROM products p
      LEFT JOIN inventory_transactions it ON p.id = it.product_id
        AND it.created_at >= datetime('now', '-30 days')
        AND it.quantity_change < 0
      WHERE p.active = 1
      GROUP BY p.id
      HAVING p.stock_quantity > p.max_stock_level * 1.5
        OR (avg_daily_usage > 0 AND p.stock_quantity / avg_daily_usage > 90)
      ORDER BY inventory_value DESC
    `;

    const excess = await this.db.all(query);

    return excess.map(item => {
      const daysOfStock = item.avg_daily_usage > 0 
        ? Math.floor(item.stock_quantity / item.avg_daily_usage)
        : 999;

      return {
        ...item,
        daysOfStock,
        excessQuantity: Math.max(
          0,
          item.stock_quantity - (item.max_stock_level || item.stock_quantity)
        ),
        tiedUpCapital: item.inventory_value,
        recommendation: 'Consider markdown or promotion to reduce excess'
      };
    });
  }

  /**
   * Calculate carrying costs
   * @returns {Promise<Object>} Carrying cost analysis
   */
  async calculateCarryingCosts() {
    const query = `
      SELECT 
        SUM(stock_quantity * cost) as total_inventory_value,
        COUNT(*) as product_count,
        AVG(stock_quantity * cost) as avg_product_value
      FROM products
      WHERE active = 1
    `;

    const result = await this.db.get(query);

    // Annual carrying cost rate (typically 20-30%)
    const carryingRate = 0.25;
    const annualCarryingCost = result.total_inventory_value * carryingRate;
    const monthlyCarryingCost = annualCarryingCost / 12;
    const dailyCarryingCost = annualCarryingCost / 365;

    return {
      totalInventoryValue: Math.round(result.total_inventory_value * 100) / 100,
      productCount: result.product_count,
      avgProductValue: Math.round(result.avg_product_value * 100) / 100,
      carryingCostRate: carryingRate,
      annualCarryingCost: Math.round(annualCarryingCost * 100) / 100,
      monthlyCarryingCost: Math.round(monthlyCarryingCost * 100) / 100,
      dailyCarryingCost: Math.round(dailyCarryingCost * 100) / 100,
      recommendations: [
        'Reduce slow-moving inventory to lower carrying costs',
        'Implement just-in-time ordering for C-class items',
        'Negotiate better payment terms with suppliers'
      ]
    };
  }

  /**
   * Generate optimization recommendations
   * @returns {Promise<Object>} Comprehensive recommendations
   */
  async generateOptimizationReport() {
    const [abc, slowMoving, excess, carryingCosts] = await Promise.all([
      this.abcAnalysis(),
      this.identifySlowMoving(),
      this.identifyExcessInventory(),
      this.calculateCarryingCosts()
    ]);

    // Calculate potential savings
    const excessValue = excess.reduce((sum, item) => sum + item.inventory_value, 0);
    const potentialSavings = excessValue * 0.25; // 25% carrying cost

    return {
      summary: {
        totalInventoryValue: carryingCosts.totalInventoryValue,
        slowMovingItems: slowMoving.length,
        excessInventoryValue: Math.round(excessValue * 100) / 100,
        potentialAnnualSavings: Math.round(potentialSavings * 100) / 100
      },
      abc,
      slowMoving: slowMoving.slice(0, 20),
      excess: excess.slice(0, 20),
      carryingCosts,
      topRecommendations: this.generateTopRecommendations(
        abc,
        slowMoving,
        excess
      )
    };
  }

  generateABCRecommendations(summary) {
    return [
      `Focus on ${summary.A.length} A-class items (tight control, frequent monitoring)`,
      `Moderate control for ${summary.B.length} B-class items`,
      `Simple reorder system for ${summary.C.length} C-class items`
    ];
  }

  getSlowMovingRecommendation(item) {
    if (item.inventory_value > 1000) {
      return 'High-value slow mover - consider promotion or discount';
    } else if (item.transaction_count === 0) {
      return 'No movement - consider discontinuation';
    }
    return 'Monitor and reduce reorder quantity';
  }

  generateTopRecommendations(abc, slowMoving, excess) {
    const recommendations = [];

    if (slowMoving.length > 0) {
      recommendations.push({
        priority: 'high',
        action: 'Address slow-moving inventory',
        impact: `${slowMoving.length} items with minimal movement`,
        savings: 'Reduce carrying costs by 15-25%'
      });
    }

    if (excess.length > 0) {
      const excessValue = excess.reduce((sum, item) => sum + item.inventory_value, 0);
      recommendations.push({
        priority: 'high',
        action: 'Reduce excess inventory',
        impact: `$${Math.round(excessValue)} in excess stock`,
        savings: `Free up $${Math.round(excessValue * 0.75)} in capital`
      });
    }

    if (abc.classifications.A.count > 0) {
      recommendations.push({
        priority: 'medium',
        action: 'Optimize A-class item management',
        impact: `${abc.classifications.A.count} high-value items`,
        savings: 'Reduce stockouts and improve service level'
      });
    }

    return recommendations;
  }

  calculateDaysSince(dateString) {
    if (!dateString) return 999;
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

module.exports = InventoryOptimizer;
