# server.js Integration Patch - Sprints 5 & 6

**Purpose**: Add Sprint 5 (Business Intelligence) and Sprint 6 (Mobile & PWA) routes to server.js

---

## Quick Apply (Copy-Paste Method)

### Step 1: Add Route Imports

**Location**: Add after line ~38 (after existing route imports)

```javascript
// Existing imports above...
const importExportRoutes = require('./routes/import-export');

// ADD THESE LINES:

// Sprint 5 routes (Business Intelligence) - Added Jan 25, 2026
const analyticsRoutes = require('./routes/analytics');
const predictionsRoutes = require('./routes/predictions');
const searchRoutes = require('./routes/search');
const dashboardsRoutes = require('./routes/dashboards');

// Sprint 6 routes (Mobile & PWA) - Added Jan 26, 2026
const notificationsRoutes = require('./routes/notifications');
```

---

### Step 2: Register Routes

**Location**: Inside `registerRoutes()` function (around line 180-200)

**Find this section**:
```javascript
function registerRoutes() {
  app.use('/api/auth', authRoutes(db, logger));
  app.use('/api/users', userRoutes(db, activityLogger));
  // ... existing routes ...
  app.use('/api', authenticate, importExportRoutes(db, activityLogger, logger));
  
  // ADD NEW ROUTES HERE (before the console.log line)
```

**Add this code**:
```javascript
function registerRoutes() {
  // Existing routes
  app.use('/api/auth', authRoutes(db, logger));
  app.use('/api/users', userRoutes(db, activityLogger));
  app.use('/api/products', authenticate, productRoutes(db, activityLogger, cache));
  app.use('/api/batches', authenticate, batchRoutes(db, activityLogger));
  app.use('/api/inventory/batches', authenticate, batchRoutes(db, activityLogger));
  app.use('/api/categories', authenticate, categoryRoutes(db, activityLogger));
  app.use('/api/suppliers', authenticate, supplierRoutes(db, activityLogger));
  app.use('/api/dashboard', authenticate, dashboardRoutes(db, cache));
  app.use('/api/settings', authenticate, authorize('admin'), settingsRoutes(db, createBackup));
  app.use('/api/reports', authenticate, reportsRoutes(db, cache, csvExporter));
  app.use('/api/inventory', authenticate, inventoryHelpersRoutes(db));
  app.use('/api/backup', authenticate, backupsRoutes(createBackup, dbAdapter.db || dbAdapter, Database));
  app.use('/api', systemRoutes(db, logger, VERSION, MigrationRunner, dbAdapter.db || dbAdapter, checkGitHubVersion, getCurrentChannel));
  app.use('/api', authenticate, importExportRoutes(db, activityLogger, logger));
  
  // ADD THESE NEW ROUTES:
  
  // Sprint 5: Business Intelligence (Jan 25, 2026)
  app.use('/api/analytics', authenticate, analyticsRoutes(db, cache));
  app.use('/api/predictions', authenticate, predictionsRoutes(db));
  app.use('/api/search', authenticate, searchRoutes(db));
  app.use('/api/saved-searches', authenticate, searchRoutes(db));
  app.use('/api/dashboards', authenticate, dashboardsRoutes(db));
  app.use('/api/widgets', authenticate, dashboardsRoutes(db));
  
  // Sprint 6: Mobile & PWA (Jan 26, 2026)
  app.use('/api/notifications', authenticate, notificationsRoutes(db));
  
  console.log('✓ All routes registered');
}
```

---

## Alternative: Minimal Addition

If you just want to add the new routes without touching existing code:

**Add to imports section**:
```javascript
const analyticsRoutes = require('./routes/analytics');
const predictionsRoutes = require('./routes/predictions');
const searchRoutes = require('./routes/search');
const dashboardsRoutes = require('./routes/dashboards');
const notificationsRoutes = require('./routes/notifications');
```

