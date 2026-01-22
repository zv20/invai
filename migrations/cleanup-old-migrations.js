/**
 * Auto-Cleanup Script for Old Migration Files
 * 
 * This script is triggered after consolidation migrations to remove
 * obsolete migration files that are no longer needed.
 * 
 * Usage:
 *   Called automatically by migration-runner.js when global.needsMigrationCleanup is set
 *   Or run manually: node migrations/cleanup-old-migrations.js
 */

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = __dirname;
const BACKUP_DIR = path.join(MIGRATIONS_DIR, '.backup');

/**
 * Files to delete after final consolidation
 * These are superseded by 001_complete_baseline.js
 */
const FILES_TO_DELETE = [
  '001_baseline.js',
  '002_categories_suppliers.js',
  '002_categories_suppliers_complete.js',
  '003_fix_supplier_active_status.js',
  '004_consolidate_migrations.js',
  '005_final_consolidation.js'
];

/**
 * Files to keep (whitelist)
 */
const FILES_TO_KEEP = [
  '001_complete_baseline.js',
  'migration-runner.js',
  'cleanup-old-migrations.js'
];

/**
 * Main cleanup function
 */
function cleanupOldMigrations() {
  console.log('\n🧹 Starting migration cleanup...');
  
  // Ensure backup directory exists
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log('   📁 Created backup directory');
  }

  let filesDeleted = 0;
  let filesBackedUp = 0;
  let errors = 0;

  FILES_TO_DELETE.forEach(filename => {
    const filePath = path.join(MIGRATIONS_DIR, filename);
    
    if (fs.existsSync(filePath)) {
      try {
        // Backup before deleting
        const backupPath = path.join(BACKUP_DIR, filename);
        fs.copyFileSync(filePath, backupPath);
        filesBackedUp++;
        
        // Delete the file
        fs.unlinkSync(filePath);
        filesDeleted++;
        console.log(`   ✓ Deleted: ${filename}`);
      } catch (err) {
        console.error(`   ✗ Error deleting ${filename}:`, err.message);
        errors++;
      }
    }
  });

  console.log(`\n✅ Cleanup complete!`);
  console.log(`   📦 Backed up: ${filesBackedUp} files`);
  console.log(`   🗑️  Deleted: ${filesDeleted} files`);
  if (errors > 0) {
    console.log(`   ⚠️  Errors: ${errors}`);
  }
  console.log(`   📂 Backups saved to: ${BACKUP_DIR}\n`);

  // List remaining migration files
  const remaining = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.match(/^\d{3}_.*\.js$/))
    .sort();
  
  console.log(`📋 Remaining migration files:`);
  remaining.forEach(f => console.log(`   - ${f}`));
  console.log('');

  return {
    filesDeleted,
    filesBackedUp,
    errors,
    remaining
  };
}

/**
 * Verify cleanup was successful
 */
function verifyCleanup() {
  const remaining = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.match(/^\d{3}_.*\.js$/));
  
  const shouldNotExist = FILES_TO_DELETE.filter(f => 
    remaining.includes(f)
  );

  if (shouldNotExist.length > 0) {
    console.error('⚠️  Cleanup incomplete! Still found:', shouldNotExist);
    return false;
  }

  if (!remaining.includes('001_complete_baseline.js')) {
    console.error('❌ ERROR: 001_complete_baseline.js was deleted!');
    return false;
  }

  console.log('✅ Cleanup verification passed!');
  return true;
}

// If run directly (not required as module)
if (require.main === module) {
  const result = cleanupOldMigrations();
  const verified = verifyCleanup();
  
  process.exit(verified ? 0 : 1);
}

module.exports = {
  cleanupOldMigrations,
  verifyCleanup,
  FILES_TO_DELETE,
  FILES_TO_KEEP
};
