/**
 * Migration 005: Final Consolidation
 * 
 * This is a ONE-TIME migration that:
 * 1. Verifies schema is complete
 * 2. Deletes ALL old migration records (1, 2, 4)
 * 3. Inserts single baseline record (version 1)
 * 4. Triggers auto-cleanup of old migration files
 * 
 * After this runs:
 * - Database shows only: version 1 (complete_baseline)
 * - Migration files: only 001_complete_baseline.js remains
 * - Future migrations start at version 2
 * 
 * This migration will be auto-deleted after successful execution.
 */

module.exports = {
  version: 5,
  name: 'final_consolidation',
  description: 'Final consolidation - rewrite history to single baseline',

  async up(db) {
    return new Promise((resolve, reject) => {
      console.log('   🔄 Final consolidation starting...');

      // Step 1: Verify all required tables exist
      const requiredTables = ['products', 'categories', 'suppliers'];
      let tablesChecked = 0;
      let allTablesExist = true;

      requiredTables.forEach(tableName => {
        db.get(
          `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
          [tableName],
          (err, row) => {
            if (err || !row) {
              console.error(`   ❌ Required table '${tableName}' missing!`);
              allTablesExist = false;
            }
            
            tablesChecked++;
            if (tablesChecked === requiredTables.length) {
              if (!allTablesExist) {
                reject(new Error('Schema incomplete - cannot consolidate'));
                return;
              }
              verifySupplierSchema();
            }
          }
        );
      });

      function verifySupplierSchema() {
        // Step 2: Verify suppliers table has is_active
        db.get(
          `SELECT sql FROM sqlite_master WHERE type='table' AND name='suppliers'`,
          [],
          (err, row) => {
            if (err) {
              reject(err);
              return;
            }

            const hasIsActive = row.sql.includes('is_active');
            if (!hasIsActive) {
              console.error('   ❌ Suppliers table missing is_active column!');
              reject(new Error('Schema incomplete - is_active missing'));
              return;
            }

            console.log('   ✅ Schema verification complete');
            consolidateHistory();
          }
        );
      }

      function consolidateHistory() {
        // Step 3: Check existing migration records
        db.all(
          'SELECT version, name FROM schema_migrations ORDER BY version',
          [],
          (err, rows) => {
            if (err) {
              reject(err);
              return;
            }

            console.log(`   📋 Found ${rows.length} existing migration records`);
            rows.forEach(r => console.log(`      - v${r.version}: ${r.name}`));

            // Step 4: Delete ALL old migration records
            db.run(
              'DELETE FROM schema_migrations WHERE version < 5',
              (err) => {
                if (err) {
                  reject(err);
                  return;
                }

                console.log('   🗑️  Deleted all old migration records');

                // Step 5: Insert single baseline record
                db.run(
                  `INSERT INTO schema_migrations (version, name, applied_at) 
                   VALUES (1, 'complete_baseline', CURRENT_TIMESTAMP)`,
                  (err) => {
                    if (err && !err.message.includes('UNIQUE constraint')) {
                      reject(err);
                      return;
                    }

                    console.log('   ✅ Inserted consolidated baseline record');
                    console.log('   🎉 Final consolidation complete!');
                    console.log('   📝 Migration history: v1 (complete_baseline)');
                    console.log('   🧹 Auto-cleanup will remove old migration files...');
                    
                    // Mark for auto-cleanup
                    global.needsMigrationCleanup = true;
                    
                    resolve();
                  }
                );
              }
            );
          }
        );
      }
    });
  },

  async down(db) {
    return new Promise((resolve, reject) => {
      console.log('   ⏮️  Rolling back final consolidation is not supported');
      console.log('   ℹ️  Manual database restore required if needed');
      resolve();
    });
  }
};
