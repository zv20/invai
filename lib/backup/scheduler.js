/**
 * Backup Scheduler - Sprint 4 Phase 2
 * 
 * Cron-based backup scheduling
 */

const cron = require('node-cron');

class BackupScheduler {
  constructor(backupManager, logger) {
    this.backupManager = backupManager;
    this.logger = logger;
    this.task = null;
  }

  /**
   * Start scheduled backups
   */
  start() {
    const schedule = this.backupManager.config.schedule;
    
    if (!cron.validate(schedule)) {
      throw new Error(`Invalid cron schedule: ${schedule}`);
    }
    
    this.logger.info(`Backup scheduler started: ${schedule}`);
    
    this.task = cron.schedule(schedule, async () => {
      this.logger.info('Running scheduled backup...');
      
      try {
        const result = await this.backupManager.createBackup('scheduled');
        
        if (result.success) {
          this.logger.info(`Scheduled backup completed: ${result.backupName}`);
        } else {
          this.logger.error(`Scheduled backup failed: ${result.error}`);
        }
      } catch (error) {
        this.logger.error(`Scheduled backup error: ${error.message}`);
      }
    });
  }

  /**
   * Stop scheduled backups
   */
  stop() {
    if (this.task) {
      this.task.stop();
      this.logger.info('Backup scheduler stopped');
    }
  }

  /**
   * Get next scheduled run time
   */
  getNextRun() {
    // Parse cron expression to get next run time
    // For now, return the schedule string
    return this.backupManager.config.schedule;
  }
}

module.exports = BackupScheduler;