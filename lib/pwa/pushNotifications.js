/**
 * Push Notifications Manager
 * Handles push notification subscriptions and sending
 */

const webpush = require('web-push');

class PushNotificationManager {
  constructor(db) {
    this.db = db;
    this.vapidKeys = this.getVapidKeys();
    
    if (this.vapidKeys.publicKey && this.vapidKeys.privateKey) {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:admin@invai.app',
        this.vapidKeys.publicKey,
        this.vapidKeys.privateKey
      );
    }
  }

  /**
   * Get or generate VAPID keys
   */
  getVapidKeys() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (publicKey && privateKey) {
      return { publicKey, privateKey };
    }

    // Generate new keys if not in environment
    console.warn('VAPID keys not found in environment. Generating new keys...');
    console.warn('Add these to your .env file:');
    const keys = webpush.generateVAPIDKeys();
    console.warn(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
    console.warn(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
    
    return keys;
  }

  /**
   * Save push subscription
   */
  async saveSubscription(userId, subscription) {
    const result = await this.db.run(`
      INSERT INTO push_subscriptions (user_id, subscription, created_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT (user_id) DO UPDATE SET
        subscription = excluded.subscription,
        updated_at = datetime('now')
    `, [userId, JSON.stringify(subscription)]);

    return result.lastID || result.changes > 0;
  }

  /**
   * Get user's push subscription
   */
  async getSubscription(userId) {
    const row = await this.db.get(`
      SELECT subscription FROM push_subscriptions
      WHERE user_id = ?
    `, [userId]);

    return row ? JSON.parse(row.subscription) : null;
  }

  /**
   * Delete push subscription
   */
  async deleteSubscription(userId) {
    const result = await this.db.run(`
      DELETE FROM push_subscriptions WHERE user_id = ?
    `, [userId]);

    return result.changes > 0;
  }

  /**
   * Send push notification to user
   */
  async sendToUser(userId, payload) {
    const subscription = await this.getSubscription(userId);
    
    if (!subscription) {
      throw new Error('No push subscription found for user');
    }

    const notificationPayload = JSON.stringify({
      title: payload.title || 'InvAI Notification',
      body: payload.body || '',
      icon: payload.icon || '/icon-192x192.png',
      badge: payload.badge || '/icon-96x96.png',
      url: payload.url || '/',
      data: payload.data || {}
    });

    try {
      await webpush.sendNotification(subscription, notificationPayload);
      return { success: true };
    } catch (error) {
      console.error('Push notification error:', error);
      
      // Remove invalid subscriptions (410 Gone)
      if (error.statusCode === 410) {
        await this.deleteSubscription(userId);
      }
      
      throw error;
    }
  }

  /**
   * Send push notification to multiple users
   */
  async sendToMultiple(userIds, payload) {
    const results = [];
    
    for (const userId of userIds) {
      try {
        await this.sendToUser(userId, payload);
        results.push({ userId, success: true });
      } catch (error) {
        results.push({ userId, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Send notification to all subscribed users
   */
  async sendToAll(payload) {
    const rows = await this.db.all(`
      SELECT user_id FROM push_subscriptions
    `);

    const userIds = rows.map(row => row.user_id);
    return this.sendToMultiple(userIds, payload);
  }

  /**
   * Send low stock alert
   */
  async sendLowStockAlert(userId, product) {
    return this.sendToUser(userId, {
      title: 'Low Stock Alert',
      body: `${product.name} is running low (${product.stock_quantity} units)`,
      icon: '/icon-192x192.png',
      url: `/products.html?id=${product.id}`,
      data: {
        type: 'low_stock',
        product_id: product.id
      }
    });
  }

  /**
   * Send expiration alert
   */
  async sendExpirationAlert(userId, product) {
    return this.sendToUser(userId, {
      title: 'Expiration Alert',
      body: `${product.name} expires soon (${product.expiration_date})`,
      icon: '/icon-192x192.png',
      url: `/products.html?id=${product.id}`,
      data: {
        type: 'expiring',
        product_id: product.id
      }
    });
  }
}

module.exports = PushNotificationManager;
