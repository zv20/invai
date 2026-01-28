/**
 * Query Analyzer - Sprint 4 Phase 4
 * 
 * Monitors and analyzes database query performance
 */

class QueryAnalyzer {
  constructor(dbAdapter, logger) {
    this.dbAdapter = dbAdapter;
    this.logger = logger;
    this.slowQueryThreshold = parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000'); // ms
    this.queries = [];
    this.maxQueries = 1000; // Keep last 1000 queries
  }

  /**
   * Wrap query execution with performance tracking
   */
  async trackQuery(queryFn, sql, params = []) {
    const startTime = Date.now();
    const queryId = this.generateQueryId(sql);
    
    try {
      const result = await queryFn();
      const duration = Date.now() - startTime;
      
      this.recordQuery({
        id: queryId,
        sql: sql.substring(0, 200), // Limit SQL length
        params: params.length,
        duration,
        timestamp: new Date(),
        success: true,
        slow: duration > this.slowQueryThreshold
      });
      
      if (duration > this.slowQueryThreshold) {
        this.logger.warn(`Slow query detected (${duration}ms): ${sql.substring(0, 100)}`);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.recordQuery({
        id: queryId,
        sql: sql.substring(0, 200),
        params: params.length,
        duration,
        timestamp: new Date(),
        success: false,
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * Generate query ID (hash of SQL)
   */
  generateQueryId(sql) {
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < sql.length; i++) {
      hash = ((hash << 5) - hash) + sql.charCodeAt(i);
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  /**
   * Record query execution
   */
  recordQuery(query) {
    this.queries.unshift(query);
    
    // Keep only max queries
    if (this.queries.length > this.maxQueries) {
      this.queries.pop();
    }
  }

  /**
   * Get slow queries
   */
  getSlowQueries(limit = 10) {
    return this.queries
      .filter(q => q.slow)
      .slice(0, limit);
  }

  /**
   * Get query statistics
   */
  getStats() {
    const total = this.queries.length;
    const slow = this.queries.filter(q => q.slow).length;
    const failed = this.queries.filter(q => !q.success).length;
    const avgDuration = total > 0 
      ? this.queries.reduce((sum, q) => sum + q.duration, 0) / total 
      : 0;

    return {
      totalQueries: total,
      slowQueries: slow,
      failedQueries: failed,
      averageDuration: Math.round(avgDuration),
      slowQueryPercentage: total > 0 ? ((slow / total) * 100).toFixed(2) : 0
    };
  }

  /**
   * Get query recommendations
   */
  async getRecommendations() {
    const recommendations = [];
    const stats = this.getStats();

    // Slow query threshold
    if (parseFloat(stats.slowQueryPercentage) > 10) {
      recommendations.push({
        type: 'warning',
        message: `${stats.slowQueryPercentage}% of queries are slow`,
        suggestion: 'Consider adding indexes or optimizing queries'
      });
    }

    // Check for missing indexes
    const slowQueries = this.getSlowQueries(5);
    const tablesWithoutIndexes = new Set();
    
    for (const query of slowQueries) {
      if (query.sql.includes('WHERE') && !query.sql.includes('INDEX')) {
        const match = query.sql.match(/FROM\s+(\w+)/i);
        if (match) {
          tablesWithoutIndexes.add(match[1]);
        }
      }
    }

    if (tablesWithoutIndexes.size > 0) {
      recommendations.push({
        type: 'info',
        message: 'Tables may benefit from indexes',
        suggestion: `Review indexes on: ${Array.from(tablesWithoutIndexes).join(', ')}`
      });
    }

    return recommendations;
  }

  /**
   * Clear query history
   */
  clear() {
    this.queries = [];
  }
}

module.exports = QueryAnalyzer;