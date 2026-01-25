/**
 * Migration 014: Dashboard Tables
 * Creates tables for customizable dashboards
 */

const MigrationHelper = require('../lib/migration-helper');

module.exports = {
  up: async (db, dbType) => {
    const helper = new MigrationHelper(dbType);

    // Dashboards table
    await db.run(`
      CREATE TABLE IF NOT EXISTS dashboards (
        ${helper.primaryKey('id')},
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        layout TEXT NOT NULL,
        is_default ${helper.boolean()} DEFAULT ${helper.booleanValue(false)},
        is_shared ${helper.boolean()} DEFAULT ${helper.booleanValue(false)},
        created_at ${helper.timestamp()},
        updated_at ${helper.timestamp()},
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_dashboards_user 
      ON dashboards(user_id)
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_dashboards_default 
      ON dashboards(user_id, is_default)
    `);

    console.log('✅ Migration 014: Dashboard tables created');
  },

  down: async (db) => {
    await db.run('DROP TABLE IF EXISTS dashboards');
    console.log('✅ Migration 014: Dashboard tables dropped');
  }
};
