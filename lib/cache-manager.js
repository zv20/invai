/**
 * Cache Manager Module
 * Simple in-memory caching for API responses
 * v0.8.0
 */

const NodeCache = require('node-cache');

class CacheManager {
  constructor(options = {}) {
    this.cache = new NodeCache({
      stdTTL: options.ttl || 30, // Default 30 seconds
      checkperiod: 60, // Check for expired keys every 60 seconds
      useClones: false // Don't clone objects for better performance
    });
  }

  /**
   * Get value from cache
   */
  get(key) {
    return this.cache.get(key);
  }

  /**
   * Set value in cache
   */
  set(key, value, ttl = null) {
    if (ttl) {
      return this.cache.set(key, value, ttl);
    }
    return this.cache.set(key, value);
  }

  /**
   * Delete key from cache
   */
  del(key) {
    return this.cache.del(key);
  }

  /**
   * Clear all cache
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

  /**
   * Middleware to cache GET requests
   */
  middleware(ttl = null) {
    return (req, res, next) => {
      // Only cache GET requests
      if (req.method !== 'GET') {
        return next();
      }

      const key = req.originalUrl || req.url;
      const cachedResponse = this.get(key);

      if (cachedResponse) {
        return res.json(cachedResponse);
      }

      // Override res.json to cache response
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        this.set(key, body, ttl);
        return originalJson(body);
      };

      next();
    };
  }
}

module.exports = CacheManager;