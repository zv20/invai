# Sprint 6: Mobile & PWA - Integration Checklist

**Version**: v0.11.0-beta  
**Sprint Status**: Phase 1 ✅ | Phase 2 ✅ | Phase 3: Integration (In Progress)  
**Last Updated**: January 25, 2026

---

## 📋 Overview

This guide walks through integrating all Sprint 6 features into InvAI:
- ✅ **Phase 1**: PWA Core (service worker, manifest, offline storage, push notifications)
- ✅ **Phase 2**: Mobile UI (responsive design, touch gestures, barcode scanner)
- 🔄 **Phase 3**: Integration & Testing (this checklist)

**Time Estimate**: 2-3 hours

---

## ✅ Phase 3: Integration Checklist

### Step 1: Install Dependencies (5 minutes)

```bash
# Install web-push for push notifications
npm install web-push

# Verify installation
npm list web-push
```

**Expected Output**: `web-push@3.x.x`

---

### Step 2: Generate VAPID Keys (5 minutes)

**Option A: Quick Generation (Recommended)**

```bash
node -e "console.log(require('web-push').generateVAPIDKeys())"
```

**Option B: Use the Setup Script**

```bash
node scripts/generate-vapid-keys.js
```

**Expected Output**:
```json
{
  "publicKey": "BDj7...long-key-here",
  "privateKey": "abc123...secret-key-here"
}
```

⚠️ **Important**: Save these keys! You'll need them in the next step.

---

### Step 3: Configure Environment Variables (5 minutes)

**Update `.env` file** (create from `.env.example` if needed):

```bash
# Add to your .env file:

# ==================================================
# PWA & PUSH NOTIFICATIONS (Sprint 6)
# ==================================================

# VAPID Keys for Push Notifications
VAPID_PUBLIC_KEY=BDj7...your-public-key-here
VAPID_PRIVATE_KEY=abc123...your-private-key-here
VAPID_SUBJECT=mailto:your-email@example.com

# PWA Configuration
PWA_ENABLED=true
PWA_CACHE_VERSION=v1
PWA_OFFLINE_MODE=true
```

**Verification**:
```bash
node -e "require('dotenv').config(); console.log('VAPID Public Key:', process.env.VAPID_PUBLIC_KEY ? '✓ Set' : '✗ Missing');"
```

---

### Step 4: Run Database Migration (5 minutes)

**Run Migration 015** (creates `push_subscriptions` table):

```bash
# Option A: Automatic (on server start)
npm start
# Migration runs automatically

# Option B: Manual (if you have the script)
node scripts/run-migration.js 015

# Option C: Using migration runner directly
node -e "const MigrationRunner = require('./migrations/migration-runner'); const { getDatabase } = require('./lib/database'); getDatabase().then(db => { const runner = new MigrationRunner(db); return runner.runPendingMigrations(); }).then(() => console.log('✓ Migrations complete')).catch(console.error);"
```

**Verify Migration**:
```bash
# Check if push_subscriptions table exists
sqlite3 data/inventory.db "SELECT name FROM sqlite_master WHERE type='table' AND name='push_subscriptions';"

# Or for PostgreSQL:
psql -d invai_production -c "\dt push_subscriptions"
```

**Expected Output**: `push_subscriptions`

---

### Step 5: Update server.js (10 minutes)

**Add Sprint 5 & 6 Route Imports** to `server.js`:

```javascript
// Add after existing route imports (around line 38)

// Sprint 5 routes (Business Intelligence)
const analyticsRoutes = require('./routes/analytics');
const predictionsRoutes = require('./routes/predictions');
const searchRoutes = require('./routes/search');
const dashboardsRoutes = require('./routes/dashboards');

// Sprint 6 routes (Mobile & PWA)
const notificationsRoutes = require('./routes/notifications');
```

**Register Routes in `registerRoutes()` function** (around line 180):

```javascript
function registerRoutes() {
  // Existing routes...
  app.use('/api/auth', authRoutes(db, logger));
  app.use('/api/users', userRoutes(db, activityLogger));
  // ... other existing routes ...
  
  // ADD THESE NEW ROUTES:
  
  // Sprint 5: Business Intelligence
  app.use('/api/analytics', authenticate, analyticsRoutes(db, cache));
  app.use('/api/predictions', authenticate, predictionsRoutes(db));
  app.use('/api/search', authenticate, searchRoutes(db));
  app.use('/api/saved-searches', authenticate, searchRoutes(db));
  app.use('/api/dashboards', authenticate, dashboardsRoutes(db));
  app.use('/api/widgets', authenticate, dashboardsRoutes(db));
  
  // Sprint 6: Mobile & PWA
  app.use('/api/notifications', authenticate, notificationsRoutes(db));
  
  console.log('✓ All routes registered');
}
```

