// Low Stock Notification System
let notificationPermission = 'default';
let lastNotificationCheck = Date.now();
const NOTIFICATION_INTERVAL = 5 * 60 * 1000; // 5 minutes
const LOW_STOCK_THRESHOLD = 10;

async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('Browser does not support notifications');
    return false;
  }
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    notificationPermission = await Notification.requestPermission();
    return notificationPermission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

async function checkLowStockAlerts() {
  const now = Date.now();
  if (now - lastNotificationCheck < NOTIFICATION_INTERVAL) return;
  lastNotificationCheck = now;
  if (Notification.permission !== 'granted') return;
  try {
    const response = await fetch(`${API_URL}/alerts/low-stock?threshold=${LOW_STOCK_THRESHOLD}`);
    if (!response.ok) throw new Error('Failed to fetch alerts');
    const lowStockItems = await response.json();
    if (lowStockItems.length > 0) {
      const criticalItems = lowStockItems.filter(item => item.total_quantity < 5);
      if (criticalItems.length > 0) {
        new Notification('🚨 Critical Stock Alert', {
          body: `${criticalItems.length} item(s) critically low!\n${criticalItems[0].name}: ${criticalItems[0].total_quantity} left`,
          icon: '/favicon.ico',
          tag: 'low-stock',
          requireInteraction: false
        });
      } else {
        new Notification('⚠️ Low Stock Alert', {
          body: `${lowStockItems.length} item(s) running low`,
          icon: '/favicon.ico',
          tag: 'low-stock',
          requireInteraction: false
        });
      }
    }
  } catch (error) {
    console.error('Error checking low stock alerts:', error);
  }
}

function initNotifications() {
  if (!('Notification' in window)) return;
  setTimeout(() => {
    if (Notification.permission === 'default') {
      requestNotificationPermission();
    }
  }, 3000);
  setInterval(checkLowStockAlerts, NOTIFICATION_INTERVAL);
  checkLowStockAlerts();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNotifications);
} else {
  initNotifications();
}

window.requestNotificationPermission = requestNotificationPermission;
window.checkLowStockAlerts = checkLowStockAlerts;
