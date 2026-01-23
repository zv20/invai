# v0.8.0 Implementation Guide

## ✅ Completed Files (Pushed to Beta)

### New Backend Modules (3 files)
1. ✅ `lib/activity-logger.js` - Activity tracking system
2. ✅ `lib/csv-export.js` - CSV generation for reports
3. ✅ `lib/cache-manager.js` - In-memory caching

### New Frontend Modules (7 files)
4. ✅ `public/js/activity-log.js` - Activity feed UI
5. ✅ `public/js/reports.js` - Reports tab with all report types
6. ✅ `public/js/dark-mode.js` - Theme system
7. ✅ `public/js/keyboard-shortcuts.js` - Global shortcuts
8. ✅ `public/js/command-palette.js` - Quick commands
9. ✅ `public/js/favorites.js` - Product favorites
10. ✅ `public/js/charts.js` - Visualizations

### Updated Files
11. ✅ `package.json` - Version 0.8.0 + dependencies
12. ✅ `CHANGELOG.md` - Complete release notes
13. ✅ `public/index.html` - Reports tab, dark mode toggle, script includes
14. ✅ `CHANGELOG_v0.8.0.md` - Detailed release document
15. ✅ `UPGRADE_TO_v0.8.0.md` - This file

### Existing Migration
16. ✅ `migrations/007_v0.8.0_enhancements.js` - Already exists

---

## ⚠️ Manual Updates Required

The following files need manual updates to integrate v0.8.0 features:

### 1. `server.js` - Backend API Updates

**Add at top after existing requires:**
```javascript
const ActivityLogger = require('./lib/activity-logger');
const CSVExporter = require('./lib/csv-export');
const CacheManager = require('./lib/cache-manager');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

// Initialize modules
const cache = new CacheManager();
let activityLogger;
let csvExporter;

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: 'logs/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    }),
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d'
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

**After database initialization, add:**
```javascript
activityLogger = new ActivityLogger(db);
csvExporter = new CSVExporter(db);
```

**Add new API endpoints before existing routes:**
```javascript
// Activity Log API
app.get('/api/activity-log', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const activities = await activityLogger.getRecent(limit);
    res.json(activities);
  } catch (error) {
    logger.error('Activity log error:', error);
    res.status(500).json({ error: 'Failed to load activity log' });
  }
});

app.get('/api/activity-log/:entityType/:entityId', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const activities = await activityLogger.getForEntity(entityType, parseInt(entityId));
    res.json(activities);
  } catch (error) {
    logger.error('Entity history error:', error);
    res.status(500).json({ error: 'Failed to load entity history' });
  }
});