**Verification**:
```bash
# Start server and check for errors
npm start

# Look for:
# ✓ All routes registered
# No "Cannot find module" errors
```

---

### Step 6: Update HTML Pages (30-45 minutes)

**Files to Update** (12 HTML pages total):
- `public/index.html` (dashboard)
- `public/products.html`
- `public/batches.html`
- `public/reports.html`
- `public/users.html`
- `public/analytics.html`
- `public/predictions.html`
- `public/advanced-search.html`
- `public/dashboard-builder.html`
- `public/settings.html`
- `public/stock-take.html`
- Any other custom pages

**Add to `<head>` section** of each HTML page:

```html
<!-- PWA Manifest -->
<link rel="manifest" href="/manifest.json">

<!-- Mobile Optimization -->
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="InvAI">

<!-- Theme Colors -->
<meta name="theme-color" content="#1a1a2e">
<meta name="msapplication-navbutton-color" content="#1a1a2e">

<!-- Mobile CSS -->
<link rel="stylesheet" href="/css/mobile.css">
```

**Add before closing `</body>` tag**:

```html
<!-- PWA & Mobile Scripts -->
<script src="/lib/pwa/offlineStorage.js"></script>
<script src="/js/pwa-init.js"></script>
<script src="/js/pwa-install.js"></script>
<script src="/js/touch-gestures.js"></script>
<script src="/js/mobile-components.js"></script>
<script src="/js/mobile-navigation.js"></script>

<!-- Initialize PWA -->
<script>
  // Service worker registration
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('✓ Service Worker registered'))
        .catch(err => console.error('Service Worker registration failed:', err));
    });
  }
  
  // Initialize touch gestures
  if (typeof TouchGestures !== 'undefined') {
    const gestures = new TouchGestures(document.body);
    
    // Pull to refresh
    gestures.onPullRefresh(() => {
      console.log('Refreshing page...');
      location.reload();
    });
  }
</script>
```

**Quick Update Script** (optional - automate this):

Create `scripts/update-html-pwa.js` and run it to auto-update all pages.

---

### Step 7: Add Barcode Scanner to Product Pages (15 minutes)

**Update `public/products.html`** - Add scanner button:

```html
<!-- Add after the "Add Product" button -->
<button id="scanBarcodeBtn" class="btn btn-secondary">
  <i class="fas fa-camera"></i> Scan Barcode
</button>

<!-- Add before </body> -->
<script src="/js/barcode-scanner.js"></script>
<script src="/js/camera-capture.js"></script>

<script>
  // Initialize barcode scanner
  const scanner = new BarcodeScanner();
  
  document.getElementById('scanBarcodeBtn').addEventListener('click', async () => {
    try {
      const result = await scanner.scan();
      
      if (result.success) {
        console.log('Scanned:', result.code);
        
        // Search for product by barcode
        const response = await fetch(`/api/search/quick-lookup/${result.code}`);
        const product = await response.json();
        
        if (product) {
          alert(`Found: ${product.name}`);
          // Open product details or quick edit
        } else {
          // Offer to create new product with this barcode
          if (confirm('Product not found. Create new product?')) {
            // Open product form with barcode pre-filled
            openProductForm({ barcode: result.code });
          }
        }
      }
    } catch (error) {
      console.error('Scan error:', error);
      alert('Scanner error: ' + error.message);
    }
  });
</script>
```

---

### Step 8: Test PWA Installation (15 minutes)

#### Desktop Testing (Chrome/Edge)

1. **Start server**: `npm start`
2. **Open**: http://localhost:3000
3. **Look for install icon** in address bar (⊕ or install button)
4. **Click install** and verify app opens in standalone window
5. **Check**:
   - Offline mode works (disconnect network)
   - Service worker active (DevTools → Application → Service Workers)
   - Cache populated (DevTools → Application → Cache Storage)

#### Mobile Testing (iOS)

1. **Open Safari** on iPhone/iPad
2. **Navigate to**: http://your-server-ip:3000
3. **Tap Share button** → "Add to Home Screen"
4. **Verify**:
   - Icon appears on home screen
   - Opens in fullscreen (no browser UI)
   - Offline mode works

#### Mobile Testing (Android)

1. **Open Chrome** on Android
2. **Navigate to**: http://your-server-ip:3000
3. **Tap menu** → "Install app" or "Add to Home screen"
4. **Verify**:
   - Install prompt appears
   - App installs and opens
   - Offline mode works

