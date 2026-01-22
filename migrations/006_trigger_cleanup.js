/**
 * Migration 006: Trigger Auto-Cleanup
 * 
 * This migration:
 * 1. Verifies the database is in good state (has complete_baseline record)
 * 2. Cleans up duplicate/stale migration records
 * 3. Sets global flag to trigger file cleanup
 * 
 * This ensures a clean slate going forward.
 */

module.exports = {
  version: 6,
  name: 'trigger_cleanup',
  description: 'Clean up duplicate migration records and trigger file cleanup',

  async up(db) {
    return new Promise((resolve, reject) => {
      console.log('   🧹 Starting cleanup migration...');

      // Step 1: Check if complete_baseline exists
      db.get(
        'SELECT * FROM schema_migrations WHERE version = 1 AND name = "complete_baseline"',
        [],
        (err, baselineRecord) => {
          if (err) {
            reject(err);
            return;
          }

          if (!baselineRecord) {
            console.error('   ❌ ERROR: complete_baseline record not found!');
            reject(new Error('Database not properly consolidated'));
            return;
          }

          console.log('   ✓ Verified complete_baseline record exists');
          cleanupDuplicates();
        }
      );

      function cleanupDuplicates() {
        // Step 2: Get all migration records
        db.all(
          'SELECT * FROM schema_migrations ORDER BY version',
          [],
          (err, records) => {
            if (err) {
              reject(err);
              return;
            }

            console.log(`   📊 Found ${records.length} migration records`);
            records.forEach(r => console.log(`      - v${r.version}: ${r.name}`));

            // Step 3: Delete stale records (keep only version 1 and this one)
            db.run(
              'DELETE FROM schema_migrations WHERE version > 1 AND version < 6',
              (err) => {
                if (err) {
                  reject(err);
                  return;
                }

                console.log('   🗑️  Deleted stale migration records (v2-v5)');
                
                // Step 4: Set cleanup flag
                global.needsMigrationCleanup = true;
                console.log('   🎯 Set cleanup flag for old migration files');
                console.log('   ✅ Cleanup migration complete!');
                
                resolve();
              }
            );
          }
        );
      }
    });
  },

  async down(db) {
    return new Promise((resolve, reject) => {
      console.log('   ⏮️  Rollback not supported for cleanup migration');
      resolve();
    });
  }
};
