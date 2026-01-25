/**
 * Migration 013: Search and Saved Searches Tables
 * Creates tables for search history and saved searches
 */

const MigrationHelper = require('../lib/migration-helper');

module.exports = {
  up: async (db, dbType) => {
    const helper = new MigrationHelper(dbType);

    // Search history table
    await db.run(`
      CREATE TABLE IF NOT EXISTS search_history (
        ${helper.primaryKey('id')},
        user_id INTEGER,
        query TEXT NOT NULL,
        results_count INTEGER DEFAULT 0,
        created_at ${helper.timestamp()},
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_search_history_user 
      ON search_history(user_id)
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_search_history_created 
      ON search_history(created_at)
    `);

    // Saved searches table
    await db.run(`
      CREATE TABLE IF NOT EXISTS saved_searches (
        ${helper.primaryKey('id')},
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        query TEXT,
        filters TEXT,
        is_shared ${helper.boolean()} DEFAULT ${helper.booleanValue(false)},
        use_count INTEGER DEFAULT 0,
        last_used_at ${helper.timestamp()},
        created_at ${helper.timestamp()},
        updated_at ${helper.timestamp()},
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_saved_searches_user 
      ON saved_searches(user_id)
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_saved_searches_shared 
      ON saved_searches(is_shared)
    `);

    console.log('✅ Migration 013: Search tables created');
  },

  down: async (db) => {
    await db.run('DROP TABLE IF EXISTS search_history');
    await db.run('DROP TABLE IF EXISTS saved_searches');
    console.log('✅ Migration 013: Search tables dropped');
  }
};
