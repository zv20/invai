#!/usr/bin/env node

/**
 * Migration Cleanup Script
 * 
 * Removes old migration files after consolidation migration (004) has run.
 * This script should be run AFTER a successful update that includes migration 004.
 * 
 * Files to be removed:
 * - migrations/002_categories_suppliers.js (old version without is_active)
 * - migrations/003_fix_supplier_active_status.js (emergency fix)
 * 
 * Files to be kept:
 * - migrations/001_baseline.js (unchanged)
 * - migrations/002_categories_suppliers_complete.js (consolidated)
 * - migrations/004_consolidate_migrations.js (this consolidation)
 * - migrations/migration-runner.js (system)
 * 
 * Usage:
 *   node scripts/cleanup-migrations.js
 *   
 * Or run via npm:
 *   npm run cleanup-migrations
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const DB_PATH = path.join(__dirname, '..', 'inventory.db');

const OLD_MIGRATIONS = [
  '002_categories_suppliers.js',
  '003_fix_supplier_active_status.js'
];

console.log('\n🧹 Migration Cleanup Script v0.8.0');
console.log('=====================================\n');

// Step 1: Verify migration 004 has run
function verifyConsolidationComplete() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('❌ Could not open database:', err.message);
        reject(err);
        return;
      }

      db.get(
        'SELECT version FROM schema_migrations WHERE version = 4',
        [],
        (err, row) => {
          db.close();

          if (err) {
            console.error('❌ Error checking migration status:', err.message);
            reject(err);
            return;
          }

          if (!row) {
            console.error('❌ Migration 004 has not run yet!');
            console.error('   Please run the update command first:');
            console.error('   npm start (or your update script)\n');
            reject(new Error('Migration 004 not complete'));
            return;
          }

          console.log('✅ Migration 004 (consolidation) verified\n');
          resolve();
        }
      );
    });
  });
}

// Step 2: Backup old migration files
function backupOldMigrations() {
  console.log('📦 Backing up old migration files...');

  const backupDir = path.join(MIGRATIONS_DIR, '.backup');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log(`   Created backup directory: ${backupDir}`);
  }

  OLD_MIGRATIONS.forEach(filename => {
    const sourcePath = path.join(MIGRATIONS_DIR, filename);
    const backupPath = path.join(backupDir, filename);

    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, backupPath);
      console.log(`   ✅ Backed up: ${filename}`);
    } else {
      console.log(`   ⚠️  File not found (already removed?): ${filename}`);
    }
  });

  console.log('\n');
}

// Step 3: Remove old migration files
function removeOldMigrations() {
  console.log('🗑️  Removing old migration files...');

  let removedCount = 0;

  OLD_MIGRATIONS.forEach(filename => {
    const filePath = path.join(MIGRATIONS_DIR, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`   ✅ Removed: ${filename}`);
      removedCount++;
    } else {
      console.log(`   ⚠️  Already removed: ${filename}`);
    }
  });

  console.log(`\n   Total files removed: ${removedCount}\n`);
}

// Step 4: Verify final state
function verifyCleanup() {
  console.log('🔍 Verifying cleanup...');

  const remainingFiles = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.js') && f !== 'migration-runner.js')
    .sort();

  console.log('\n📁 Remaining migration files:');
  remainingFiles.forEach(f => {
    console.log(`   - ${f}`);
  });

  const expectedFiles = [
    '001_baseline.js',
    '002_categories_suppliers_complete.js',
    '004_consolidate_migrations.js'
  ];

  const isClean = expectedFiles.every(f => remainingFiles.includes(f)) &&
                  remainingFiles.length === expectedFiles.length;

  if (isClean) {
    console.log('\n✅ Migration cleanup complete!');
    console.log('   Your migrations directory is now clean.\n');
    return true;
  } else {
    console.log('\n⚠️  Unexpected files found or files missing.');
    console.log('   Please review the migrations directory manually.\n');
    return false;
  }
}

// Main execution
async function main() {
  try {
    await verifyConsolidationComplete();
    backupOldMigrations();
    removeOldMigrations();
    const success = verifyCleanup();

    console.log('=' .repeat(50));
    console.log('\n📊 Summary:');
    console.log('   - Old migrations backed up to: migrations/.backup/');
    console.log('   - Old migration files removed');
    console.log('   - Migration history consolidated in database');
    console.log('   - Clean migration structure: 001 + 002 + 004\n');
    
    if (success) {
      console.log('🎉 Your app now has a clean migration structure!');
      console.log('   New installs will only see 3 migration files.\n');
    }

    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error.message);
    console.error('\n   The cleanup script did not complete.');
    console.error('   Your app is still functional - old migrations remain.\n');
    process.exit(1);
  }
}

main();
