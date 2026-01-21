/**
 * Migration Runner
 * Handles database schema migrations with version tracking
 */

class MigrationRunner {
  constructor(db) {
    this.db = db;
    this.migrationsPath = __dirname;
  }

  /**
   * Initialize migration system - create schema_migrations table
   */
  async initialize() {
    return new Promise((resolve, reject) => {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          version INTEGER NOT NULL UNIQUE,
          name TEXT NOT NULL,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Get current schema version
   */
  async getCurrentVersion() {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT MAX(version) as version FROM schema_migrations',
        [],
        (err, row) => {
          if (err) reject(err);
          else resolve(row?.version || 0);
        }
      );
    });
  }

  /**
   * Check if a migration has been applied
   */
  async isMigrationApplied(version) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT version FROM schema_migrations WHERE version = ?',
        [version],
        (err, row) => {
          if (err) reject(err);
          else resolve(!!row);
        }
      );
    });
  }

  /**
   * Record a migration as applied
   */
  async recordMigration(version, name) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO schema_migrations (version, name) VALUES (?, ?)',
        [version, name],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  /**
   * Get migration history
   */
  async getHistory() {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM schema_migrations ORDER BY version DESC',
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
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
            console.log(`   📦 Backup created: ${backup.filename}`);
          } catch (err) {
            console.error(`   ⚠️  Backup failed: ${err.message}`);
            throw new Error(`Migration aborted: Could not create backup`);
          }
        }

        // Run the migration
        try {
          await migration.up(this.db);
          await this.recordMigration(migration.version, migration.name);
          console.log(`   ✅ Migration ${migration.version} completed successfully`);
          migrationsRun++;
        } catch (err) {
          console.error(`   ❌ Migration ${migration.version} failed:`, err.message);
          throw err;
        }
      }
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