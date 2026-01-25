/**
 * Enhanced Cache Manager - Sprint 4 Phase 4
 * 
 * Improved caching with:
 * - TTL strategies
 * - Cache hit/miss tracking
 * - Memory usage monitoring
 */

const NodeCache = require('node-cache');

class EnhancedCacheManager {
  constructor(options = {}) {
    this.cache = new NodeCache({
      stdTTL: options.stdTTL || 600, // 10 minutes default
      checkperiod: options.checkperiod || 120, // Check for expired keys every 2 minutes
      useClones: false // Better performance
    });
    
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
    
    // Track cache events
    this.cache.on('set', (key) => this.stats.sets++);
    this.cache.on('del', (key) => this.stats.deletes++);
    this.cache.on('expired', (key) => this.stats.deletes++);
  }

  /**
   * Get value from cache with hit/miss tracking
   */
  get(key) {
    const value = this.cache.get(key);
    
    if (value !== undefined) {
      this.stats.hits++;
    } else {
      this.stats.misses++;
    }
    
    return value;
  }

  /**
   * Set value in cache with optional TTL
   */
  set(key, value, ttl) {
    return this.cache.set(key, value, ttl);
  }

  /**
   * Get or compute value (cache-aside pattern)
   */
  async getOrCompute(key, computeFn, ttl) {
    let value = this.get(key);
    
    if (value === undefined) {
      value = await computeFn();
      this.set(key, value, ttl);
    }
    
    return value;
  }

  /**
   * Invalidate cache by pattern
   */
  invalidatePattern(pattern) {
    const keys = this.cache.keys();
    const regex = new RegExp(pattern);
    let deleted = 0;
    
    for (const key of keys) {
      if (regex.test(key)) {
        this.cache.del(key);
        deleted++;
      }
    }
    
    return deleted;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) : 0;
    
    return {
      ...this.stats,
      hitRate: parseFloat(hitRate),
      totalRequests: total,
      keys: this.cache.keys().length,
      size: this.getSize()
    };
  }

  /**
   * Get cache size (approximate)
   */
  getSize() {
    const stats = this.cache.getStats();
    return stats.ksize + stats.vsize;
  }

  /**
   * Clear all cache
   */
  flush() {
    this.cache.flushAll();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      hits: this.stats.hits,
      misses: this.stats.misses,
      sets: 0,
      deletes: 0
    };
  }
}

module.exports = EnhancedCacheManager;