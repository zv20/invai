/**
 * Auto-Cleanup Module
 * 
 * This module is called automatically by server.js after migrations complete.
 * It runs the cleanup script in silent mode to remove old migration files.
 * 
 * Usage in server.js:
 *   const autoCleanup = require('./scripts/auto-cleanup');
 *   await autoCleanup.runIfNeeded();
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const CLEANUP_SCRIPT = path.join(__dirname, 'cleanup-migrations.js');

function runIfNeeded() {
  return new Promise((resolve) => {
    // Check if cleanup is needed
    if (!global.needsMigrationCleanup) {
      resolve();
      return;
    }

    console.log('\n🧹 Running automatic migration cleanup...');

    // Check if cleanup script exists
    if (!fs.existsSync(CLEANUP_SCRIPT)) {
      console.log('   ⚠️  Cleanup script not found - skipping');
      resolve();
      return;
    }

    // Run cleanup script in silent mode
    exec(`node "${CLEANUP_SCRIPT}" --silent`, (error, stdout, stderr) => {
      if (error) {
        console.log('   ⚠️  Auto-cleanup encountered an issue (non-critical)');
        console.log('   You can run manually: npm run cleanup');
      } else {
        console.log('   ✅ Auto-cleanup completed successfully');
      }

      // Reset flag
      global.needsMigrationCleanup = false;
      
      resolve();
    });
  });
}

module.exports = { runIfNeeded };
