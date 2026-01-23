/**
 * Activity Logger
 * Central logging system for all CRUD operations
 */

class ActivityLogger {
  constructor(db) {
    this.db = db;
  }
  
  /**
   * Log an activity
   * @param {string} action - 'create', 'update', 'delete', 'adjust'
   * @param {string} entityType - 'product', 'batch', 'category', 'supplier'
   * @param {number} entityId - ID of the entity
   * @param {string} entityName - Name/description of the entity
   * @param {object} options - Additional options
   * @param {string} options.description - Human-readable description
   * @param {object} options.oldValue - Previous value (for updates)
   * @param {object} options.newValue - New value (for creates/updates)
   * @param {number} options.userId - User ID (default: 1)
   */
  async log(action, entityType, entityId, entityName, options = {}) {
    const {
      description = this.generateDescription(action, entityType, entityName),
      oldValue = null,
      newValue = null,
      userId = 1
    } = options;
    
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO activity_log (action_type, entity_type, entity_id, entity_name, description, old_value, new_value, user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          action,
          entityType,
          entityId,
          entityName,
          description,
          oldValue ? JSON.stringify(oldValue) : null,
          newValue ? JSON.stringify(newValue) : null,
          userId
        ],
        function(err) {
          if (err) {
            console.error('❌ Failed to log activity:', err);
            reject(err);
          } else {
            console.log(`✓ Activity logged: ${action} ${entityType} "${entityName}"`);
            resolve(this.lastID);
          }
        }
      );
    });
  }
  
  /**
   * Generate a human-readable description
   */
  generateDescription(action, entityType, entityName) {
    const actions = {
      create: 'Created',
      update: 'Updated',
      delete: 'Deleted',
      adjust: 'Adjusted'
    };
    
    const entities = {
      product: 'product',
      batch: 'batch',
      category: 'category',
      supplier: 'supplier'
    };
    
    return `${actions[action] || action} ${entities[entityType] || entityType}: ${entityName}`;
  }
  
  /**
   * Get recent activity
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
   * Get activity for a specific entity
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
   * Clear old activity logs (keep last N days)
   */
  async cleanup(daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    return new Promise((resolve, reject) => {
      this.db.run(
        `DELETE FROM activity_log WHERE created_at < ?`,
        [cutoffDate.toISOString()],
        function(err) {
          if (err) reject(err);
          else {
            console.log(`✓ Cleaned up ${this.changes} old activity logs`);
            resolve(this.changes);
          }
        }
      );
    });
  }
}

module.exports = ActivityLogger;