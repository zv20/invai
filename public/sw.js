/**
 * Service Worker for InvAI PWA
 * Handles caching, offline mode, and background sync
 * 
 * FIXED: Added /api/categories and /api/suppliers to network-first routes
 * FIXED PR #21: Updated cache list to match actual files (no phantom SPAs)
 */

const CACHE_VERSION = 'invai-v3'; // Increment to force cache refresh
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const MAX_DYNAMIC_CACHE_SIZE = 50;

// Assets to cache immediately - FIXED PR #21: Removed non-existent files
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/login.html',
  '/css/styles.css',
  '/css/inline-overrides.css',
  '/js/core.js',
  '/js/auth.js',
  '/js/dark-mode.js',
  '/js/pwa-init.js',
  '/offline.html'
];

// API routes that should use network-first (NEVER cache these)
const API_ROUTES = [
  '/api/products',
  '/api/batches',
  '/api/categories',     // ADDED - categories must fetch fresh data
  '/api/suppliers',      // ADDED - suppliers must fetch fresh data
  '/api/transactions',
  '/api/analytics',
  '/api/predictions',
  '/api/search',
  '/api/dashboards',
  '/api/users',
  '/api/auth',
  '/api/settings',
  '/api/backup',
  '/api/version',
  '/api/changelog',
  '/api/export',
  '/api/import'
];

/**
 * Install Event - Cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Installation complete');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

/**
 * Activate Event - Clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('invai-') && name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activation complete');
        return self.clients.claim(); // Take control immediately
      })
  );
});

/**
 * Fetch Event - Handle network requests
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests (network-first, NO CACHING for freshness)
  if (isApiRequest(url.pathname)) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Handle static assets (cache-first)
  event.respondWith(cacheFirstStrategy(request));
});

/**
 * Cache-First Strategy
 * Try cache first, fallback to network
 */
async function cacheFirstStrategy(request) {
  try {
    // Check cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Fetch from network
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      limitCacheSize(DYNAMIC_CACHE, MAX_DYNAMIC_CACHE_SIZE);
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache-first failed:', error);
    
    // Return offline page for HTML requests
    if (request.headers.get('accept').includes('text/html')) {
      const offlinePage = await caches.match('/offline.html');
      return offlinePage || new Response('Offline', { status: 503 });
    }

    return new Response('Network error', { status: 503 });
  }
}

/**
 * Network-First Strategy
 * Try network first, DON'T cache API responses (for data freshness)
 */
async function networkFirstStrategy(request) {
  try {
    // Always try network first for API calls
    const networkResponse = await fetch(request);
    
    // DO NOT CACHE API RESPONSES - we want fresh data every time
    // This ensures categories/suppliers/products always show latest data
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed for API call:', request.url);
    
    // Return error response for failed API calls
    return new Response(JSON.stringify({ 
      error: 'Offline', 
      offline: true,
      message: 'Cannot connect to server. Please check your internet connection.'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Check if request is an API call
 */
function isApiRequest(pathname) {
  return API_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Limit cache size by removing oldest entries
 */
async function limitCacheSize(cacheName, maxSize) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxSize) {
    // Delete oldest entries
    const deleteCount = keys.length - maxSize;
    for (let i = 0; i < deleteCount; i++) {
      await cache.delete(keys[i]);
    }
  }
}

/**
 * Background Sync Event
 * Sync offline data when connection is restored
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === 'sync-offline-data') {
    event.waitUntil(syncOfflineData());
  }
});

/**
 * Sync offline data to server
 */
async function syncOfflineData() {
  try {
    // This will be implemented with IndexedDB integration
    console.log('[SW] Syncing offline data...');
    
    // Notify all clients that sync is complete
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ type: 'SYNC_COMPLETE' });
    });
    
    return Promise.resolve();
  } catch (error) {
    console.error('[SW] Sync failed:', error);
    return Promise.reject(error);
  }
}

/**
 * Push Notification Event
 */
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'InvAI Notification';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    data: data.url || '/',
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'close', title: 'Close' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

/**
 * Notification Click Event
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow(event.notification.data)
    );
  }
});

/**
 * Message Event - Communication with clients
 */
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(name => caches.delete(name))
        );
      })
    );
  }
});