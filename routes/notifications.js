/**
 * Push Notifications API Routes
 */

const express = require('express');
const PushNotificationManager = require('../lib/pwa/pushNotifications');

module.exports = (db, logger) => {
  const router = express.Router();

  /**
   * GET /api/notifications/vapid-public-key
   * Get VAPID public key for push subscription
   */
  router.get('/vapid-public-key', (req, res) => {
    try {
      const manager = new PushNotificationManager(db.db || db);
      
      res.json({
        success: true,
        publicKey: manager.vapidKeys.publicKey
      });
    } catch (error) {
      logger.error('Get VAPID key error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/notifications/subscribe
   * Subscribe to push notifications
   */
  router.post('/subscribe', async (req, res) => {
    try {
      const { subscription } = req.body;
      const userId = req.user?.id || 0;

      if (!subscription) {
        return res.status(400).json({
          success: false,
          error: 'Subscription data required'
        });
      }

      const manager = new PushNotificationManager(db.db || db);
      await manager.saveSubscription(userId, subscription);

      res.json({
        success: true,
        message: 'Push notifications enabled'
      });
    } catch (error) {
      logger.error('Subscribe error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/notifications/unsubscribe
   * Unsubscribe from push notifications
   */
  router.post('/unsubscribe', async (req, res) => {
    try {
      const userId = req.user?.id || 0;
      const manager = new PushNotificationManager(db.db || db);
      await manager.deleteSubscription(userId);

      res.json({
        success: true,
        message: 'Push notifications disabled'
      });
    } catch (error) {
      logger.error('Unsubscribe error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/notifications/send
   * Send push notification (admin only)
   */
  router.post('/send', async (req, res) => {
    try {
      // Check if user has permission to send notifications
      if (!req.user || req.user.role !== 'owner') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden - Admin access required'
        });
      }

      const { userId, userIds, sendToAll, title, body, url, data } = req.body;
      const manager = new PushNotificationManager(db.db || db);

      let result;
      if (sendToAll) {
        result = await manager.sendToAll({ title, body, url, data });
      } else if (userIds && Array.isArray(userIds)) {
        result = await manager.sendToMultiple(userIds, { title, body, url, data });
      } else if (userId) {
        result = await manager.sendToUser(userId, { title, body, url, data });
      } else {
        return res.status(400).json({
          success: false,
          error: 'userId, userIds, or sendToAll required'
        });
      }

      res.json({
        success: true,
        result
      });
    } catch (error) {
      logger.error('Send notification error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/notifications/test
   * Send test notification to current user
   */
  router.post('/test', async (req, res) => {
    try {
      const userId = req.user?.id || 0;
      const manager = new PushNotificationManager(db.db || db);

      await manager.sendToUser(userId, {
        title: 'Test Notification',
        body: 'Push notifications are working! 🎉',
        url: '/dashboard.html'
      });

      res.json({
        success: true,
        message: 'Test notification sent'
      });
    } catch (error) {
      logger.error('Test notification error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
};
