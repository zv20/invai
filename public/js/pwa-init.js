/**
 * PWA Initialization
 * Registers service worker and handles PWA features
 */

(function() {
  'use strict';

  // Check if service workers are supported
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers not supported');
    return;
  }

  // Initialize offline storage
  let offlineStorage = null;
  if (typeof OfflineStorage !== 'undefined') {
    offlineStorage = new OfflineStorage();
    offlineStorage.init().catch(err => {
      console.error('Offline storage init failed:', err);
    });
  }

  // Register service worker
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('Service Worker registered:', registration.scope);

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('New service worker found');

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker available
            showUpdateNotification();
          }
        });
      });

      // Handle controller change (new SW activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('New service worker activated');
        window.location.reload();
      });

      // Listen for messages from SW
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('Message from SW:', event.data);
        
        if (event.data.type === 'SYNC_COMPLETE') {
          showNotification('Sync complete', 'Your offline changes have been synced');
        }
      });

    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  });

  // Online/Offline detection
  window.addEventListener('online', async () => {
    console.log('Back online');
    hideOfflineIndicator();
    showNotification('Back Online', 'Connection restored');

    // Process offline queue
    if (offlineStorage) {
      try {
        const results = await offlineStorage.processQueue();
        console.log('Queue processed:', results);
        
        const successCount = results.filter(r => r.success).length;
        if (successCount > 0) {
          showNotification('Synced', `${successCount} offline changes synced`);
        }
      } catch (error) {
        console.error('Queue processing failed:', error);
      }
    }

    // Request background sync
    if ('sync' in registration) {
      try {
        await registration.sync.register('sync-offline-data');
        console.log('Background sync registered');
      } catch (error) {
        console.error('Background sync registration failed:', error);
      }
    }
  });

  window.addEventListener('offline', () => {
    console.log('Gone offline');
    showOfflineIndicator();
    showNotification('Offline', 'You are now offline. Changes will be synced when connection is restored.');
  });

  // Show initial online status
  if (!navigator.onLine) {
    showOfflineIndicator();
  }

  /**
   * Show update notification
   */
  function showUpdateNotification() {
    const notification = document.createElement('div');
    notification.className = 'pwa-update-notification';
    notification.innerHTML = `
      <div style="background: #4CAF50; color: white; padding: 15px; position: fixed; top: 0; left: 0; right: 0; z-index: 10000; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
        <span>📦 New version available!</span>
        <button id="update-sw-btn" style="background: white; color: #4CAF50; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">Update Now</button>
      </div>
    `;
    document.body.appendChild(notification);

    document.getElementById('update-sw-btn').addEventListener('click', () => {
      // Tell SW to skip waiting
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
      notification.remove();
    });
  }

  /**
   * Show offline indicator
   */
  function showOfflineIndicator() {
    let indicator = document.getElementById('offline-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'offline-indicator';
      indicator.innerHTML = `
        <div style="background: #FF9800; color: white; padding: 8px 16px; position: fixed; bottom: 20px; right: 20px; z-index: 10000; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 10px;">
          <span>⚠️ Offline Mode</span>
        </div>
      `;
      document.body.appendChild(indicator);
    }
  }

  /**
   * Hide offline indicator
   */
  function hideOfflineIndicator() {
    const indicator = document.getElementById('offline-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  /**
   * Show toast notification
   */
  function showNotification(title, message) {
    const toast = document.createElement('div');
    toast.style.cssText = 'background: #333; color: white; padding: 16px 20px; position: fixed; bottom: 80px; right: 20px; z-index: 10000; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); max-width: 300px;';
    toast.innerHTML = `<strong>${title}</strong><br><small>${message}</small>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Export for global access
  window.PWA = {
    offlineStorage,
    showNotification,
    showOfflineIndicator,
    hideOfflineIndicator
  };

})();
