# Performance Optimization Guide

**Sprint 4 Phase 4: Performance Optimization**

This guide covers performance monitoring, optimization, and best practices for InvAI.

---

## Performance Monitoring

### Query Performance

**View slow queries:**
```bash
curl http://localhost:3000/api/performance/slow-queries
```

**Monitor query statistics:**
```bash
curl http://localhost:3000/api/performance/metrics
```

### Cache Performance

**Check cache hit rate:**
- Target: >80% hit rate
- View in performance metrics API

**Clear cache:**
```bash
curl -X POST http://localhost:3000/api/performance/cache/clear
```

---

## Database Optimization

### PostgreSQL Tuning

**Connection Pooling:**
```bash
# .env
DATABASE_POOL_MAX=50  # Adjust based on load
DATABASE_POOL_IDLE_TIMEOUT=10000
```

**Memory Settings:**
```sql
-- For 4GB RAM server
ALTER SYSTEM SET shared_buffers = '1GB';
ALTER SYSTEM SET effective_cache_size = '3GB';
ALTER SYSTEM SET maintenance_work_mem = '256MB';
ALTER SYSTEM SET work_mem = '16MB';

SELECT pg_reload_conf();
```

**Query Optimization:**
```sql
-- Find slow queries
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Analyze table statistics
ANALYZE products;
ANALYZE inventory_batches;
```

### SQLite Tuning

**Enable WAL mode:**
```sql
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
```

---

## Caching Strategies

### Cache TTL by Data Type

| Data Type | TTL | Reason |
|-----------|-----|--------|
| Dashboard stats | 5 min | Frequently changing |
| Product list | 10 min | Moderate changes |
| Categories | 30 min | Rarely changes |
| Suppliers | 30 min | Rarely changes |
| Reports | 15 min | Balance freshness/performance |

### Cache Invalidation

**Pattern-based:**
```javascript
// Invalidate all product caches
cacheManager.invalidatePattern('products:*');

// Invalidate specific product
cacheManager.invalidatePattern('product:123:*');
```

---

## Performance Targets

### Response Times

- **Dashboard**: <500ms
- **List endpoints**: <300ms
- **Single item**: <100ms
- **Reports**: <2s

### Database Queries

- **Target**: <100ms average
- **Alert threshold**: >1s (slow query)
- **Optimization needed**: >5% slow queries

### Cache Performance

- **Hit rate**: >80%
- **Memory usage**: <100MB
- **Eviction rate**: <5%

---

## Optimization Checklist

### Database

- [ ] Indexes on foreign keys
- [ ] Indexes on WHERE clause columns
- [ ] Regular VACUUM (PostgreSQL)
- [ ] Statistics up to date (ANALYZE)
- [ ] Connection pooling configured

### Caching

- [ ] Appropriate TTL values
- [ ] Cache hit rate >80%
- [ ] Cache invalidation on updates
- [ ] Memory limits configured

### Application

- [ ] Async/await throughout
- [ ] Pagination on large datasets
- [ ] Batch operations where possible
- [ ] Compression enabled

---

## Monitoring

### Automated Maintenance

**Scheduled tasks:**
- Daily VACUUM/ANALYZE (3 AM)
- Weekly log archival (Sunday 4 AM)
- Monthly index rebuild (1st 5 AM)

### Performance Metrics API

```javascript
// Get current metrics
GET /api/performance/metrics

// Response:
{
  "database": {
    "type": "postgres",
    "connected": true
  },
  "queries": {
    "totalQueries": 1250,
    "slowQueries": 15,
    "averageDuration": 45,
    "slowQueryPercentage": "1.20"
  },
  "cache": {
    "hits": 8450,
    "misses": 1200,
    "hitRate": 87.6,
    "keys": 342
  }
}
```

---

## Troubleshooting

### High Memory Usage

1. Check cache size: `cacheManager.getStats()`
2. Clear cache if needed: `cacheManager.flush()`
3. Adjust TTL values
4. Reduce cache size limits

### Slow Queries

1. View slow queries: `GET /api/performance/slow-queries`
2. Add indexes where needed
3. Optimize WHERE clauses
4. Use EXPLAIN to analyze queries

### Low Cache Hit Rate

1. Increase TTL values
2. Pre-warm cache on startup
3. Review cache invalidation logic
4. Adjust cache size limits

---

## Best Practices

1. **Always use indexes** on foreign keys and WHERE columns
2. **Cache frequently accessed** but rarely changing data
3. **Monitor performance** regularly via metrics API
4. **Set appropriate TTL** based on data volatility
5. **Use pagination** for large result sets
6. **Batch operations** when possible
7. **Regular maintenance** via scheduler
8. **Profile slow queries** and optimize

---

**Last Updated**: January 25, 2026  
**Version**: v0.9.0-beta  
**Sprint**: 4 Phase 4 - Performance Optimization