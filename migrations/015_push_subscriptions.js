/**
 * Migration 015: Push Subscriptions Table
 * Stores push notification subscriptions for PWA
 */

const MigrationHelper = require('../lib/migration-helper');

module.exports = {
  up: async (db, dbType) => {
    const helper = new MigrationHelper(dbType);

    // Push subscriptions table
    await db.run(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        ${helper.primaryKey('id')},
        user_id INTEGER NOT NULL,
        subscription TEXT NOT NULL,
        created_at ${helper.timestamp()},
        updated_at ${helper.timestamp()},
        UNIQUE(user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user 
      ON push_subscriptions(user_id)
    `);

    console.log('✅ Migration 015: Push subscriptions table created');
  },

  down: async (db) => {
    await db.run('DROP TABLE IF EXISTS push_subscriptions');
    console.log('✅ Migration 015: Push subscriptions table dropped');
  }
};
