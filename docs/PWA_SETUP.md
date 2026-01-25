# Progressive Web App (PWA) Setup Guide

## Overview

InvAI is now a fully functional Progressive Web App (PWA) that can be installed on devices and works offline.

## Features

### ✅ Installable
- Install on desktop (Chrome, Edge, Safari 16.4+)
- Install on mobile (iOS 16.4+, Android)
- Standalone app experience
- Home screen icon
- Splash screen

### ✅ Offline Mode
- Service worker caching
- IndexedDB for offline storage
- Offline queue for API calls
- Automatic sync when online
- Offline fallback page

### ✅ Push Notifications
- Real-time notifications
- Low stock alerts
- Expiration warnings
- Custom notifications
- Background notifications

### ✅ Background Sync
- Sync offline changes
- Queue API calls
- Automatic retry
- Conflict resolution

---

## Installation

### Desktop (Chrome/Edge)

1. Open InvAI in Chrome or Edge
2. Look for the install icon (⊕) in the address bar
3. Click "Install" button
4. Or use the custom install banner that appears

**Manual Install:**
- Chrome: Menu → Install InvAI
- Edge: Menu → Apps → Install InvAI

### Mobile (Android)

1. Open InvAI in Chrome
2. Tap the menu (⋮)
3. Select "Add to Home screen"
4. Confirm installation

### Mobile (iOS)

1. Open InvAI in Safari
2. Tap the Share button (⎘)
3. Scroll down and tap "Add to Home Screen"
4. Confirm installation

---

## Push Notifications Setup

### 1. Generate VAPID Keys

Run this once to generate VAPID keys:

```bash
node -e "console.log(require('web-push').generateVAPIDKeys())"
```

### 2. Add to Environment

Add the generated keys to `.env`:

```bash
# Push Notifications (VAPID)
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_SUBJECT=mailto:admin@yourdomain.com
```

### 3. Install Dependencies

```bash
npm install web-push
```

### 4. Run Migration

```bash
node scripts/run-migration.js 015
```

### 5. Enable in UI

Users can enable notifications from:
- Settings page
- Notification prompt on first visit
- Browser permissions

---

## Offline Mode

### How It Works

1. **First Visit**: Assets are cached
2. **Offline Access**: Cached pages load instantly
3. **Offline Actions**: Queued for sync
4. **Back Online**: Automatic sync

### Cached Assets

- HTML pages (dashboard, products, etc.)
- CSS stylesheets
- JavaScript files
- API responses (temporary)

### Offline Queue

When offline, these actions are queued:
- Add/update products
- Record transactions
- Adjust stock levels
- Save changes

Queue is automatically processed when connection is restored.

### Offline Storage

**IndexedDB Stores:**
- `products` - Cached product data
- `transactions` - Recent transactions
- `offlineQueue` - Pending API calls
- `syncMeta` - Sync metadata

**Storage Limits:**
- Desktop: ~10GB
- Mobile Safari: ~50MB
- Mobile Chrome: ~60% of free space

---

## Service Worker

### Cache Strategy

**Static Assets** (Cache-First):
- HTML, CSS, JavaScript
- Images, icons
- Fonts

Falls back to network if not cached.

**API Calls** (Network-First):
- Product data
- Transactions
- Analytics

Falls back to cache if offline.

### Cache Management

**Automatic:**
- Old caches deleted on update
- Dynamic cache limited to 50 items
- Cache versioned (v1, v2, etc.)

**Manual:**
```javascript
// Clear all caches
navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
```

### Update Handling

When a new service worker is available:
1. User sees update notification
2. Click "Update Now" to refresh
3. New version loads automatically

---

## Background Sync

### Automatic Sync

Triggered when:
- Connection restored (offline → online)
- App reopens
- Manual sync requested

### Sync Events

```javascript
// Listen for sync completion
navigator.serviceWorker.addEventListener('message', (event) => {
  if (event.data.type === 'SYNC_COMPLETE') {
    console.log('Offline data synced!');
  }
});
```

---

## Testing

### Test Offline Mode