**Expected Results**:
- ✅ Install prompt appears
- ✅ App installs successfully
- ✅ Offline mode functional
- ✅ Push notification permission request appears

---

### Step 9: Test Push Notifications (15 minutes)

**Test Notification Subscription**:

```javascript
// Open browser console on any page
// Test notification permission
if ('Notification' in window) {
  Notification.requestPermission().then(permission => {
    console.log('Notification permission:', permission);
  });
}

// Subscribe to push notifications
fetch('/api/notifications/subscribe', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  },
  body: JSON.stringify({
    subscription: {/* auto-generated */}
  })
})
.then(res => res.json())
.then(data => console.log('Subscribed:', data));
```

**Send Test Notification** (from server or API):

```bash
# Using curl
curl -X POST http://localhost:3000/api/notifications/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Test Notification",
    "body": "PWA notifications working!",
    "icon": "/icon-192x192.png"
  }'
```

**Expected**: Notification appears on device/desktop

---

### Step 10: Test Barcode Scanner (15 minutes)

1. **Open products page**: http://localhost:3000/products.html
2. **Click "Scan Barcode" button**
3. **Allow camera permission**
4. **Point at barcode**:
   - Test with real product barcode (UPC/EAN)
   - Test with QR code
   - Test with printed barcode from Google Images

**Expected Results**:
- ✅ Camera activates
- ✅ Barcode detected and decoded
- ✅ Product lookup works
- ✅ Manual entry fallback available

**Common Barcodes for Testing**:
- Coca-Cola: `049000042566`
- Test UPC: `012345678905`
- Generate QR code: https://www.qr-code-generator.com/

---

### Step 11: Test Mobile UI & Touch Gestures (20 minutes)

**Responsive Design Testing**:

1. **Desktop**: Open DevTools → Toggle device toolbar (Ctrl+Shift+M)
2. **Select device**: iPhone 12 Pro, Pixel 5, iPad
3. **Test each page**:
   - Dashboard
   - Products
   - Batches
   - Reports
   - Analytics

**Touch Gesture Testing**:

1. **Pull-to-refresh**: Swipe down from top
2. **Swipe navigation**: Swipe left/right on product cards
3. **Long-press**: Hold on product for quick actions
4. **Bottom navigation**: Tap navigation items
5. **FAB button**: Tap floating action button

**Expected Results**:
- ✅ Layouts responsive on all screen sizes
- ✅ Touch targets at least 44x44px
- ✅ Gestures work smoothly
- ✅ No horizontal scrolling
- ✅ Bottom navigation visible and functional

---

### Step 12: Test Offline Mode (15 minutes)

**Offline Testing Procedure**:

1. **Load app** with network connected
2. **Navigate** through several pages
3. **Disconnect network**:
   - Desktop: DevTools → Network → Offline
   - Mobile: Enable airplane mode
4. **Test functionality**:
   - View cached pages
   - View cached products
   - Add product (queued for sync)
   - Edit product (queued for sync)
5. **Reconnect network**
6. **Verify sync**: Changes should auto-sync

**Expected Results**:
- ✅ Pages load from cache when offline
- ✅ Offline indicator appears
- ✅ Data viewable from IndexedDB
- ✅ Changes queued for sync
- ✅ Auto-sync when back online
- ✅ Conflict resolution works

---

## 🔍 Verification Checklist

### Dependencies
- [ ] `web-push` installed (`npm list web-push`)
- [ ] All other dependencies up to date

### Configuration
- [ ] VAPID keys generated
- [ ] `.env` file updated with VAPID keys
- [ ] `manifest.json` accessible at `/manifest.json`
- [ ] Icons exist (192x192, 512x512)

### Database
- [ ] Migration 015 completed
- [ ] `push_subscriptions` table exists
- [ ] No migration errors

### Server
- [ ] Server starts without errors
- [ ] All routes registered
- [ ] No "Cannot find module" errors
- [ ] `/api/notifications` endpoint responds

### HTML Pages
- [ ] All 12+ pages updated with PWA manifest
- [ ] Mobile CSS linked on all pages
- [ ] PWA scripts included
- [ ] Service worker registration code added
- [ ] No console errors on page load

### PWA Features
- [ ] Service worker registered
- [ ] Cache strategies working
- [ ] Install prompt appears
- [ ] App installable on desktop
- [ ] App installable on iOS
- [ ] App installable on Android
- [ ] Offline mode functional
- [ ] Background sync working

