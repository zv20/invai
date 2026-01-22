/**
 * Migration 003: Fix Supplier Active Status
 * 
 * Problem: All existing suppliers have is_active = 0 or NULL,
 * causing them to display with opacity: 0.6 (faded appearance)
 * 
 * Solution: Set all suppliers to is_active = 1 by default
 */

module.exports = {
    up: (db) => {
        return new Promise((resolve, reject) => {
            db.run(`
                UPDATE suppliers 
                SET is_active = 1 
                WHERE is_active IS NULL OR is_active = 0
            `, (err) => {
                if (err) {
                    console.error('Migration 003 UP failed:', err);
                    reject(err);
                } else {
                    console.log('✓ Migration 003: All suppliers set to active');
                    resolve();
                }
            });
        });
    },

    down: (db) => {
        return new Promise((resolve, reject) => {
            // Rollback: Set all suppliers back to inactive
            // (This is destructive, use with caution)
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