**Add to `registerRoutes()` function (before the console.log)**:
```javascript
  // Sprint 5 & 6 Routes
  app.use('/api/analytics', authenticate, analyticsRoutes(db, cache));
  app.use('/api/predictions', authenticate, predictionsRoutes(db));
  app.use('/api/search', authenticate, searchRoutes(db));
  app.use('/api/saved-searches', authenticate, searchRoutes(db));
  app.use('/api/dashboards', authenticate, dashboardsRoutes(db));
  app.use('/api/widgets', authenticate, dashboardsRoutes(db));
  app.use('/api/notifications', authenticate, notificationsRoutes(db));
```

---

## Verification

### Step 1: Check Syntax

```bash
# Check for syntax errors
node -c server.js

# Expected: No output = no errors
```

### Step 2: Start Server

```bash
npm start
```

**Expected Output**:
```
🚀 InvAI v0.10.0-beta - Sprint 4 Phase 1: PostgreSQL Support
✅ Dual database support (SQLite + PostgreSQL)
✅ Database adapter system active
✅ JWT authentication enabled
✅ Security headers active (Helmet.js)
✅ CSRF protection enabled
📊 Database: SQLITE

🔌 Connecting to database...
✓ Connected to SQLITE database
✓ Activity logger and CSV exporter initialized
✓ Account lockout cleanup scheduler started
✓ All routes registered  <-- Should see this

🎉 InvAI v0.10.0-beta
💻 Server running on port 3000
🔗 Access at http://localhost:3000
```

### Step 3: Test Routes

**Test in browser console or using curl**:

```bash
# Get JWT token first (replace with your credentials)
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_password"}' \
  | jq -r '.token')

# Test Analytics endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/analytics/summary

# Test Predictions endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/predictions/products

# Test Search endpoint
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/search/autocomplete?q=test"

# Test Dashboards endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/dashboards

# Test Notifications endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/notifications/vapid-public-key
```

**Expected**: Each should return JSON data (not 404 or 500 errors)

### Step 4: Check for Errors

**If server won't start**, check:

1. **Missing routes error**:
   ```
   Error: Cannot find module './routes/analytics'
   ```
   **Solution**: Ensure all Sprint 5 & 6 route files exist

2. **Syntax error**:
   ```
   SyntaxError: Unexpected token
   ```
   **Solution**: Check for missing commas, brackets, or quotes

3. **Route conflict**:
   ```
   Error: Route already registered
   ```
   **Solution**: Make sure you didn't add routes twice

---

## Complete Route List (Sprint 1-6)

**After integration, server.js should have these routes**:

### Core Routes
- `/api/auth` - Authentication (login, logout, refresh)
- `/api/users` - User management (CRUD, roles)
- `/api/products` - Product management
- `/api/batches` - Batch management
- `/api/categories` - Category management
- `/api/suppliers` - Supplier management
- `/api/dashboard` - Main dashboard data
- `/api/settings` - System settings

### Extended Routes
- `/api/reports` - Reports and exports
- `/api/inventory` - Inventory helpers
- `/api/backup` - Backup management
- `/api/system` - System information
- `/api/import-export` - Bulk import/export

### Sprint 5 Routes (Business Intelligence)
- `/api/analytics` - Analytics and charts
- `/api/predictions` - Demand forecasting
- `/api/search` - Advanced search
- `/api/saved-searches` - Saved search management
- `/api/dashboards` - Custom dashboards
- `/api/widgets` - Dashboard widgets

### Sprint 6 Routes (Mobile & PWA)
- `/api/notifications` - Push notifications

**Total**: 21 route groups

---

## Rollback (If Needed)

If something goes wrong, simply remove the lines you added:

```bash
# Revert to previous commit
git checkout server.js

# Or restore from backup
cp server.js.backup server.js

# Restart server
npm start
```

---

## What's Next?

After integrating server.js:

1. ✅ Routes registered
2. ⏭️ Update HTML pages with PWA scripts
3. ⏭️ Test PWA installation
4. ⏭️ Test push notifications
5. ⏭️ Test barcode scanner
6. ⏭️ Complete Sprint 6 integration checklist

**See**: `docs/SPRINT_6_INTEGRATION.md` for full integration guide

---

**Last Updated**: January 26, 2026  
**Version**: v0.11.0-beta (Sprint 6)  
**Status**: Ready for integration
