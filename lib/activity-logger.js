/**
 * Activity Logger Module
 * Centralized system for logging all CRUD operations
 * v0.8.0
 */

class ActivityLogger {
  constructor(db) {
    this.db = db;
  }

  /**
   * Log an activity
   * @param {Object} params
   * @param {string} params.actionType - 'create', 'update', 'delete', 'adjust'
   * @param {string} params.entityType - 'product', 'batch', 'category', 'supplier'
   * @param {number} params.entityId - ID of the entity
   * @param {string} params.entityName - Name/description of the entity
   * @param {string} params.description - Human-readable description
   * @param {Object} params.oldValue - Previous value (for updates)
   * @param {Object} params.newValue - New value
   */
  async log({ actionType, entityType, entityId, entityName, description, oldValue, newValue }) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO activity_log (action_type, entity_type, entity_id, entity_name, description, old_value, new_value)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(
        sql,
        [
          actionType,
          entityType,
          entityId || null,
          entityName || '',
          description || '',
          oldValue ? JSON.stringify(oldValue) : null,
          newValue ? JSON.stringify(newValue) : null
        ],
        function(err) {
          if (err) {
            console.error('Activity logging error:', err);
            // Don't reject - activity logging shouldn't break the operation
            resolve({ id: null, error: err.message });
          } else {
            resolve({ id: this.lastID });
          }
        }
      );
    });
  }

  /**
   * Get recent activities
   * @param {number} limit - Number of activities to retrieve
   */
  async getRecent(limit = 50) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?',
        [limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  /**
   * Get activities for a specific entity
   * @param {string} entityType
   * @param {number} entityId
   */
  async getForEntity(entityType, entityId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM activity_log WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC',
        [entityType, entityId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  /**
   * Cleanup old activities (retain 90 days)
   */
  async cleanup() {
    return new Promise((resolve, reject) => {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      this.db.run(
        'DELETE FROM activity_log WHERE created_at < ?',
        [ninetyDaysAgo],
        function(err) {
          if (err) reject(err);
          else resolve({ deleted: this.changes });
        }
      );
    });
  }
}

module.exports = ActivityLogger;