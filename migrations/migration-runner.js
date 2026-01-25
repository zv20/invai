/**
 * Migration Runner - Sprint 4 Phase 1: PostgreSQL Support
 * 
 * Enhanced to work with database adapters:
 * - Supports both SQLite and PostgreSQL
 * - Uses adapter interface for all database operations
 * - Maintains backward compatibility
 */

class MigrationRunner {
  constructor(dbAdapter) {
    this.adapter = dbAdapter;
    this.migrationsPath = __dirname;
  }

  /**
   * Initialize migration system - create schema_migrations table
   */
  async initialize() {
    const sql = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        ${this.adapter.getSyntax('autoincrement')},
        version INTEGER NOT NULL UNIQUE,
        name TEXT NOT NULL,
        applied_at ${this.adapter.getSyntax('timestamp_default')},
        status TEXT DEFAULT 'completed'
      )
    `;
    
    await this.adapter.run(sql);
  }

  /**
   * Get current schema version
   */
  async getCurrentVersion() {
    const row = await this.adapter.get(
      'SELECT MAX(version) as version FROM schema_migrations'
    );
    return row?.version || 0;
  }

  /**
   * Check if a migration has been applied
   */
  async isMigrationApplied(version) {
    const row = await this.adapter.get(
      'SELECT version FROM schema_migrations WHERE version = ?',
      [version]
    );
    return !!row;
  }

  /**
   * Record a migration as applied
   */
  async recordMigration(version, name) {
    await this.adapter.run(
      'INSERT INTO schema_migrations (version, name) VALUES (?, ?)',
      [version, name]
    );
  }

  /**
   * Get migration history
   */
  async getHistory() {
    const rows = await this.adapter.all(
      'SELECT * FROM schema_migrations ORDER BY version DESC'
    );
    return rows || [];
  }

  /**
   * Run auto-cleanup if needed
   */
  async runAutoCleanup() {
    if (!global.needsMigrationCleanup) {
      return { cleaned: false, message: 'No cleanup needed' };
    }

    console.log('\n🧹 Auto-cleanup triggered...');

    try {
      const cleanup = require('./cleanup-old-migrations');
      const result = cleanup.cleanupOldMigrations();
      const verified = cleanup.verifyCleanup();

      if (verified) {
        console.log('✅ Auto-cleanup completed successfully!\n');
        global.needsMigrationCleanup = false;
        return { cleaned: true, ...result };
      } else {
        console.warn('⚠️  Auto-cleanup completed with warnings\n');
        return { cleaned: true, verified: false, ...result };
      }
    } catch (err) {
      console.error('❌ Auto-cleanup failed:', err.message);
      console.log('💡 You can manually run: node migrations/cleanup-old-migrations.js\n');
      return { cleaned: false, error: err.message };
    }
  }

  /**
   * Run all pending migrations
   */
  async runPendingMigrations(backupFunction) {
    const fs = require('fs');
    const path = require('path');

    // Get all migration files
    const migrationFiles = fs.readdirSync(this.migrationsPath)
      .filter(file => file.match(/^\d{3}_.*\.js$/))
      .sort();

    if (migrationFiles.length === 0) {
      return { migrationsRun: 0, message: 'No migrations found' };
    }

    const currentVersion = await this.getCurrentVersion();
    let migrationsRun = 0;

    for (const file of migrationFiles) {
      const migrationPath = path.join(this.migrationsPath, file);
      const migration = require(migrationPath);

      const isApplied = await this.isMigrationApplied(migration.version);

      if (!isApplied) {
        console.log(`\n🔄 Running migration ${migration.version}: ${migration.name}`);

        // Create backup before migration if backup function provided
        if (backupFunction) {
          try {
            const backup = await backupFunction(`pre_migration_${migration.version}`);
            if (backup.filename !== 'n/a') {
              console.log(`   📦 Backup created: ${backup.filename}`);
            }
          } catch (err) {
            console.error(`   ⚠️  Backup failed: ${err.message}`);
            throw new Error(`Migration aborted: Could not create backup`);
          }
        }

        // Run the migration with adapter
        try {
          await migration.up(this.adapter);
          await this.recordMigration(migration.version, migration.name);
          console.log(`   ✅ Migration ${migration.version} completed successfully`);
          migrationsRun++;
        } catch (err) {
          console.error(`   ❌ Migration ${migration.version} failed:`, err.message);
          throw err;
        }
      }
    }

    // Check if cleanup is needed after all migrations
    if (global.needsMigrationCleanup) {
      await this.runAutoCleanup();
    }

    if (migrationsRun === 0) {
      return {
        migrationsRun: 0,
        message: `Database is up to date (v${currentVersion})`
      };
    }

    const newVersion = await this.getCurrentVersion();
    return {
      migrationsRun,
      message: `Applied ${migrationsRun} migration${migrationsRun !== 1 ? 's' : ''} (v${currentVersion} → v${newVersion})`
    };
  }
}

module.exports = MigrationRunner;