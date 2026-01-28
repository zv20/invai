/**
 * Unit Tests for Cache Manager
 * Tests in-memory caching functionality
 */

const CacheManager = require('../../lib/cache-manager');

describe('CacheManager', () => {
  let cache;

  beforeEach(() => {
    cache = new CacheManager();
  });

  afterEach(() => {
    if (cache) {
      cache.clear();
    }
  });

  describe('Basic Operations', () => {
    test('should store and retrieve values', () => {
      cache.set('test-key', 'test-value');
      expect(cache.get('test-key')).toBe('test-value');
    });

    test('should return null for missing keys', () => {
      expect(cache.get('nonexistent-key')).toBeNull();
    });

    test('should handle different data types', () => {
      cache.set('string', 'value');
      cache.set('number', 42);
      cache.set('object', { name: 'test' });
      cache.set('array', [1, 2, 3]);
      cache.set('boolean', true);

      expect(cache.get('string')).toBe('value');
      expect(cache.get('number')).toBe(42);
      expect(cache.get('object')).toEqual({ name: 'test' });
      expect(cache.get('array')).toEqual([1, 2, 3]);
      expect(cache.get('boolean')).toBe(true);
    });

    test('should overwrite existing keys', () => {
      cache.set('key', 'value1');
      cache.set('key', 'value2');
      expect(cache.get('key')).toBe('value2');
    });
  });

  describe('Cache Invalidation', () => {
    test('should delete specific cache entry', () => {
      cache.set('test-key', 'test-value');
      cache.delete('test-key');
      expect(cache.get('test-key')).toBeNull();
    });

    test('should invalidate cache entry (alias for delete)', () => {
      cache.set('test-key', 'test-value');
      cache.invalidate('test-key');
      expect(cache.get('test-key')).toBeNull();
    });

    test('should invalidate multiple entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.invalidate('key1');
      cache.invalidate('key2');
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
    });

    test('should handle pattern-based invalidation', () => {
      cache.set('products:1', { id: 1 });
      cache.set('products:2', { id: 2 });
      cache.set('categories:1', { id: 1 });
      
      const deleted = cache.invalidatePattern('products');
      
      expect(deleted).toBe(2);
      expect(cache.get('products:1')).toBeNull();
      expect(cache.get('products:2')).toBeNull();
      expect(cache.get('categories:1')).toEqual({ id: 1 });
    });

    test('should clear all cache entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      
      cache.clear();
      
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBeNull();
    });
  });

  describe('TTL (Time To Live)', () => {
    test('should expire entries after TTL', (done) => {
      cache.set('temp-key', 'temp-value', 100); // 100ms TTL
      expect(cache.get('temp-key')).toBe('temp-value');
      
      setTimeout(() => {
        expect(cache.get('temp-key')).toBeNull();
        done();
      }, 150);
    });

    test('should use default TTL if not specified', () => {
      cache.set('key', 'value'); // Uses default 30s TTL
      expect(cache.get('key')).toBe('value');
    });

    test('should handle custom TTL per entry', (done) => {
      cache.set('short', 'value1', 100);
      cache.set('long', 'value2', 500);
      
      setTimeout(() => {
        expect(cache.get('short')).toBeNull();
        expect(cache.get('long')).toBe('value2');
        done();
      }, 150);
    });
  });

  describe('Edge Cases', () => {
    test('should handle null values', () => {
      cache.set('null-key', null);
      expect(cache.get('null-key')).toBeNull();
    });

    test('should handle undefined values', () => {
      cache.set('undefined-key', undefined);
      expect(cache.get('undefined-key')).toBeUndefined();
    });

    test('should handle empty strings', () => {
      cache.set('empty-key', '');
      expect(cache.get('empty-key')).toBe('');
    });

    test('should handle zero values', () => {
      cache.set('zero-key', 0);
      expect(cache.get('zero-key')).toBe(0);
    });

    test('should handle large objects', () => {
      const largeObject = { data: new Array(1000).fill('test') };
      cache.set('large-key', largeObject);
      expect(cache.get('large-key')).toEqual(largeObject);
    });

    test('should handle special characters in keys', () => {
      cache.set('key:with:colons', 'value1');
      cache.set('key-with-dashes', 'value2');
      cache.set('key_with_underscores', 'value3');
      
      expect(cache.get('key:with:colons')).toBe('value1');
      expect(cache.get('key-with-dashes')).toBe('value2');
      expect(cache.get('key_with_underscores')).toBe('value3');
    });
  });

  describe('Cleanup Operations', () => {
    test('should cleanup expired entries', (done) => {
      cache.set('expired1', 'value1', 50);
      cache.set('expired2', 'value2', 50);
      cache.set('valid', 'value3', 5000);
      
      setTimeout(() => {
        const cleaned = cache.cleanup();
        expect(cleaned).toBe(2);
        expect(cache.get('valid')).toBe('value3');
        done();
      }, 100);
    });

    test('should return 0 when no expired entries', () => {
      cache.set('key1', 'value1', 5000);
      cache.set('key2', 'value2', 5000);
      
      const cleaned = cache.cleanup();
      expect(cleaned).toBe(0);
    });
  });

  describe('Stats and Monitoring', () => {
    test('should return cache stats', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      
      const stats = cache.getStats();
      
      expect(stats.size).toBe(3);
      expect(stats.keys).toContain('key1');
      expect(stats.keys).toContain('key2');
      expect(stats.keys).toContain('key3');
    });

    test('should return empty stats for empty cache', () => {
      const stats = cache.getStats();
      
      expect(stats.size).toBe(0);
      expect(stats.keys).toEqual([]);
    });
  });
});
