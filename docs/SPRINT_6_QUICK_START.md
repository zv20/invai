# Sprint 6 Quick Start Guide - Mobile & PWA Integration

**InvAI v0.10.0-beta → v0.11.0-beta**  
**Date**: January 25, 2026  
**Status**: Sprint 6 - 80% Complete (Integration Phase)

---

## 🎯 Overview

Sprint 6 has created all the mobile and PWA features. Now we need to **integrate** them into the existing application and **test** on real devices.

### What's Been Built (Phases 1 & 2):

✅ **Phase 1: PWA Core**
- Service worker with caching strategies
- App manifest for installation
- Offline storage (IndexedDB)
- Push notifications system
- Background sync
- Migration 015 (push_subscriptions table)

✅ **Phase 2: Mobile UI**
- Mobile-first CSS
- Touch gestures (swipe, pull-to-refresh, long-press)
- Mobile components (FAB, bottom sheets)
- Bottom navigation
- Barcode scanner (camera-based)
- Camera integration

### What's Next (Phases 3 & 4):

📋 **Phase 3: Integration** (THIS GUIDE - 2-3 hours)
- Install dependencies
- Configure environment
- Update HTML pages
- Run database migration
- Test locally

📋 **Phase 4: Device Testing** (1-2 hours)
- Test on iOS devices
- Test on Android devices
- Test PWA installation
- Test offline mode
- Test push notifications

---

## 📦 Step 1: Install Dependencies (5 minutes)

### Install web-push Package

```bash
cd /path/to/invai
npm install web-push
```

**Why?** Required for push notifications in PWA.

---

## 🔐 Step 2: Generate VAPID Keys (5 minutes)

### Option A: Use the Generator Script (Recommended)

```bash
node scripts/generate-vapid-keys.js
```

This will display your keys. Copy them for the next step.

### Option B: Manual Generation

```bash
node -e "console.log(require('web-push').generateVAPIDKeys())"
```

### Expected Output:

```javascript
{
  publicKey: 'BL7ELm5p7...',  // ~88 characters
  privateKey: 'cdL4SD8F3...'  // ~44 characters
}
```

---

## ⚙️ Step 3: Configure Environment (5 minutes)

### Update Your .env File

Open `.env` and add/update these lines:

```bash
# ==================================================
# PWA & PUSH NOTIFICATIONS (Sprint 6)
# ==================================================

# VAPID Keys (from Step 2)
VAPID_PUBLIC_KEY=BL7ELm5p7...   # Your public key here
VAPID_PRIVATE_KEY=cdL4SD8F3...  # Your private key here
VAPID_SUBJECT=mailto:your-email@example.com  # Your email

# PWA Settings
PWA_ENABLED=true
PWA_CACHE_VERSION=v1
PWA_OFFLINE_MODE=true

# Push Notifications
PUSH_NOTIFICATIONS_ENABLED=true
PUSH_NOTIFICATION_TTL=2419200

# Mobile Features
BARCODE_SCANNER_ENABLED=true
CAMERA_MAX_RESOLUTION=1920x1080
CAMERA_COMPRESSION_QUALITY=0.8
```

**Important**: Replace `your-email@example.com` with your actual email!

---

## 🗄️ Step 4: Run Database Migration (2 minutes)

### Run Migration 015

This creates the `push_subscriptions` table:

```bash
node scripts/run-migration.js 015
```

### Expected Output:

```
✅ Migration 015 applied successfully
✓ Created push_subscriptions table
```

### Verify Migration:

```bash
node -e "require('./lib/database').getDatabase().then(db => db.query('SELECT * FROM migrations WHERE version = 15', []).then(r => console.log(r)))"
```

---

## 🔄 Step 5: Server Integration (Already Done!)

✅ **server.js** has been updated with:
- Notifications route: `/api/notifications`
- Sprint 5 BI routes: analytics, predictions, search, dashboards
- All routes registered with proper authentication

You can verify by checking:

```bash
grep "notificationsRoutes" server.js
grep "app.use('/api/notifications'" server.js
```

---

## 📄 Step 6: Update HTML Pages (30-60 minutes)

Now we need to add PWA and mobile scripts to all HTML pages.

### Files to Update:

All HTML files in `public/` directory need these additions:

1. `index.html` (Login page)
2. `dashboard.html` (Main dashboard)
3. `products.html` (Product list)
4. `batches.html` (Batch management)
5. `categories.html` (Category management)
6. `suppliers.html` (Supplier management)
7. `reports.html` (Reports page)
8. `settings.html` (Settings page)
9. `users.html` (User management)
10. `analytics.html` (Analytics dashboard - Sprint 5)
11. `predictions.html` (Predictions page - Sprint 5)
12. `advanced-search.html` (Search page - Sprint 5)
13. `dashboard-builder.html` (Dashboard builder - Sprint 5)

### What to Add to Each HTML File:

#### A. In the `<head>` section (after existing CSS):

