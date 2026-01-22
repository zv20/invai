#!/usr/bin/env node

/**
 * Migration Cleanup Script - Auto Mode
 * 
 * Automatically removes old migration files after consolidation.
 * Can be run manually or triggered automatically after migrations.
 * 
 * Files to be removed (after version 005 runs):
 * - migrations/002_categories_suppliers_complete.js
 * - migrations/004_consolidate_migrations.js
 * - migrations/005_final_consolidation.js (self-delete)
 * 
 * Files to be kept:
 * - migrations/001_complete_baseline.js (the ONE)
 * - migrations/migration-runner.js (system)
 * 
 * Usage:
 *   node scripts/cleanup-migrations.js
 *   node scripts/cleanup-migrations.js --dry-run
 *   
 * Or via npm:
 *   npm run cleanup
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const DB_PATH = path.join(__dirname, '..', 'inventory.db');

const OLD_MIGRATIONS = [
  '002_categories_suppliers.js',
  '002_categories_suppliers_complete.js',
  '003_fix_supplier_active_status.js',
  '004_consolidate_migrations.js',
  '005_final_consolidation.js'
];

const dryRun = process.argv.includes('--dry-run');
const silent = process.argv.includes('--silent');

function log(message) {
  if (!silent) console.log(message);
}

log('\n🧹 Migration Cleanup Script v0.8.0 (Auto)');
log('==========================================\n');

if (dryRun) {
  log('🔍 DRY RUN MODE - No files will be deleted\n');
}

// Step 1: Verify migration 005 has run
function verifyConsolidationComplete() {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(DB_PATH)) {
      log('⚠️  Database not found - assuming fresh install');
      resolve(false); // Don't fail, just skip
      return;
    }

    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        log('❌ Could not open database:', err.message);
        reject(err);
        return;
      }

      db.get(
        'SELECT version FROM schema_migrations WHERE version = 5',
        [],
        (err, row) => {
          db.close();

          if (err) {
            log('⚠️  Could not check migration status:', err.message);
            resolve(false); // Don't fail, just skip
            return;
          }

          if (!row) {
            log('ℹ️  Migration 005 has not run yet - cleanup skipped');
            resolve(false);
            return;
          }

          log('✅ Migration 005 (final consolidation) verified\n');
          resolve(true);
        }
      );
    });
  });
}

// Step 2: Backup old migration files
function backupOldMigrations() {
  log('📦 Backing up old migration files...');

  const backupDir = path.join(MIGRATIONS_DIR, '.backup');
  
  if (!fs.existsSync(backupDir) && !dryRun) {
    fs.mkdirSync(backupDir, { recursive: true });
    log(`   Created backup directory: ${backupDir}`);
  }

  let backedUp = 0;

  OLD_MIGRATIONS.forEach(filename => {
    const sourcePath = path.join(MIGRATIONS_DIR, filename);
    const backupPath = path.join(backupDir, filename);

    if (fs.existsSync(sourcePath)) {
      if (!dryRun) {
        fs.copyFileSync(sourcePath, backupPath);
      }
      log(`   ✅ ${dryRun ? '[DRY RUN] Would backup' : 'Backed up'}: ${filename}`);
      backedUp++;
    }
  });

  if (backedUp === 0) {
    log('   ℹ️  No files to backup (already cleaned)');
  }

  log('');
}

// Step 3: Remove old migration files
function removeOldMigrations() {
  log('🗑️  Removing old migration files...');

  let removedCount = 0;

  OLD_MIGRATIONS.forEach(filename => {
    const filePath = path.join(MIGRATIONS_DIR, filename);

    if (fs.existsSync(filePath)) {
      if (!dryRun) {
        fs.unlinkSync(filePath);
      }
      log(`   ✅ ${dryRun ? '[DRY RUN] Would remove' : 'Removed'}: ${filename}`);
      removedCount++;
    }
  });

  if (removedCount === 0) {
    log('   ℹ️  No files to remove (already cleaned)');
  }

  log(`\n   Total files ${dryRun ? 'to remove' : 'removed'}: ${removedCount}\n`);
}

// Step 4: Verify final state
function verifyCleanup() {
  log('🔍 Verifying cleanup...');

  const remainingFiles = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.js') && f !== 'migration-runner.js')
    .sort();

  log('\n📁 Remaining migration files:');
  remainingFiles.forEach(f => {
    log(`   - ${f}`);
  });

  const isClean = remainingFiles.length === 1 && 
                  remainingFiles[0] === '001_complete_baseline.js';

  if (isClean) {
    log('\n✅ Migration cleanup complete!');
    log('   Your migrations directory is now clean.\n');
    return true;
  } else if (remainingFiles.length === 1) {
    log('\n✅ Cleanup complete!');
    log('   Single baseline migration remains.\n');
    return true;
  } else {
    log('\n⚠️  Multiple migration files still present.');
    if (dryRun) {
      log('   Run without --dry-run to actually remove files.\n');
    } else {
      log('   Some files may not have been processed.\n');
    }
    return false;
  }
}

// Main execution
async function main() {
  try {
    const shouldCleanup = await verifyConsolidationComplete();
    
    if (!shouldCleanup && !dryRun) {
      log('\n⏭️  Cleanup not needed yet - exiting.\n');
      process.exit(0);
    }

    backupOldMigrations();
    removeOldMigrations();
    const success = verifyCleanup();

    if (!dryRun) {
      log('=' .repeat(50));
      log('\n📊 Summary:');
      log('   - Old migrations backed up to: migrations/.backup/');
      log('   - Old migration files removed');
      log('   - Migration history consolidated in database');
      log('   - Final structure: 001_complete_baseline.js only\n');
      
      if (success) {
        log('🎉 Your app now has a single baseline migration!');
        log('   Future migrations will start at version 2.\n');
      }
    }

    process.exit(success ? 0 : 1);
  } catch (error) {
    log('\n❌ Cleanup failed:', error.message);
    log('\n   The cleanup script did not complete.');
    log('   Your app is still functional - old migrations remain.\n');
    process.exit(1);
  }
}

main();