// Reports API
app.get('/api/reports/stock-value', async (req, res) => {
  try {
    const cacheKey = 'report:stock-value';
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const query = `
      SELECT 
        p.id, p.name,
        c.name as category,
        COALESCE(SUM(ib.total_quantity), 0) as quantity,
        p.cost_per_case / NULLIF(p.items_per_case, 0) as unit_cost,
        COALESCE(SUM((p.cost_per_case / NULLIF(p.items_per_case, 0)) * ib.total_quantity), 0) as total_value
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN inventory_batches ib ON p.id = ib.product_id
      GROUP BY p.id
      ORDER BY total_value DESC
    `;

    db.all(query, [], (err, rows) => {
      if (err) {
        logger.error('Stock value report error:', err);
        return res.status(500).json({ error: err.message });
      }
      
      const totalValue = rows.reduce((sum, r) => sum + (r.total_value || 0), 0);
      const totalItems = rows.reduce((sum, r) => sum + r.quantity, 0);
      
      const result = {
        products: rows,
        totalValue,
        totalItems
      };
      
      cache.set(cacheKey, result, 60000); // 1 minute cache
      res.json(result);
    });
  } catch (error) {
    logger.error('Stock value report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

app.get('/api/reports/expiration', async (req, res) => {
  try {
    const query = `
      SELECT 
        p.name as product_name,
        ib.total_quantity as quantity,
        ib.expiry_date,
        ib.location,
        JULIANDAY(ib.expiry_date) - JULIANDAY('now') as days_until_expiry
      FROM inventory_batches ib
      JOIN products p ON ib.product_id = p.id
      WHERE ib.expiry_date IS NOT NULL
      ORDER BY ib.expiry_date
    `;

    db.all(query, [], (err, rows) => {
      if (err) {
        logger.error('Expiration report error:', err);
        return res.status(500).json({ error: err.message });
      }
      
      const expired = rows.filter(r => r.days_until_expiry < 0);
      const urgent = rows.filter(r => r.days_until_expiry >= 0 && r.days_until_expiry <= 7);
      const soon = rows.filter(r => r.days_until_expiry > 7 && r.days_until_expiry <= 30);
      
      res.json({ expired, urgent, soon, all: rows });
    });
  } catch (error) {
    logger.error('Expiration report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

app.get('/api/reports/low-stock', async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id, p.name,
        c.name as category,
        s.name as supplier,
        COALESCE(SUM(ib.total_quantity), 0) as quantity,
        p.reorder_point
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN inventory_batches ib ON p.id = ib.product_id
      GROUP BY p.id
      HAVING quantity < p.reorder_point AND p.reorder_point > 0
      ORDER BY quantity
    `;

    db.all(query, [], (err, rows) => {
      if (err) {
        logger.error('Low stock report error:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ products: rows });
    });
  } catch (error) {
    logger.error('Low stock report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

app.get('/api/reports/export/:type', async (req, res) => {
  try {
    const { type } = req.params;
    let csv;
    
    switch(type) {
      case 'stock-value':
        csv = await csvExporter.exportStockValue();
        break;
      case 'expiration':
        csv = await csvExporter.exportExpiration();
        break;
      case 'low-stock':
        csv = await csvExporter.exportLowStock();
        break;
      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    logger.error('CSV export error:', error);
    res.status(500).json({ error: 'Failed to export report' });
  }
});

// Favorites API
app.post('/api/products/:id/favorite', (req, res) => {
  const { id } = req.params;
  const { is_favorite } = req.body;
  
  db.run(
    'UPDATE products SET is_favorite = ? WHERE id = ?',
    [is_favorite ? 1 : 0, id],
    async function(err) {
      if (err) {
        logger.error('Favorite update error:', err);
        return res.status(500).json({ error: err.message });
      }
      
      // Log activity
      await activityLogger.log(
        'update',
        'product',
        id,
        'Product',
        is_favorite ? 'Added to favorites' : 'Removed from favorites'
      );
      
      cache.invalidatePattern('products');
      res.json({ success: true, is_favorite });
    }
  );
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '0.8.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});
```

**Integrate activity logging into existing product/batch operations:**

For example, after creating a product:
```javascript
// After successful product creation
await activityLogger.log(
  'create',
  'product',
  this.lastID,
  req.body.name,
  `Created product: ${req.body.name}`
);
```

For updates:
```javascript
// After successful product update  
await activityLogger.log(
  'update',
  'product',
  req.params.id,
  req.body.name,
  `Updated product: ${req.body.name}`,
  oldData, // previous values
  req.body // new values
);
```

For deletes:
```javascript
// After successful product deletion
await activityLogger.log(
  'delete',
  'product',
  req.params.id,
  productName,
  `Deleted product: ${productName}`
);
```

---

### 2. `public/css/styles.css` - Dark Mode CSS

**Add at the very top:**
```css
/* Dark Mode Support */
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f3f4f6;
  --bg-tertiary: #e5e7eb;
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --text-tertiary: #9ca3af;
  --border-color: #d1d5db;
  --shadow: rgba(0, 0, 0, 0.1);
  --accent-primary: #3b82f6;
  --accent-hover: #2563eb;
}

[data-theme="dark"] {
  --bg-primary: #1f2937;
  --bg-secondary: #111827;
  --bg-tertiary: #374151;
  --text-primary: #f9fafb;
  --text-secondary: #d1d5db;
  --text-tertiary: #9ca3af;
  --border-color: #4b5563;
  --shadow: rgba(0, 0, 0, 0.3);
  --accent-primary: #60a5fa;
  --accent-hover: #3b82f6;
}

body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  transition: background-color 0.3s, color 0.3s;
}

/* Apply variables to components */
.container {
  background: var(--bg-primary);
}

.header {
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.sidebar {
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
}

.dashboard-section,
.stat-card,
.product-card,
.batch-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

input, select, textarea {
  background: var(--bg-primary);
  border-color: var(--border-color);
  color: var(--text-primary);
}

.modal-content {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

/* Icon button for dark mode toggle */
.icon-btn {
  background: transparent;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: background 0.2s;
}

.icon-btn:hover {
  background: var(--bg-tertiary);
}

/* Command Palette Styles */
.command-palette {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10000;
  align-items: flex-start;
  justify-content: center;
  padding-top: 100px;
}

.command-palette.show {
  display: flex;
}

.command-palette-content {
  background: var(--bg-secondary);
  border-radius: 12px;
  width: 600px;
  max-width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

#commandInput {
  width: 100%;
  padding: 20px;
  font-size: 1.1rem;
  border: none;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
}

.command-results {
  max-height: 400px;
  overflow-y: auto;
}

.command-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  cursor: pointer;
  transition: background 0.2s;
}

.command-item:hover {
  background: var(--bg-tertiary);
}

.command-icon {
  font-size: 1.5rem;
}

.command-info {
  flex: 1;
}

.command-name {
  font-weight: 600;
  color: var(--text-primary);
}

.command-description {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.command-item kbd {
  background: var(--bg-tertiary);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* Activity Feed Styles */
.activity-feed {
  max-height: 400px;
  overflow-y: auto;
}

.activity-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid var(--border-color);
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-icon {
  font-size: 1.2rem;
}

.activity-content {
  flex: 1;
}

.activity-description {
  color: var(--text-primary);
  margin-bottom: 4px;
}

.activity-meta {
  display: flex;
  gap: 12px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* Report Styles */
.report-nav {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.report-nav-item {
  padding: 10px 20px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.report-nav-item:hover {
  background: var(--bg-tertiary);
}

.report-nav-item.active {
  background: var(--accent-primary);
  color: white;
  border-color: var(--accent-primary);
}

.report-content {
  background: var(--bg-secondary);
  padding: 20px;
  border-radius: 8px;
  min-height: 400px;
}

.report-table table {
  width: 100%;
  border-collapse: collapse;
}

.report-table th,
.report-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.report-table th {
  background: var(--bg-tertiary);
  font-weight: 600;
}
```

---

### 3. Other Frontend Files

The following files need minor updates to integrate new features:

- `public/js/dashboard.js` - Call `ActivityLog.loadRecentActivity()` in `loadDashboardStats()`
- `public/js/inventory.js` - Add favorite button to product cards
- `public/js/settings.js` - Add theme selector handler

These are optional enhancements and the app will work without them.

---

## 🚀 Deployment Steps

1. **Pull all updates:**
   ```bash
   cd /opt/invai
   git pull origin beta
   ```

2. **Install new dependencies:**
   ```bash
   npm install
   ```

3. **Apply manual updates to `server.js` and `styles.css`** as documented above

4. **Restart the service:**
   ```bash
   systemctl restart inventory-app
   ```

5. **Verify:**
   - Check logs: `journalctl -u inventory-app -n 100`
   - Visit app, confirm version shows 0.8.0
   - Test Reports tab
   - Try dark mode toggle (moon icon in header)
   - Press `Ctrl+K` for command palette
   - Check activity feed on dashboard

6. **Monitor logs:**
   ```bash
   tail -f logs/app-*.log
   tail -f logs/error-*.log
   ```

---

## ✅ Testing Checklist

- [ ] Dashboard loads with activity feed
- [ ] Reports tab accessible and all reports work
- [ ] CSV export downloads successfully
- [ ] Dark mode toggle works (persists across refresh)
- [ ] Keyboard shortcuts respond (`Ctrl+1/2/3/4`, `Ctrl+K`)
- [ ] Command palette opens with `Ctrl+K`
- [ ] Product favorites toggle works
- [ ] Activity log shows recent actions
- [ ] No console errors
- [ ] Migration 007 ran successfully (check logs)

---

## 🔄 Rollback Procedure

If issues arise:

```bash
cd /opt/invai
git log --oneline  # Find previous commit
git reset --hard <commit-hash-before-0.8.0>
systemctl restart inventory-app
```

---

## 📞 Support

If you encounter issues:
1. Check logs: `journalctl -u inventory-app -n 200`
2. Check error logs: `cat logs/error-*.log`
3. Report issues on GitHub: https://github.com/zv20/invai/issues
