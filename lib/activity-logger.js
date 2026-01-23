/**
 * Activity Logger Module
 * Centralized activity tracking for all CRUD operations
 * v0.8.0
 */

class ActivityLogger {
  constructor(db) {
    this.db = db;
  }

  /**
   * Log an activity
   * @param {string} actionType - 'create', 'update', 'delete', 'adjust'
   * @param {string} entityType - 'product', 'batch', 'category', 'supplier'
   * @param {number} entityId - Entity ID
   * @param {string} entityName - Human-readable name
   * @param {string} description - Action description
   * @param {object} oldValue - Previous state (for updates)
   * @param {object} newValue - New state
   */
  async log(actionType, entityType, entityId, entityName, description, oldValue = null, newValue = null) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO activity_log (action_type, entity_type, entity_id, entity_name, description, old_value, new_value)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          actionType,
          entityType,
          entityId,
          entityName,
          description,
          oldValue ? JSON.stringify(oldValue) : null,
          newValue ? JSON.stringify(newValue) : null
        ],
        function(err) {
          if (err) {
            console.error('Activity log error:', err);
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );
    });
  }

  // Convenience methods
  async logCreate(entityType, entityId, entityName, details) {
    return this.log('create', entityType, entityId, entityName, `Created ${entityType}`, null, details);
  }

  async logUpdate(entityType, entityId, entityName, oldValue, newValue) {
    return this.log('update', entityType, entityId, entityName, `Updated ${entityType}`, oldValue, newValue);
  }

  async logDelete(entityType, entityId, entityName) {
    return this.log('delete', entityType, entityId, entityName, `Deleted ${entityType}`);
  }

  async logAdjust(entityType, entityId, entityName, adjustment, reason) {
    return this.log('adjust', entityType, entityId, entityName, `Adjusted ${entityType}: ${reason}`, { adjustment });
  }

  /**
   * Get recent activity
   * @param {number} limit - Number of records
   */
  async getRecent(limit = 50) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?`,
        [limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  /**
   * Get activity for specific entity
   */
  async getForEntity(entityType, entityId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM activity_log WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC`,
        [entityType, entityId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  /**
   * Cleanup old activity logs (older than 90 days)
   */
  async cleanup() {
    return new Promise((resolve, reject) => {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      this.db.run(
        `DELETE FROM activity_log WHERE created_at < ?`,
        [ninetyDaysAgo.toISOString()],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }
}

module.exports = ActivityLogger;