### Push Notifications
- [ ] Permission request appears
- [ ] Subscription successful
- [ ] Test notification received
- [ ] Notification actions work
- [ ] Unsubscribe works

### Mobile UI
- [ ] Responsive on mobile devices
- [ ] Touch targets adequate size
- [ ] Bottom navigation appears
- [ ] FAB button functional
- [ ] No horizontal scroll
- [ ] Mobile-optimized tables

### Barcode Scanner
- [ ] Camera permission requested
- [ ] Scanner activates
- [ ] Barcodes detected
- [ ] QR codes detected
- [ ] Product lookup works
- [ ] Manual entry fallback available

### Touch Gestures
- [ ] Pull-to-refresh works
- [ ] Swipe gestures work
- [ ] Long-press actions work
- [ ] Touch feedback visible
- [ ] No gesture conflicts

### Offline Functionality
- [ ] Pages load when offline
- [ ] Offline indicator appears
- [ ] Data cached in IndexedDB
- [ ] Changes queued for sync
- [ ] Auto-sync when online
- [ ] Conflict resolution works

---

## 🐛 Troubleshooting

### Issue: "Cannot find module 'web-push'"

**Solution**:
```bash
npm install web-push
npm start
```

---

### Issue: "VAPID keys not configured"

**Solution**:
1. Generate keys: `node -e "console.log(require('web-push').generateVAPIDKeys())"`
2. Add to `.env`
3. Restart server

---

### Issue: Service Worker Not Registering

**Symptoms**: Console error "Service worker registration failed"

**Solutions**:
1. **Check HTTPS**: Service workers require HTTPS (except localhost)
2. **Check path**: Ensure `/sw.js` exists and is accessible
3. **Check console**: Look for detailed error messages
4. **Clear cache**: DevTools → Application → Clear storage
5. **Hard refresh**: Ctrl+Shift+R

---

### Issue: PWA Not Installable

**Symptoms**: No install prompt appears

**Requirements Check**:
1. ✅ Served over HTTPS (or localhost)
2. ✅ Valid `manifest.json` with required fields
3. ✅ Service worker registered
4. ✅ Icons specified (192x192, 512x512)
5. ✅ `start_url` points to valid page
6. ✅ `display: standalone` or `minimal-ui`

**Debug**:
```javascript
// Check manifest
fetch('/manifest.json')
  .then(r => r.json())
  .then(m => console.log('Manifest:', m));

// Check service worker
navigator.serviceWorker.getRegistrations()
  .then(regs => console.log('SW registered:', regs.length > 0));
```

---

### Issue: Camera Not Working

**Symptoms**: Black screen or permission denied

**Solutions**:
1. **Check HTTPS**: Camera requires HTTPS (except localhost)
2. **Grant permission**: Browser settings → Site permissions → Camera
3. **Check hardware**: Ensure camera exists and isn't in use
4. **Test permission**:
   ```javascript
   navigator.mediaDevices.getUserMedia({ video: true })
     .then(stream => console.log('Camera OK'))
     .catch(err => console.error('Camera error:', err));
   ```

---

### Issue: Notifications Not Working

**Symptoms**: No permission prompt or notifications not appearing

**Solutions**:
1. **Check HTTPS**: Notifications require HTTPS (except localhost)
2. **Check permission**: Browser settings → Notifications
3. **Reset permission**: DevTools → Application → Clear storage
4. **Test API**:
   ```javascript
   if ('Notification' in window) {
     console.log('Notifications supported');
     console.log('Permission:', Notification.permission);
   }
   ```
5. **Check VAPID keys**: Ensure they're properly set in `.env`

---

### Issue: Offline Mode Not Working

**Symptoms**: Pages don't load when offline

**Solutions**:
1. **Visit pages first**: Service worker caches pages on first visit
2. **Check cache**: DevTools → Application → Cache Storage
3. **Check SW**: DevTools → Application → Service Workers (should show "activated")
4. **Check strategy**: Verify cache-first strategy in `/sw.js`
5. **Clear and re-cache**:
   ```javascript
   navigator.serviceWorker.getRegistrations()
     .then(regs => regs.forEach(reg => reg.unregister()))
     .then(() => location.reload());
   ```

---

### Issue: Touch Gestures Not Responding

**Symptoms**: Swipe/pull gestures don't work

**Solutions**:
1. **Check mobile**: Gestures only work on touch devices or emulation
2. **Enable emulation**: DevTools → Device Toolbar → Touch
3. **Check initialization**: Verify `TouchGestures` class loaded
4. **Check conflicts**: Disable other touch handlers
5. **Test**:
   ```javascript
   if (typeof TouchGestures !== 'undefined') {
     console.log('Touch gestures loaded');
   } else {
     console.error('TouchGestures not found');
   }
   ```

