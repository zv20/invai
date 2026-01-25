/**
 * Data Aggregator - Sprint 5 Phase 1
 * 
 * Utility for aggregating and transforming data for analytics
 */

class DataAggregator {
  /**
   * Aggregate data by time period
   */
  static aggregateByPeriod(data, periodKey, valueKey, aggregateFunc = 'sum') {
    const grouped = {};
    
    data.forEach(item => {
      const period = item[periodKey];
      if (!grouped[period]) {
        grouped[period] = [];
      }
      grouped[period].push(item[valueKey]);
    });

    const result = Object.keys(grouped).map(period => {
      const values = grouped[period];
      let aggregatedValue;

      switch (aggregateFunc) {
        case 'sum':
          aggregatedValue = values.reduce((a, b) => a + b, 0);
          break;
        case 'avg':
          aggregatedValue = values.reduce((a, b) => a + b, 0) / values.length;
          break;
        case 'min':
          aggregatedValue = Math.min(...values);
          break;
        case 'max':
          aggregatedValue = Math.max(...values);
          break;
        case 'count':
          aggregatedValue = values.length;
          break;
        default:
          aggregatedValue = values.reduce((a, b) => a + b, 0);
      }

      return {
        period,
        value: aggregatedValue,
        count: values.length
      };
    });

    return result.sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * Calculate moving average
   */
  static calculateMovingAverage(data, valueKey, window = 7) {
    if (data.length < window) return data;

    return data.map((item, index) => {
      if (index < window - 1) {
        return { ...item, moving_avg: null };
      }

      const slice = data.slice(index - window + 1, index + 1);
      const avg = slice.reduce((sum, d) => sum + d[valueKey], 0) / window;

      return {
        ...item,
        moving_avg: parseFloat(avg.toFixed(2))
      };
    });
  }

  /**
   * Calculate percentage distribution
   */
  static calculateDistribution(data, valueKey) {
    const total = data.reduce((sum, item) => sum + item[valueKey], 0);
    
    return data.map(item => ({
      ...item,
      percentage: total > 0 ? parseFloat(((item[valueKey] / total) * 100).toFixed(2)) : 0
    }));
  }

  /**
   * Fill missing dates in time series
   */
  static fillMissingDates(data, dateKey, startDate, endDate, defaultValue = 0) {
    const filled = [];
    const dataMap = new Map(data.map(d => [d[dateKey], d]));
    
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      
      if (dataMap.has(dateStr)) {
        filled.push(dataMap.get(dateStr));
      } else {
        filled.push({
          [dateKey]: dateStr,
          value: defaultValue
        });
      }

      current.setDate(current.getDate() + 1);
    }

    return filled;
  }

  /**
   * Calculate growth rate
   */
  static calculateGrowthRate(data, valueKey) {
    return data.map((item, index) => {
      if (index === 0) {
        return { ...item, growth_rate: 0 };
      }

      const previous = data[index - 1][valueKey];
      const current = item[valueKey];
      const growthRate = previous !== 0 ? ((current - previous) / previous) * 100 : 0;

      return {
        ...item,
        growth_rate: parseFloat(growthRate.toFixed(2))
      };
    });
  }

  /**
   * Detect anomalies using standard deviation
   */
  static detectAnomalies(data, valueKey, threshold = 2) {
    const values = data.map(d => d[valueKey]);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return data.map(item => ({
      ...item,
      is_anomaly: Math.abs(item[valueKey] - mean) > (threshold * stdDev),
      z_score: parseFloat(((item[valueKey] - mean) / stdDev).toFixed(2))
    }));
  }

  /**
   * Bucket data into ranges
   */
  static bucketData(data, valueKey, bucketSize) {
    const values = data.map(d => d[valueKey]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const buckets = {};

    for (let i = min; i <= max; i += bucketSize) {
      const bucketKey = `${i}-${i + bucketSize}`;
      buckets[bucketKey] = 0;
    }

    data.forEach(item => {
      const value = item[valueKey];
      const bucketIndex = Math.floor((value - min) / bucketSize);
      const bucketStart = min + (bucketIndex * bucketSize);
      const bucketKey = `${bucketStart}-${bucketStart + bucketSize}`;
      buckets[bucketKey]++;
    });

    return Object.keys(buckets).map(key => ({
      range: key,
      count: buckets[key]
    }));
  }

  /**
   * Transpose data for chart format
   */
  static transposeForChart(data, labelKey, ...valueKeys) {
    const labels = data.map(d => d[labelKey]);
    const datasets = valueKeys.map(key => ({
      label: key,
      data: data.map(d => d[key])
    }));

    return { labels, datasets };
  }
}

module.exports = DataAggregator;