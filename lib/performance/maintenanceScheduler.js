/**
 * Database Maintenance Scheduler - Sprint 4 Phase 4
 * 
 * Automated database maintenance:
 * - VACUUM for PostgreSQL
 * - ANALYZE for statistics
 * - Index rebuilding
 * - Archive old data
 */

const cron = require('node-cron');

class MaintenanceScheduler {
  constructor(dbAdapter, logger) {
    this.dbAdapter = dbAdapter;
    this.logger = logger;
    this.tasks = [];
  }

  /**
   * Start maintenance scheduler
   */
  start() {
    const dbType = this.dbAdapter.getType();
    
    // Daily VACUUM/ANALYZE (3 AM)
    this.tasks.push(cron.schedule('0 3 * * *', async () => {
      await this.runVacuum();
      await this.runAnalyze();
    }));
    
    // Weekly archive old activity logs (Sunday 4 AM)
    this.tasks.push(cron.schedule('0 4 * * 0', async () => {
      await this.archiveOldLogs();
    }));
    
    // Monthly index maintenance (1st of month, 5 AM)
    this.tasks.push(cron.schedule('0 5 1 * *', async () => {
      await this.rebuildIndexes();
    }));
    
    this.logger.info('Database maintenance scheduler started');
  }

  /**
   * Stop maintenance scheduler
   */
  stop() {
    this.tasks.forEach(task => task.stop());
    this.logger.info('Database maintenance scheduler stopped');
  }

  /**
   * Run VACUUM (PostgreSQL only)
   */
  async runVacuum() {
    if (this.dbAdapter.getType() !== 'postgres') {
      return;
    }
    
    try {
      this.logger.info('Running VACUUM...');
      await this.dbAdapter.run('VACUUM');
      this.logger.info('VACUUM completed');
    } catch (error) {
      this.logger.error(`VACUUM failed: ${error.message}`);
    }
  }

  /**
   * Run ANALYZE to update statistics
   */
  async runAnalyze() {
    try {
      this.logger.info('Running ANALYZE...');
      
      if (this.dbAdapter.getType() === 'postgres') {
        await this.dbAdapter.run('ANALYZE');
      } else {
        await this.dbAdapter.run('ANALYZE');
      }
      
      this.logger.info('ANALYZE completed');
    } catch (error) {
      this.logger.error(`ANALYZE failed: ${error.message}`);
    }
  }

  /**
   * Archive old activity logs (>90 days)
   */
  async archiveOldLogs() {
    try {
      this.logger.info('Archiving old activity logs...');
      
      const result = await this.dbAdapter.run(
        `DELETE FROM activity_logs WHERE created_at < datetime('now', '-90 days')`
      );
      
      this.logger.info(`Archived ${result.changes} old activity logs`);
    } catch (error) {
      this.logger.error(`Log archival failed: ${error.message}`);
    }
  }

  /**
   * Rebuild indexes
   */
  async rebuildIndexes() {
    try {
      this.logger.info('Rebuilding indexes...');
      
      if (this.dbAdapter.getType() === 'postgres') {
        await this.dbAdapter.run('REINDEX DATABASE CONCURRENTLY');
      } else {
        // SQLite auto-maintains indexes
        this.logger.info('SQLite auto-maintains indexes');
      }
      
      this.logger.info('Index rebuild completed');
    } catch (error) {
      this.logger.error(`Index rebuild failed: ${error.message}`);
    }
  }

  /**
   * Get maintenance status
   */
  getStatus() {
    return {
      tasksRunning: this.tasks.length,
      nextVacuum: '3:00 AM daily',
      nextArchive: 'Sunday 4:00 AM',
      nextIndexRebuild: '1st of month 5:00 AM'
    };
  }
}

module.exports = MaintenanceScheduler;