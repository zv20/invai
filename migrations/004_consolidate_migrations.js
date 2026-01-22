/**
 * Migration 004: Migration Consolidation
 * 
 * This migration consolidates the migration history by:
 * 1. Checking if old migrations 002 and 003 ran
 * 2. Ensuring is_active column exists on suppliers table
 * 3. Rewriting migration history to use consolidated 002
 * 4. Preparing for cleanup script to remove old migration files
 * 
 * After this migration:
 * - Old users: Schema unchanged, history cleaned
 * - New users: Will only see 001 + 002_complete (clean structure)
 */

module.exports = {
  version: 4,
  name: 'consolidate_migrations',
  description: 'Consolidate migration history and prepare for cleanup',

  async up(db) {
    return new Promise((resolve, reject) => {
      console.log('   🧹 Starting migration consolidation...');

      // Step 1: Check if suppliers table has is_active column
      db.get(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='suppliers'",
        [],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          if (!row) {
            console.error('   ❌ Suppliers table does not exist!');
            reject(new Error('Suppliers table missing - cannot consolidate'));
            return;
          }

          const hasIsActive = row.sql.includes('is_active');
          console.log(`   ℹ️  Suppliers table has is_active: ${hasIsActive}`);

          // Step 2: Add is_active if missing (safety check)
          if (!hasIsActive) {
            console.log('   ⚠️  Adding missing is_active column...');
            db.run(
              'ALTER TABLE suppliers ADD COLUMN is_active INTEGER DEFAULT 1',
              (err) => {
                if (err && !err.message.includes('duplicate column')) {
                  reject(err);
                  return;
                }
                
                // Set all existing suppliers to active
                db.run(
                  'UPDATE suppliers SET is_active = 1 WHERE is_active IS NULL',
                  (err) => {
                    if (err) {
                      reject(err);
                      return;
                    }
                    consolidateHistory();
                  }
                );
              }
            );
          } else {
            consolidateHistory();
          }
        }
      );

      function consolidateHistory() {
        // Step 3: Check which old migrations exist in history
        db.all(
          'SELECT version, name FROM schema_migrations WHERE version IN (2, 3)',
          [],
          (err, rows) => {
            if (err) {
              reject(err);
              return;
            }

            console.log(`   📋 Found ${rows.length} old migration records to consolidate`);

            if (rows.length === 0) {
              // Fresh install - nothing to consolidate
              console.log('   ✅ Fresh install detected - no consolidation needed');
              resolve();
              return;
            }

            // Step 4: Delete old migration records for versions 2 and 3
            db.run(
              'DELETE FROM schema_migrations WHERE version IN (2, 3)',
              (err) => {
                if (err) {
                  reject(err);
                  return;
                }

                console.log('   🗑️  Removed old migration records (versions 2, 3)');

                // Step 5: Insert consolidated migration record
                db.run(
                  `INSERT INTO schema_migrations (version, name, applied_at) 
                   VALUES (2, 'categories_suppliers_complete', CURRENT_TIMESTAMP)`,
                  (err) => {
                    if (err && !err.message.includes('UNIQUE constraint')) {
                      reject(err);
                      return;
                    }

                    console.log('   ✅ Inserted consolidated migration record (version 2)');
                    console.log('   🎉 Migration consolidation complete!');
                    console.log('   📝 Run cleanup script to remove old migration files');
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
      console.log('   ⏮️  Rolling back migration consolidation...');
      
      // Restore old migration records
      db.run(
        'DELETE FROM schema_migrations WHERE version = 2 AND name = "categories_suppliers_complete"',
        (err) => {
          if (err) {
            reject(err);
            return;
          }

          // Re-insert old records (best effort)
          db.run(
            `INSERT OR IGNORE INTO schema_migrations (version, name, applied_at) 
             VALUES (2, 'categories_suppliers_tables', CURRENT_TIMESTAMP)`,
            () => {
              db.run(
                `INSERT OR IGNORE INTO schema_migrations (version, name, applied_at) 
                 VALUES (3, 'fix_supplier_active_status', CURRENT_TIMESTAMP)`,
                (err) => {
                  if (err) reject(err);
                  else {
                    console.log('   ✅ Rollback complete');
                    resolve();
                  }
                }
              );
            }
          );
        }
      );
    });
  }
};
