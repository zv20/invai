/**
 * Activity Logger Module
 * Tracks all CRUD operations for audit trail
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
   * @param {string} entityName - Entity name for display
   * @param {string} description - Human-readable description
   * @param {object} oldValue - Previous state (optional)
   * @param {object} newValue - New state (optional)
   */
  log(actionType, entityType, entityId, entityName, description, oldValue = null, newValue = null) {
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
          entityId,
          entityName,
          description,
          oldValue ? JSON.stringify(oldValue) : null,
          newValue ? JSON.stringify(newValue) : null
        ],
        function(err) {
          if (err) {
            console.error('Activity log error:', err);
            // Don't reject - logging failures shouldn't break operations
            resolve({ logged: false, error: err.message });
          } else {
            resolve({ logged: true, id: this.lastID });
          }
        }
      );
    });
  }

  /**
   * Get recent activity
   * @param {number} limit - Number of records to return
   */
  getRecent(limit = 50) {
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
   * @param {string} entityType
   * @param {number} entityId
   */
  getForEntity(entityType, entityId) {
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
   * Clean old activity logs (keep last 1000)
   */
  cleanup() {
    return new Promise((resolve, reject) => {
      this.db.run(
        `DELETE FROM activity_log WHERE id NOT IN (
          SELECT id FROM activity_log ORDER BY created_at DESC LIMIT 1000
        )`,
        function(err) {
          if (err) reject(err);
          else resolve({ deleted: this.changes });
        }
      );
    });
  }
}

module.exports = ActivityLogger;