**Chrome DevTools:**
1. Open DevTools (F12)
2. Go to Network tab
3. Select "Offline" from dropdown
4. Reload page

**Browser Settings:**
- Enable Airplane Mode
- Disconnect WiFi
- Unplug ethernet

### Test Installation

**Chrome DevTools:**
1. Open DevTools (F12)
2. Go to Application tab
3. Click "Manifest" to see app manifest
4. Click "Service Workers" to see SW status
5. Use "Add to home screen" link

### Test Push Notifications

1. Enable notifications in UI
2. Use test endpoint:

```bash
curl -X POST http://localhost:3000/api/notifications/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Troubleshooting

### Service Worker Not Registering

**Check:**
- HTTPS enabled (required for SW)
- Browser supports service workers
- No console errors
- Correct SW path (`/sw.js`)

**Fix:**
```javascript
// Unregister old SW
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(r => r.unregister());
});
```

### App Not Installing

**Requirements:**
- HTTPS (or localhost)
- Valid manifest.json
- Service worker registered
- Icons present (192x192, 512x512)
- Not already installed

### Offline Mode Not Working

**Check:**
- Service worker active
- Assets cached (DevTools → Application → Cache Storage)
- IndexedDB initialized
- No blocking errors

**Clear and reset:**
```javascript
// Clear all data
indexedDB.deleteDatabase('InvAI');
caches.keys().then(names => names.forEach(name => caches.delete(name)));
```

### Push Notifications Not Working

**Check:**
- VAPID keys configured
- User granted permission
- Subscription saved in database
- web-push installed
- No firewall blocking

**Test subscription:**
```bash
node -e "console.log(require('web-push').generateVAPIDKeys())"
```

---

## Production Deployment

### Requirements

1. **HTTPS Required**
   - Service workers only work over HTTPS
   - Or localhost for development

2. **Icons Needed**
   - 192x192px PNG
   - 512x512px PNG
   - Optional: 72, 96, 128, 144, 152, 384px

3. **Environment Variables**
   ```bash
   VAPID_PUBLIC_KEY=...
   VAPID_PRIVATE_KEY=...
   VAPID_SUBJECT=mailto:admin@yourdomain.com
   ```

4. **Web Server Config**
   - Serve manifest.json with `application/manifest+json`
   - Serve sw.js with `text/javascript`
   - Cache headers for static assets

### Nginx Example

```nginx
location /manifest.json {
  add_header Content-Type application/manifest+json;
  add_header Cache-Control "public, max-age=86400";
}

location /sw.js {
  add_header Content-Type text/javascript;
  add_header Cache-Control "public, max-age=0";
}
```

---

## API Reference

### Offline Storage

```javascript
const storage = new OfflineStorage();
await storage.init();

// Cache products
await storage.cacheProducts(products);

// Get cached products
const cached = await storage.getCachedProducts();

// Queue offline request
await storage.queueRequest('create', 'POST', '/api/products', data);

// Process queue
await storage.processQueue();
```

### Push Notifications

**Subscribe:**
```javascript
const registration = await navigator.serviceWorker.ready;
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
});

// Save subscription
await fetch('/api/notifications/subscribe', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ subscription })
});
```

**Send Notification (Server):**
```javascript
const manager = new PushNotificationManager(db);
await manager.sendToUser(userId, {
  title: 'Low Stock Alert',
  body: 'Product X is running low',
  url: '/products.html'
});
```

---

## Best Practices

### 1. Cache Strategy
- Cache static assets aggressively
- Use network-first for dynamic data
- Limit dynamic cache size
- Version caches for updates

### 2. Offline Queue
- Queue all mutations when offline
- Implement conflict resolution
- Show offline indicator to users
- Retry failed requests

### 3. Push Notifications
- Request permission at appropriate time
- Make notifications actionable
- Don't spam users
- Allow easy opt-out

### 4. Updates
- Prompt users for updates
- Don't force immediate reload
- Show what's new
- Test update flow

---

## Resources

- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)

---

**Last Updated**: January 25, 2026  
**Sprint 6 Phase 1**: PWA Setup Complete ✅
