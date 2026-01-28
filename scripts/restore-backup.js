/**
 * Restore Backup Script - Sprint 4 Phase 2
 * 
 * Restore database from backup
 * Usage: node scripts/restore-backup.js <backup-name>
 */

require('dotenv').config();
const { getDatabase, closeDatabase } = require('../lib/database');
const BackupManager = require('../lib/backup/backupManager');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.simple()
  ),
  transports: [new winston.transports.Console()]
});

async function restore() {
  const backupName = process.argv[2];
  
  if (!backupName) {
    console.error('Usage: node scripts/restore-backup.js <backup-name>');
    console.error('\nList available backups first:');
    console.error('  node scripts/restore-backup.js --list');
    process.exit(1);
  }
  
  try {
    console.log('Initializing database connection...');
    const dbAdapter = await getDatabase();
    
    const backupManager = new BackupManager(dbAdapter, logger);
    
    // List backups if requested
    if (backupName === '--list') {
      console.log('\nAvailable backups:');
      const backups = await backupManager.listBackups();
      
      if (backups.length === 0) {
        console.log('  No backups found');
      } else {
        backups.forEach((backup, idx) => {
          console.log(`  ${idx + 1}. ${backup.name}`);
          console.log(`     Date: ${backup.date.toISOString()}`);
          console.log(`     Size: ${(backup.size / 1024 / 1024).toFixed(2)} MB\n`);
        });
      }
      
      await closeDatabase();
      return;
    }
    
    // Confirm restore
    console.log(`\n⚠️  WARNING: This will restore the database from: ${backupName}`);
    console.log('All current data will be replaced!');
    console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\nStarting restore...');
    const result = await backupManager.restoreBackup(backupName);
    
    if (result.success) {
      console.log('\n✅ Database restored successfully!');
      console.log('Please restart the application.');
    } else {
      console.error('\n❌ Restore failed:', result.error);
      process.exit(1);
    }
    
    await closeDatabase();
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

restore();