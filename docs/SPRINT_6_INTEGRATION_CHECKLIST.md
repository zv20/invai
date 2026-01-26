# Sprint 6 Integration Checklist

**InvAI v0.10.0-beta → v0.11.0-beta**  
**Last Updated**: January 25, 2026  
**Sprint Progress**: 80% Complete

---

## 🎯 Quick Status

- ✅ Phase 1: PWA Core (Complete)
- ✅ Phase 2: Mobile UI (Complete)
- 📋 Phase 3: Integration (This Checklist - 20% remaining)
- 📋 Phase 4: Device Testing (Not started)

---

## Phase 3: Integration Tasks

### 1. Dependencies ✅

- [ ] Install web-push: `npm install web-push`
- [ ] Verify installation: `npm list web-push`

**Verification**:
```bash
npm list web-push
# Should show: web-push@3.x.x
```

---

### 2. VAPID Key Configuration ✅

- [ ] Generate VAPID keys: `node scripts/generate-vapid-keys.js`
- [ ] Copy keys to safe location (DO NOT commit private key)
- [ ] Open `.env` file
- [ ] Add/update VAPID_PUBLIC_KEY
- [ ] Add/update VAPID_PRIVATE_KEY  
- [ ] Update VAPID_SUBJECT with your email
- [ ] Set PWA_ENABLED=true
- [ ] Set PUSH_NOTIFICATIONS_ENABLED=true
- [ ] Save .env file

**Verification**:
```bash
grep "VAPID_PUBLIC_KEY=B" .env && echo "✓ VAPID keys configured"
```

---

### 3. Database Migration ✅

- [ ] Run migration 015: `node scripts/run-migration.js 015`
- [ ] Verify push_subscriptions table created
- [ ] Check migration logs for errors

**Verification**:
```bash
node -e "require('./lib/database').getDatabase().then(db => db.query('SELECT * FROM migrations WHERE version = 15', [])).then(r => console.log('Migration 015:', r.rows ? '✓ Applied' : '✗ Not found'))"
```

---

### 4. Server Configuration ✅

- [x] server.js updated with notifications route (Already done!)
- [x] Sprint 5 routes integrated (Already done!)
- [ ] Restart server to apply changes
- [ ] Check server console for PWA status
- [ ] Verify all routes registered

**Verification**:
```bash
# Start server and check console output
npm start

# Should see:
# ✅ Progressive Web App (PWA) support
# ✅ Push notifications enabled
# ✅ Sprint 6 Mobile: notifications, PWA
```

---

### 5. HTML Integration (13 files) 📄

#### Priority 1: Core Pages (Must update)

- [ ] **index.html** (Login)
  - [ ] Add PWA manifest link
  - [ ] Add mobile meta tags
  - [ ] Add mobile CSS
  - [ ] Add PWA scripts
  - [ ] Test: Login page responsive

- [ ] **dashboard.html** (Main dashboard)
  - [ ] Add PWA manifest link
  - [ ] Add mobile meta tags  
  - [ ] Add mobile CSS
  - [ ] Add PWA scripts
  - [ ] Add mobile navigation
  - [ ] Test: Dashboard on mobile

- [ ] **products.html** (Product management)
  - [ ] Add PWA manifest link
  - [ ] Add mobile meta tags
  - [ ] Add mobile CSS
  - [ ] Add PWA scripts
  - [ ] Add barcode scanner script
  - [ ] Add camera capture script
  - [ ] Add mobile navigation
  - [ ] Test: Barcode scanning

- [ ] **batches.html** (Batch management)
  - [ ] Add PWA manifest link
  - [ ] Add mobile meta tags
  - [ ] Add mobile CSS
  - [ ] Add PWA scripts
  - [ ] Add barcode scanner script
  - [ ] Add mobile navigation
  - [ ] Test: Batch scanning

#### Priority 2: Supporting Pages

- [ ] **categories.html**
  - [ ] Add PWA tags and scripts
  - [ ] Add mobile navigation

- [ ] **suppliers.html**
  - [ ] Add PWA tags and scripts
  - [ ] Add mobile navigation

- [ ] **reports.html**
  - [ ] Add PWA tags and scripts
  - [ ] Add mobile navigation

- [ ] **settings.html**
  - [ ] Add PWA tags and scripts
  - [ ] Add mobile navigation

- [ ] **users.html**
  - [ ] Add PWA tags and scripts
  - [ ] Add mobile navigation

#### Priority 3: Sprint 5 BI Pages

- [ ] **analytics.html**
  - [ ] Add PWA tags and scripts
  - [ ] Add mobile navigation
  - [ ] Test: Charts on mobile

- [ ] **predictions.html**
  - [ ] Add PWA tags and scripts
  - [ ] Add mobile navigation
  - [ ] Test: Predictions on mobile

- [ ] **advanced-search.html**
  - [ ] Add PWA tags and scripts
  - [ ] Add barcode scanner script
  - [ ] Add mobile navigation
  - [ ] Test: Search with scanner

- [ ] **dashboard-builder.html**
  - [ ] Add PWA tags and scripts
  - [ ] Add mobile navigation
  - [ ] Test: Dashboard builder on mobile

#### HTML Integration Template

Use this template for each HTML file:

