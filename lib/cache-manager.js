/**
 * Cache Manager
 * Simple in-memory caching for API responses
 * v0.8.0
 */

const NodeCache = require('node-cache');

class CacheManager {
  constructor() {
    // Cache with 30 second TTL by default
    this.cache = new NodeCache({ stdTTL: 30, checkperiod: 60 });
  }

  /**
   * Get cached value
   */
  get(key) {
    return this.cache.get(key);
  }

  /**
   * Set cached value
   */
  set(key, value, ttl = null) {
    if (ttl) {
      return this.cache.set(key, value, ttl);
    }
    return this.cache.set(key, value);
  }

  /**
   * Delete cached value
   */
  del(key) {
    return this.cache.del(key);
  }

  /**
   * Clear cache
   */
  flush() {
    return this.cache.flushAll();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return this.cache.getStats();
  }
}

module.exports = new CacheManager();