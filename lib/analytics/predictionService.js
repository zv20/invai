/**
 * Prediction Service
 * Provides demand forecasting and inventory optimization predictions
 */

const ForecastingEngine = require('./forecastingEngine');

class PredictionService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Get historical usage data for a product
   * @param {number} productId
   * @param {number} days - Number of days to look back
   * @returns {Promise<Array>} Daily usage data
   */
  async getHistoricalUsage(productId, days = 90) {
    const query = `
      SELECT 
        DATE(created_at) as date,
        SUM(ABS(quantity_change)) as usage
      FROM inventory_transactions
      WHERE product_id = ? 
        AND quantity_change < 0
        AND created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    const results = await this.db.all(query, [productId, days]);
    return results.map(r => r.usage);
  }

  /**
   * Predict demand for a product
   * @param {number} productId
   * @param {Object} options - Forecast options
   * @returns {Promise<Object>} Demand forecast
   */
  async predictDemand(productId, options = {}) {
    const {
      horizon = 30, // days to forecast
      lookback = 90, // days of historical data
      confidenceLevel = 0.95
    } = options;

    // Get historical usage
    const historicalData = await this.getHistoricalUsage(productId, lookback);

    if (historicalData.length === 0) {
      return {
        productId,
        forecast: 0,
        method: 'no_history',
        confidence: 0,
        recommendations: ['Insufficient historical data for prediction']
      };
    }

    // Get adaptive forecast
    const forecast = ForecastingEngine.adaptiveForecast(historicalData, horizon);
    
    // Calculate daily average forecast
    const dailyForecast = forecast.forecast / horizon;

    // Calculate confidence interval
    const interval = ForecastingEngine.confidenceInterval(
      historicalData,
      forecast.forecast,
      confidenceLevel
    );

    // Detect seasonality
    const seasonality = ForecastingEngine.detectSeasonality(historicalData, 7);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      forecast,
      seasonality,
      historicalData
    );

    return {
      productId,
      forecast: Math.round(forecast.forecast),
      dailyAverage: Math.round(dailyForecast * 10) / 10,
      confidence: Math.round(forecast.confidence * 100),
      method: forecast.method,
      trend: forecast.trend,
      confidenceInterval: {
        lower: Math.round(interval.lower),
        upper: Math.round(interval.upper)
      },
      seasonality: {
        detected: seasonality.hasSeason,
        strength: Math.round(seasonality.strength * 100),
        period: seasonality.period
      },
      historicalAverage: Math.round(
        historicalData.reduce((sum, val) => sum + val, 0) / historicalData.length
      ),
      recommendations
    };
  }

  /**
   * Calculate optimal reorder point
   * @param {number} productId
   * @returns {Promise<Object>} Reorder recommendations
   */
  async calculateReorderPoint(productId) {
    // Get product details
    const product = await this.db.get(
      'SELECT * FROM products WHERE id = ?',
      [productId]
    );

    if (!product) {
      throw new Error('Product not found');
    }

    // Get demand forecast
    const demandForecast = await this.predictDemand(productId, { horizon: 30 });

    // Lead time (days) - default to 7 if not set
    const leadTime = product.lead_time_days || 7;

    // Calculate average daily demand
    const avgDailyDemand = demandForecast.dailyAverage;

    // Calculate lead time demand
    const leadTimeDemand = avgDailyDemand * leadTime;

    // Safety stock (covers variability)
    // Using service level of 95% (z-score = 1.65)
    const demandVariability = demandForecast.confidenceInterval.upper - demandForecast.forecast;
    const safetyStock = Math.ceil(1.65 * (demandVariability / 30) * Math.sqrt(leadTime));

    // Reorder point
    const reorderPoint = Math.ceil(leadTimeDemand + safetyStock);

    // Economic Order Quantity (EOQ)
    const orderingCost = 25; // Default ordering cost
    const holdingCostRate = 0.25; // 25% annual holding cost
    const unitCost = product.cost || 1;
    const annualDemand = avgDailyDemand * 365;
    
    const eoq = Math.ceil(
      Math.sqrt((2 * annualDemand * orderingCost) / (holdingCostRate * unitCost))
    );

    // Calculate stockout risk
    const currentStock = product.stock_quantity || 0;
    const daysUntilStockout = avgDailyDemand > 0 
      ? Math.floor(currentStock / avgDailyDemand)
      : 999;

    let stockoutRisk = 'low';
    if (currentStock <= reorderPoint) {
      stockoutRisk = 'high';
    } else if (currentStock <= reorderPoint * 1.5) {
      stockoutRisk = 'medium';
    }

    return {
      productId,
      productName: product.name,
      currentStock,
      reorderPoint,
      safetyStock,
      optimalOrderQuantity: eoq,
      leadTime,
      avgDailyDemand: Math.round(avgDailyDemand * 10) / 10,
      leadTimeDemand: Math.ceil(leadTimeDemand),
      daysUntilStockout,
      stockoutRisk,
      shouldReorder: currentStock <= reorderPoint,
      urgency: daysUntilStockout <= leadTime ? 'urgent' : 'normal'
    };
  }

  /**
   * Get reorder recommendations for all products
   * @returns {Promise<Array>} List of products needing reorder
   */
  async getReorderRecommendations() {
    const products = await this.db.all(
      'SELECT id FROM products WHERE active = 1'
    );

    const recommendations = [];
    
    for (const product of products) {
      try {
        const reorderInfo = await this.calculateReorderPoint(product.id);
        if (reorderInfo.shouldReorder) {
          recommendations.push(reorderInfo);
        }
      } catch (error) {
        console.error(`Error calculating reorder for product ${product.id}:`, error.message);
      }
    }

    // Sort by urgency and days until stockout
    recommendations.sort((a, b) => {
      if (a.urgency !== b.urgency) {
        return a.urgency === 'urgent' ? -1 : 1;
      }
      return a.daysUntilStockout - b.daysUntilStockout;
    });

    return recommendations;
  }

  /**
   * Analyze demand patterns
   * @param {number} productId
   * @returns {Promise<Object>} Pattern analysis
   */
  async analyzeDemandPatterns(productId) {
    const historicalData = await this.getHistoricalUsage(productId, 90);

    if (historicalData.length < 7) {
      return {
        pattern: 'insufficient_data',
        description: 'Not enough data for pattern analysis'
      };
    }

    // Detect seasonality
    const weeklyPattern = ForecastingEngine.detectSeasonality(historicalData, 7);
    const monthlyPattern = ForecastingEngine.detectSeasonality(historicalData, 30);

    // Calculate volatility
    const mean = historicalData.reduce((sum, val) => sum + val, 0) / historicalData.length;
    const variance = historicalData.reduce((sum, val) => {
      return sum + Math.pow(val - mean, 2);
    }, 0) / historicalData.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = mean > 0 ? stdDev / mean : 0;

    let volatility = 'low';
    if (coefficientOfVariation > 0.5) volatility = 'high';
    else if (coefficientOfVariation > 0.25) volatility = 'medium';

    // Determine pattern type
    let patternType = 'stable';
    if (weeklyPattern.hasSeason) patternType = 'weekly_seasonal';
    else if (monthlyPattern.hasSeason) patternType = 'monthly_seasonal';
    else if (volatility === 'high') patternType = 'erratic';

    return {
      productId,
      pattern: patternType,
      volatility,
      coefficientOfVariation: Math.round(coefficientOfVariation * 100) / 100,
      weeklySeasonality: weeklyPattern.hasSeason,
      monthlySeasonality: monthlyPattern.hasSeason,
      averageDemand: Math.round(mean * 10) / 10,
      description: this.getPatternDescription(patternType, volatility)
    };
  }

  /**
   * Generate actionable recommendations
   */
  generateRecommendations(forecast, seasonality, historicalData) {
    const recommendations = [];

    if (forecast.confidence < 50) {
      recommendations.push('Low prediction confidence - consider collecting more data');
    }

    if (forecast.trend === 'increasing') {
      recommendations.push('Demand is trending upward - consider increasing stock levels');
    } else if (forecast.trend === 'decreasing') {
      recommendations.push('Demand is trending downward - monitor for overstock');
    }

    if (seasonality.hasSeason) {
      recommendations.push(`Seasonal pattern detected (${seasonality.period}-day cycle) - plan accordingly`);
    }

    const recentAvg = historicalData.slice(-7).reduce((sum, val) => sum + val, 0) / 7;
    const overallAvg = historicalData.reduce((sum, val) => sum + val, 0) / historicalData.length;
    
    if (recentAvg > overallAvg * 1.5) {
      recommendations.push('Recent demand spike detected - verify stock adequacy');
    }

    return recommendations;
  }

  getPatternDescription(pattern, volatility) {
    const descriptions = {
      stable: 'Consistent demand with minimal fluctuation',
      weekly_seasonal: 'Regular weekly demand patterns',
      monthly_seasonal: 'Regular monthly demand patterns',
      erratic: 'Unpredictable demand with high variability'
    };

    return descriptions[pattern] || 'Unknown pattern';
  }
}

module.exports = PredictionService;