```html
<!-- In <head> section, after existing CSS -->
<link rel="manifest" href="/manifest.json">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="#1a1a2e">
<link rel="apple-touch-icon" href="/icons/icon-192x192.png">
<link rel="stylesheet" href="/css/mobile.css">

<!-- Before </body> tag, after existing scripts -->
<script src="/lib/pwa/offlineStorage.js"></script>
<script src="/js/pwa-init.js"></script>
<script src="/js/pwa-install.js"></script>
<script src="/js/touch-gestures.js"></script>
<script src="/js/mobile-components.js"></script>
<script src="/js/mobile-navigation.js"></script>

<!-- Optional: For products.html, batches.html, advanced-search.html -->
<script src="/js/barcode-scanner.js"></script>

<!-- Optional: For products.html only -->
<script src="/js/camera-capture.js"></script>
```

---

### 6. Local Testing 🧪

#### Basic Functionality

- [ ] Server starts without errors
- [ ] No console errors in browser
- [ ] All pages load correctly
- [ ] Login works
- [ ] Navigation works

#### PWA Features

- [ ] Manifest loads: Visit `/manifest.json`
- [ ] Service worker registers (DevTools → Application → Service Workers)
- [ ] IndexedDB created (DevTools → Application → IndexedDB → invai-offline)
- [ ] Install prompt appears (if supported)
- [ ] Offline page accessible: `/offline.html`

#### Mobile Features (Desktop Browser)

- [ ] Resize browser to 375px width
- [ ] Mobile CSS applies correctly
- [ ] Bottom navigation appears
- [ ] Touch zones appropriate size
- [ ] Mobile-optimized tables/cards display

#### API Endpoints

- [ ] Test VAPID endpoint:
  ```bash
  curl http://localhost:3000/api/notifications/vapid-public-key \
    -H "Authorization: Bearer YOUR_TOKEN"
  ```

- [ ] Test subscribe endpoint:
  ```bash
  curl -X POST http://localhost:3000/api/notifications/subscribe \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"subscription":{"endpoint":"https://test"}}'
  ```

---

## Phase 4: Device Testing 📱

### iOS Testing (Safari)

- [ ] Setup remote access (ngrok/test server with HTTPS)
- [ ] Access from iPhone/iPad
- [ ] Install PWA (Share → Add to Home Screen)
- [ ] Test offline mode (Airplane mode)
- [ ] Test camera access
- [ ] Test touch gestures
- [ ] Test mobile navigation
- [ ] Test all core features
- [ ] Document any iOS-specific issues

**Note**: Push notifications limited on iOS Safari

### Android Testing (Chrome)

- [ ] Setup remote access (same as iOS)
- [ ] Access from Android device
- [ ] Install PWA (banner or menu → Install App)
- [ ] Test offline mode
- [ ] Test push notifications
- [ ] Test camera/barcode scanner
- [ ] Test touch gestures
- [ ] Test mobile navigation
- [ ] Test background sync
- [ ] Test all core features
- [ ] Document any Android-specific issues

### Desktop PWA Testing

- [ ] Test in Chrome (install PWA)
- [ ] Test in Edge (install PWA)
- [ ] Test in Firefox (service worker only)
- [ ] Test offline mode
- [ ] Test all features

### Performance Testing

- [ ] Lighthouse audit (aim for >90 on all metrics)
- [ ] Test on 3G network (DevTools throttling)
- [ ] Test with large datasets
- [ ] Test cache effectiveness
- [ ] Measure load times

---

## 📊 Progress Tracking

### Phase 3: Integration
- Dependencies: ⬜ 0/2
- VAPID Config: ⬜ 0/9
- Migration: ⬜ 0/3
- Server: ⬜ 0/4
- HTML Files: ⬜ 0/13
- Local Testing: ⬜ 0/15

**Total Phase 3**: ⬜ 0/46 (0%)

### Phase 4: Device Testing
- iOS: ⬜ 0/9
- Android: ⬜ 0/10
- Desktop: ⬜ 0/5
- Performance: ⬜ 0/5

**Total Phase 4**: ⬜ 0/29 (0%)

### Overall Sprint 6
- Phase 1 (PWA): ✅ 100%
- Phase 2 (Mobile): ✅ 100%
- Phase 3 (Integration): ⬜ 0%
- Phase 4 (Testing): ⬜ 0%

**Sprint 6 Total**: 🟨 50/75 tasks (67%)

---

## 🐛 Known Issues

### To Document:

1. Issue:
   - Description:
   - Platform:
   - Workaround:
   - Status:

2. Issue:
   - Description:
   - Platform:
   - Workaround:
   - Status:

---

## ✅ Completion Criteria

### Phase 3: Integration Complete When:
- [ ] All dependencies installed
- [ ] VAPID keys configured
- [ ] Migration 015 applied
- [ ] All 13 HTML files updated
- [ ] Local testing passed
- [ ] No console errors

### Phase 4: Testing Complete When:
- [ ] iOS testing passed
- [ ] Android testing passed
- [ ] Desktop testing passed
- [ ] Performance benchmarks met
- [ ] All issues documented

### Sprint 6: Complete When:
- [ ] Phase 3 complete
- [ ] Phase 4 complete
- [ ] ROADMAP.md updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped to v0.11.0-beta
- [ ] Git tag created
- [ ] Committed to beta branch

---

## 🚀 Next Steps

After Sprint 6 completion:

1. **Sprint 7**: API & Integration (Final sprint!)
   - Public REST API
   - Third-party integrations
   - Developer tools
   - Webhooks

2. **v1.0.0**: Production Release
   - Final testing
   - Documentation
   - Deployment
   - Launch! 🎉

---

**Keep this checklist updated as you progress!**

**Mark items with**:
- ✅ Complete
- 🚧 In progress
- ⬜ Not started
- ⚠️ Blocked/Issue

**Estimated Time**: 3-5 hours total (Phase 3: 2-3 hours, Phase 4: 1-2 hours)