const fs = require('fs');
const path = require('path');

/**
 * Migration Runner - Handles database schema migrations
 * Ensures safe, automatic database updates with rollback capability
 */
class MigrationRunner {
  constructor(db) {
    this.db = db;
    this.migrationsDir = path.join(__dirname);
  }

  /**
   * Initialize migration system - create schema_migrations table if not exists
   */
  async initialize() {
    return new Promise((resolve, reject) => {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          version INTEGER UNIQUE NOT NULL,
          name TEXT NOT NULL,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          execution_time_ms INTEGER,
          status TEXT DEFAULT 'completed',
          checksum TEXT
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Get current database schema version
   */
  async getCurrentVersion() {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT MAX(version) as version FROM schema_migrations WHERE status = 'completed'`,
        (err, row) => {
          if (err) reject(err);
          else resolve(row?.version || 0);
        }
      );
    });
  }

  /**
   * Load all migration files from migrations directory
   */
  async loadMigrationFiles() {
    const files = fs.readdirSync(this.migrationsDir)
      .filter(f => f.endsWith('.js') && f !== 'migration-runner.js')
      .sort();

    const migrations = [];
    for (const file of files) {
      const migration = require(path.join(this.migrationsDir, file));
      migrations.push(migration);
    }

    return migrations.sort((a, b) => a.version - b.version);
  }

  /**
   * Get list of pending migrations
   */
  async getPendingMigrations() {
    const currentVersion = await this.getCurrentVersion();
    const allMigrations = await this.loadMigrationFiles();
    return allMigrations.filter(m => m.version > currentVersion);
  }

  /**
   * Run a single migration
   */
  async runMigration(migration) {
    const startTime = Date.now();

    return new Promise(async (resolve, reject) => {
      try {
        // Start transaction
        await this.runQuery('BEGIN TRANSACTION');

        console.log(`   Running: ${migration.name}...`);

        // Execute migration
        await migration.up(this.db);

        // Verify migration succeeded
        if (migration.verify) {
          const verified = await migration.verify(this.db);
          if (!verified) {
            throw new Error('Migration verification failed');
          }
        }

        const executionTime = Date.now() - startTime;

        // Record migration in schema_migrations table
        await this.runQuery(
          `INSERT INTO schema_migrations (version, name, execution_time_ms, status) 
           VALUES (?, ?, ?, 'completed')`,
          [migration.version, migration.name, executionTime]
        );

        // Commit transaction
        await this.runQuery('COMMIT');

        console.log(`   ✓ Completed in ${executionTime}ms`);
        resolve();

      } catch (error) {
        // Rollback on error
        await this.runQuery('ROLLBACK').catch(() => {});
        reject(error);
      }
    });
  }

  /**
   * Run all pending migrations
   */
  async runPendingMigrations(createBackupFn) {
    const pending = await this.getPendingMigrations();

    if (pending.length === 0) {
      return { migrationsRun: 0, message: 'Database is up to date' };
    }

    console.log(`⏳ Found ${pending.length} pending migration(s)`);

    // Create backup before running migrations
    if (createBackupFn) {
      console.log('💾 Creating safety backup...');
      try {
        await createBackupFn('pre-migration');
        console.log('   ✓ Backup created');
      } catch (error) {
        console.error('   ⚠️  Backup failed:', error.message);
        throw new Error('Cannot proceed with migration without backup');
      }
    }

    // Run each migration
    for (const migration of pending) {
      console.log(`⬆️  Migration ${migration.version}: ${migration.name}`);
      await this.runMigration(migration);
    }

    return {
      migrationsRun: pending.length,
      message: `Successfully applied ${pending.length} migration(s)`
    };
  }

  /**
   * Get migration history
   */
  async getHistory() {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM schema_migrations ORDER BY version DESC`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  /**
   * Helper: Run a query as a promise
   */
  runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }
}

module.exports = MigrationRunner;
