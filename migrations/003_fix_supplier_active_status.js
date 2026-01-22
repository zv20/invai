/**
 * Migration 003: Fix Supplier Active Status
 * 
 * Problem: Suppliers table missing is_active column
 * Solution: Add column if missing, then set all suppliers to active
 */

module.exports = {
    version: 3,
    description: 'Fix supplier active status column',
    
    up: (db) => {
        return new Promise((resolve, reject) => {
            // Try to add the column (will fail silently if it already exists)
            db.run(`
                ALTER TABLE suppliers 
                ADD COLUMN is_active INTEGER DEFAULT 1
            `, (err) => {
                // Ignore "duplicate column" errors
                if (err && !err.message.includes('duplicate column')) {
                    console.error('Migration 003 ADD COLUMN failed:', err);
                    reject(err);
                    return;
                }
                
                if (err) {
                    console.log('   ℹ️  Column is_active already exists');
                }
                
                // Now update any NULL or 0 values to 1
                db.run(`
                    UPDATE suppliers 
                    SET is_active = 1 
                    WHERE is_active IS NULL OR is_active = 0
                `, (err) => {
                    if (err) {
                        console.error('Migration 003 UPDATE failed:', err);
                        reject(err);
                    } else {
                        console.log('✓ Migration 003: Ensured is_active column exists and set all suppliers to active');
                        resolve();
                    }
                });
            });
        });
    },

    down: (db) => {
        return new Promise((resolve, reject) => {
            // SQLite doesn't support DROP COLUMN easily, so we just set all to 0
            db.run(`
                UPDATE suppliers 
                SET is_active = 0
            `, (err) => {
                if (err) {
                    console.error('Migration 003 DOWN failed:', err);
                    reject(err);
                } else {
                    console.log('✓ Migration 003 rollback: All suppliers set to inactive');
                    resolve();
                }
            });
        });
    }
};