---

### Issue: High Memory Usage

**Symptoms**: Browser slows down or crashes

**Solutions**:
1. **Clear old caches**: Old service worker caches may accumulate
2. **Reduce cache size**: Modify cache strategy in `/sw.js`
3. **Clear IndexedDB**: DevTools → Application → IndexedDB
4. **Limit offline data**: Reduce amount of data cached offline

---

## 📊 Testing Matrix

| Feature | Desktop Chrome | Desktop Firefox | Desktop Safari | iOS Safari | Android Chrome | Status |
|---------|---------------|-----------------|----------------|------------|----------------|---------|
| PWA Install | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | |
| Service Worker | ✅ | ✅ | ✅ | ✅ | ✅ | |
| Offline Mode | ✅ | ✅ | ✅ | ✅ | ✅ | |
| Push Notifications | ✅ | ✅ | ❌ | ❌ | ✅ | |
| Barcode Scanner | ✅ | ✅ | ✅ | ✅ | ✅ | |
| Touch Gestures | N/A | N/A | N/A | ✅ | ✅ | |
| Bottom Nav | ✅ | ✅ | ✅ | ✅ | ✅ | |
| Responsive UI | ✅ | ✅ | ✅ | ✅ | ✅ | |

**Legend**:
- ✅ Fully supported
- ⚠️ Partial support (iOS uses "Add to Home Screen")
- ❌ Not supported (iOS/Safari don't support Web Push API)
- N/A Not applicable

---

## 📝 Post-Integration Tasks

### Update Documentation

- [ ] Update `README.md` with PWA installation instructions
- [ ] Update `ROADMAP.md`: Sprint 6 → 100% complete
- [ ] Update `CHANGELOG.md` with Sprint 6 completion
- [ ] Create user guide for mobile features
- [ ] Document mobile-specific workflows

### Code Quality

- [ ] Run tests: `npm test`
- [ ] Check coverage: `npm run test:coverage`
- [ ] Fix any failing tests
- [ ] Add tests for new features (optional)

### Commit Changes

```bash
git add .
git commit -m "feat: Sprint 6 Integration Complete - PWA & Mobile Fully Operational

✅ VAPID keys configured
✅ Push notifications integrated
✅ All HTML pages updated
✅ Barcode scanner integrated
✅ Mobile UI fully responsive
✅ Touch gestures functional
✅ Offline mode tested
✅ PWA installable on all platforms

Sprint 6 Phase 3: COMPLETE!
Ready for Sprint 7: API & Integration"

git push origin beta
```

---

## ✅ Sprint 6 Completion Criteria

**All items must be checked before marking Sprint 6 complete**:

### Technical Requirements
- [ ] All dependencies installed
- [ ] Environment variables configured
- [ ] Database migration successful
- [ ] All routes registered and responding
- [ ] No server startup errors
- [ ] All HTML pages updated

### Functional Requirements
- [ ] PWA installable on desktop (Chrome/Edge)
- [ ] PWA installable on iOS (Safari)
- [ ] PWA installable on Android (Chrome)
- [ ] Offline mode functional
- [ ] Push notifications working (desktop/Android)
- [ ] Barcode scanner operational
- [ ] Touch gestures responsive
- [ ] Mobile UI fully responsive
- [ ] Bottom navigation functional

### Testing Requirements
- [ ] Tested on at least 3 browsers
- [ ] Tested on at least 2 mobile devices (or emulators)
- [ ] All critical bugs resolved
- [ ] Performance acceptable (<3s load on 3G)
- [ ] No console errors

### Documentation Requirements
- [ ] Integration guide complete (this file)
- [ ] User guide updated
- [ ] README updated
- [ ] ROADMAP updated
- [ ] CHANGELOG updated

---

## 🎉 Success!

**When all checkboxes are complete**:

1. ✅ Sprint 6 is 100% complete
2. 🚀 InvAI is now a fully functional PWA
3. 📱 Mobile experience is production-ready
4. 🎯 Ready to start Sprint 7: API & Integration

**Progress to v1.0.0**: 85% (6 of 7 sprints complete)

---

## 📞 Support

If you encounter issues not covered in this guide:

1. Check browser console for errors
2. Review server logs
3. Check DevTools → Application tab
4. Verify all prerequisites met
5. Try on different browser/device

---

**Last Updated**: January 25, 2026  
**Sprint**: 6 - Mobile & PWA  
**Phase**: 3 - Integration  
**Next**: Sprint 7 - API & Integration