```html
<!-- PWA Manifest -->
<link rel="manifest" href="/manifest.json">

<!-- Mobile Optimizations -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="InvAI">

<!-- Theme Colors -->
<meta name="theme-color" content="#1a1a2e">
<meta name="msapplication-navbutton-color" content="#1a1a2e">

<!-- Apple Touch Icons -->
<link rel="apple-touch-icon" href="/icons/icon-192x192.png">
<link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png">
<link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180x180.png">
<link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-167x167.png">

<!-- Mobile CSS -->
<link rel="stylesheet" href="/css/mobile.css">
```

#### B. At the end of `<body>` (before closing `</body>` tag):

```html
<!-- PWA Scripts -->
<script src="/lib/pwa/offlineStorage.js"></script>
<script src="/js/pwa-init.js"></script>
<script src="/js/pwa-install.js"></script>

<!-- Mobile Scripts -->
<script src="/js/touch-gestures.js"></script>
<script src="/js/mobile-components.js"></script>
<script src="/js/mobile-navigation.js"></script>

<!-- Mobile Features (add only to relevant pages) -->
<!-- Barcode Scanner: products.html, batches.html, advanced-search.html -->
<script src="/js/barcode-scanner.js"></script>

<!-- Camera Capture: products.html -->
<script src="/js/camera-capture.js"></script>
```

### Example: Updated dashboard.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - InvAI</title>
    
    <!-- Existing CSS -->
    <link rel="stylesheet" href="/css/styles.css">
    <link rel="stylesheet" href="/css/dashboard.css">
    
    <!-- PWA Manifest -->
    <link rel="manifest" href="/manifest.json">
    
    <!-- Mobile Optimizations -->
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="InvAI">
    <meta name="theme-color" content="#1a1a2e">
    
    <!-- Apple Touch Icons -->
    <link rel="apple-touch-icon" href="/icons/icon-192x192.png">
    
    <!-- Mobile CSS -->
    <link rel="stylesheet" href="/css/mobile.css">
</head>
<body>
    <!-- Your existing dashboard content -->
    
    <!-- Existing scripts -->
    <script src="/js/dashboard.js"></script>
    
    <!-- PWA Scripts -->
    <script src="/lib/pwa/offlineStorage.js"></script>
    <script src="/js/pwa-init.js"></script>
    <script src="/js/pwa-install.js"></script>
    
    <!-- Mobile Scripts -->
    <script src="/js/touch-gestures.js"></script>
    <script src="/js/mobile-components.js"></script>
    <script src="/js/mobile-navigation.js"></script>
</body>
</html>
```

### Quick Update Script (Optional)

Create `scripts/update-html-pwa.sh`:

```bash
#!/bin/bash
# Quick script to add PWA meta tags to all HTML files

echo "Adding PWA support to HTML files..."

