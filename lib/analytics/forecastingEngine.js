/**
 * Forecasting Engine
 * Implements various time series forecasting algorithms
 * for demand prediction and inventory optimization
 */

class ForecastingEngine {
  /**
   * Simple Moving Average
   * @param {Array<number>} data - Historical data points
   * @param {number} window - Window size for averaging
   * @returns {number} Forecasted value
   */
  static simpleMovingAverage(data, window = 3) {
    if (data.length < window) return data[data.length - 1] || 0;
    
    const recentData = data.slice(-window);
    return recentData.reduce((sum, val) => sum + val, 0) / window;
  }

  /**
   * Weighted Moving Average
   * More recent data has higher weight
   * @param {Array<number>} data - Historical data points
   * @param {number} window - Window size
   * @returns {number} Forecasted value
   */
  static weightedMovingAverage(data, window = 3) {
    if (data.length < window) return data[data.length - 1] || 0;
    
    const recentData = data.slice(-window);
    const weights = Array.from({ length: window }, (_, i) => i + 1);
    const weightSum = weights.reduce((sum, w) => sum + w, 0);
    
    return recentData.reduce((sum, val, idx) => {
      return sum + (val * weights[idx]);
    }, 0) / weightSum;
  }

  /**
   * Exponential Smoothing
   * @param {Array<number>} data - Historical data points
   * @param {number} alpha - Smoothing factor (0-1)
   * @returns {number} Forecasted value
   */
  static exponentialSmoothing(data, alpha = 0.3) {
    if (data.length === 0) return 0;
    if (data.length === 1) return data[0];
    
    let smoothed = data[0];
    for (let i = 1; i < data.length; i++) {
      smoothed = alpha * data[i] + (1 - alpha) * smoothed;
    }
    
    return smoothed;
  }

  /**
   * Linear Regression Forecast
   * Predicts future value based on linear trend
   * @param {Array<number>} data - Historical data points
   * @param {number} periodsAhead - Number of periods to forecast
   * @returns {Object} Forecast with trend info
   */
  static linearRegressionForecast(data, periodsAhead = 1) {
    if (data.length < 2) {
      return { forecast: data[0] || 0, trend: 'insufficient_data' };
    }

    const n = data.length;
    const x = Array.from({ length: n }, (_, i) => i + 1);
    const y = data;

    // Calculate means
    const xMean = x.reduce((sum, val) => sum + val, 0) / n;
    const yMean = y.reduce((sum, val) => sum + val, 0) / n;

    // Calculate slope (b) and intercept (a)
    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (x[i] - xMean) * (y[i] - yMean);
      denominator += Math.pow(x[i] - xMean, 2);
    }

    const slope = denominator !== 0 ? numerator / denominator : 0;
    const intercept = yMean - slope * xMean;

    // Forecast
    const forecastPoint = n + periodsAhead;
    const forecast = slope * forecastPoint + intercept;

    // Determine trend
    let trend = 'stable';
    if (Math.abs(slope) > 0.1) {
      trend = slope > 0 ? 'increasing' : 'decreasing';
    }

    return {
      forecast: Math.max(0, forecast),
      slope,
      intercept,
      trend,
      confidence: this.calculateConfidence(data, slope, intercept)
    };
  }

  /**
   * Calculate R-squared confidence metric
   * @param {Array<number>} data
   * @param {number} slope
   * @param {number} intercept
   * @returns {number} Confidence score (0-1)
   */
  static calculateConfidence(data, slope, intercept) {
    if (data.length < 3) return 0.5;

    const yMean = data.reduce((sum, val) => sum + val, 0) / data.length;
    let ssRes = 0;
    let ssTot = 0;

    data.forEach((y, i) => {
      const x = i + 1;
      const predicted = slope * x + intercept;
      ssRes += Math.pow(y - predicted, 2);
      ssTot += Math.pow(y - yMean, 2);
    });

    const rSquared = ssTot !== 0 ? 1 - (ssRes / ssTot) : 0;
    return Math.max(0, Math.min(1, rSquared));
  }

  /**
   * Detect Seasonality
   * @param {Array<number>} data - Historical data
   * @param {number} period - Expected seasonal period (e.g., 7 for weekly)
   * @returns {Object} Seasonality analysis
   */
  static detectSeasonality(data, period = 7) {
    if (data.length < period * 2) {
      return { hasSeason: false, strength: 0 };
    }

    // Calculate average for each position in the cycle
    const seasonalAverages = Array(period).fill(0);
    const counts = Array(period).fill(0);

    data.forEach((val, idx) => {
      const position = idx % period;
      seasonalAverages[position] += val;
      counts[position]++;
    });

    seasonalAverages.forEach((sum, idx) => {
      seasonalAverages[idx] = counts[idx] > 0 ? sum / counts[idx] : 0;
    });

    // Calculate seasonal strength
    const overallMean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = seasonalAverages.reduce((sum, avg) => {
      return sum + Math.pow(avg - overallMean, 2);
    }, 0) / period;

    const strength = overallMean > 0 ? Math.sqrt(variance) / overallMean : 0;

    return {
      hasSeason: strength > 0.2,
      strength,
      pattern: seasonalAverages,
      period
    };
  }

  /**
   * Adaptive Forecast
   * Automatically selects best forecasting method
   * @param {Array<number>} data - Historical data
   * @param {number} periodsAhead - Forecast horizon
   * @returns {Object} Best forecast with method used
   */
  static adaptiveForecast(data, periodsAhead = 1) {
    if (data.length === 0) {
      return { forecast: 0, method: 'none', confidence: 0 };
    }

    if (data.length < 3) {
      return {
        forecast: data[data.length - 1],
        method: 'last_value',
        confidence: 0.5
      };
    }

    // Try multiple methods
    const methods = [
      {
        name: 'linear_regression',
        result: this.linearRegressionForecast(data, periodsAhead)
      },
      {
        name: 'exponential_smoothing',
        result: { forecast: this.exponentialSmoothing(data), confidence: 0.7 }
      },
      {
        name: 'weighted_moving_average',
        result: { forecast: this.weightedMovingAverage(data), confidence: 0.6 }
      }
    ];

    // Select method with highest confidence
    const bestMethod = methods.reduce((best, current) => {
      return current.result.confidence > best.result.confidence ? current : best;
    });

    return {
      forecast: Math.max(0, bestMethod.result.forecast),
      method: bestMethod.name,
      confidence: bestMethod.result.confidence,
      trend: bestMethod.result.trend || 'unknown'
    };
  }

  /**
   * Calculate Confidence Interval
   * @param {Array<number>} data - Historical data
   * @param {number} forecast - Point forecast
   * @param {number} confidenceLevel - Confidence level (e.g., 0.95)
   * @returns {Object} Upper and lower bounds
   */
  static confidenceInterval(data, forecast, confidenceLevel = 0.95) {
    if (data.length < 2) {
      return { lower: forecast * 0.5, upper: forecast * 1.5 };
    }

    // Calculate standard deviation of errors
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => {
      return sum + Math.pow(val - mean, 2);
    }, 0) / (data.length - 1);
    const stdDev = Math.sqrt(variance);

    // Z-score for confidence level (approximation)
    const zScore = confidenceLevel >= 0.95 ? 1.96 : 1.645;
    const margin = zScore * stdDev;

    return {
      lower: Math.max(0, forecast - margin),
      upper: forecast + margin,
      margin
    };
  }
}

module.exports = ForecastingEngine;