# This is a template - customize for each file
for file in public/*.html; do
    echo "Updating $file"
    # Add your sed/awk commands here to insert the PWA tags
done

echo "Done! Review changes with: git diff"
```

---

## 🧪 Step 7: Test Locally (15 minutes)

### Start the Server

```bash
npm start
```

### Expected Console Output:

```
🚀 InvAI v0.10.0-beta - Sprint 6: Mobile & PWA
✅ Progressive Web App (PWA) support
✅ Push notifications enabled
✅ Mobile-optimized UI
✅ Offline mode with IndexedDB
✅ Barcode scanner ready
✅ Sprint 5 BI features (analytics, predictions, search, dashboards)
✅ Database adapter system active
✅ JWT authentication enabled
✅ Security headers active (Helmet.js)
✅ CSRF protection enabled
📊 Database: SQLITE

🔌 Connecting to database...
✓ Connected to SQLITE database
✓ Activity logger and CSV exporter initialized
✓ Account lockout cleanup scheduler started
✓ All routes registered
  - Core: products, batches, categories, suppliers, dashboard
  - Sprint 5 BI: analytics, predictions, search, dashboards
  - Sprint 6 Mobile: notifications, PWA
  - System: auth, users, reports, backups, import/export

🎉 InvAI v0.10.0-beta - Sprint 6: Mobile & PWA
💻 Server running on port 3000
🔗 Access at http://localhost:3000

💾 Database: SQLITE
🔒 Auth: JWT tokens with role-based access
📱 PWA: Enabled
🔔 Push Notifications: Enabled
💡 Update channel: beta
```

### Test Checklist:

1. **PWA Manifest**: Visit http://localhost:3000/manifest.json
   - Should return JSON with app metadata

2. **Service Worker**: Open DevTools → Application → Service Workers
   - Should show registered service worker

3. **Offline Storage**: Open DevTools → Application → IndexedDB
   - Should show `invai-offline` database

4. **Install Prompt**: Visit any page
   - Should see install banner (if supported)

5. **Mobile UI**: Resize browser to mobile width (375px)
   - Should see mobile-optimized layout
   - Bottom navigation should appear

6. **Touch Gestures**: On touch device or emulator
   - Test pull-to-refresh
   - Test swipe gestures

7. **Notifications API**: Test endpoint
   ```bash
   curl -X GET http://localhost:3000/api/notifications/vapid-public-key \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

---

## 📱 Step 8: Device Testing (Phase 4)

### iOS Testing (Safari)

1. **Access from iPhone/iPad**:
   - Use ngrok or similar: `ngrok http 3000`
   - Or deploy to test server with HTTPS
   - Visit the URL in Safari

2. **Install PWA**:
   - Tap Share button
   - Tap "Add to Home Screen"
   - App should install with icon

3. **Test Features**:
   - ✅ Offline mode (enable Airplane mode)
   - ✅ Camera access (barcode scanner)
   - ✅ Touch gestures
   - ✅ Mobile navigation
   - ⚠️ Push notifications (limited on iOS)

### Android Testing (Chrome)

1. **Access from Android Device**:
   - Use same ngrok/test server URL
   - Visit in Chrome

2. **Install PWA**:
   - Chrome should show "Add to Home Screen" banner
   - Or use menu → "Install App"

3. **Test Features**:
   - ✅ Offline mode
   - ✅ Push notifications
   - ✅ Camera/barcode scanner
   - ✅ Touch gestures
   - ✅ Background sync

### Desktop PWA Testing

1. **Chrome/Edge** (Chromium-based):
   - Visit http://localhost:3000
   - Click install icon in address bar
   - Test desktop PWA

2. **Firefox**:
   - Limited PWA support
   - Service worker and offline mode work
   - No install prompt

---

## 🐛 Troubleshooting

### Issue: "web-push not found"

**Solution**:
```bash
npm install web-push
```

### Issue: "VAPID keys invalid"

**Solution**:
- Regenerate keys: `node scripts/generate-vapid-keys.js`
- Ensure no extra spaces in .env
- Keys should be on single lines

### Issue: "Migration 015 already applied"

**Solution**: This is fine! Migration already ran.

### Issue: "Service worker not registering"

**Solutions**:
1. Check console for errors
2. Ensure HTTPS (or localhost)
3. Clear browser cache
4. Check `/sw.js` exists and loads

### Issue: "Manifest not loading"

**Solutions**:
1. Verify `/manifest.json` exists
2. Check Content-Type is `application/json`
3. Validate manifest: https://manifest-validator.appspot.com/

### Issue: "Push notifications not working"

**Solutions**:
1. Verify VAPID keys in .env
2. Check browser permissions
3. Test on HTTPS (required for push)
4. iOS has limited support

### Issue: "Camera not accessible"

**Solutions**:
1. Must use HTTPS (except localhost)
2. Check browser permissions
3. Grant camera access in browser
4. Test on actual device (not simulator)

---

## ✅ Completion Checklist

### Integration (Phase 3):
- [ ] web-push installed
- [ ] VAPID keys generated
- [ ] .env configured
- [ ] Migration 015 applied
- [ ] server.js routes verified
- [ ] All HTML files updated (13 files)
- [ ] Local testing passed

### Device Testing (Phase 4):
- [ ] iOS Safari tested
- [ ] Android Chrome tested
- [ ] PWA installation tested
- [ ] Offline mode tested
- [ ] Push notifications tested
- [ ] Barcode scanner tested
- [ ] Camera capture tested
- [ ] Touch gestures tested
- [ ] Mobile navigation tested

### Documentation:
- [ ] ROADMAP.md updated (Sprint 6 → 100%)
- [ ] CHANGELOG.md updated
- [ ] Any bugs documented
- [ ] Screenshots captured

---

## 🎉 Sprint 6 Completion

When all checklist items are complete:

1. **Update ROADMAP.md**:
   - Change Sprint 6 status to ✅ Complete
   - Update progress to 85% (6/7 sprints)

2. **Create Git Tag**:
   ```bash
   git tag -a v0.11.0-beta -m "Sprint 6 Complete: Mobile & PWA"
   git push origin v0.11.0-beta
   ```

3. **Update package.json**:
   ```json
   "version": "0.11.0-beta"
   ```

4. **Commit Changes**:
   ```bash
   git add .
   git commit -m "feat: Sprint 6 Complete - Mobile & PWA fully integrated and tested"
   git push origin beta
   ```

5. **Move to Sprint 7**: API & Integration (Final sprint!)

---

## 📚 Additional Resources

- **PWA Docs**: `/docs/PWA_SETUP.md`
- **Mobile Guide**: `/docs/MOBILE_GUIDE.md`
- **Service Worker**: `/public/sw.js`
- **Manifest**: `/public/manifest.json`

---

## 🆘 Need Help?

If you encounter issues:

1. Check server console logs
2. Check browser DevTools console
3. Review `/logs/error-*.log` files
4. Test in incognito/private mode
5. Clear all caches and try again

---

**Good luck with integration! 🚀**

**Next**: Once Sprint 6 is complete, move to Sprint 7 (API & Integration) for the final push to v1.0.0!