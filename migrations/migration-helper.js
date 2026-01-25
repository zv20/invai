/**
 * Migration Helper - Sprint 4 Phase 1: PostgreSQL Support
 * 
 * Provides adapter-aware SQL generation for migrations.
 * Automatically handles syntax differences between SQLite and PostgreSQL.
 * 
 * Usage in migrations:
 *   const helper = require('./migration-helper')(adapter);
 *   await helper.createTable('users', {...});
 *   await helper.addColumn('users', 'email', 'VARCHAR(255)');
 */

module.exports = function(adapter) {
  const dbType = adapter.getType();
  
  return {
    /**
     * Check if table exists
     */
    async tableExists(tableName) {
      if (dbType === 'postgres') {
        const row = await adapter.get(
          `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = ?)`,
          [tableName]
        );
        return row?.exists || false;
      } else {
        const row = await adapter.get(
          `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
          [tableName]
        );
        return !!row;
      }
    },
    
    /**
     * Check if column exists
     */
    async columnExists(tableName, columnName) {
      if (dbType === 'postgres') {
        const row = await adapter.get(
          `SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = ? AND column_name = ?)`,
          [tableName, columnName]
        );
        return row?.exists || false;
      } else {
        const row = await adapter.get(
          `PRAGMA table_info(${tableName})`
        );
        return row?.name === columnName;
      }
    },
    
    /**
     * Run SQL with error handling
     */
    async runSQL(sql, params = []) {
      return await adapter.run(sql, params);
    },
    
    /**
     * Execute multiple SQL statements
     */
    async execSQL(sql) {
      return await adapter.exec(sql);
    },
    
    /**
     * Get database-specific syntax
     */
    getSyntax(feature) {
      return adapter.getSyntax(feature);
    },
    
    /**
     * Get database type
     */
    getType() {
      return dbType;
    },
    
    /**
     * Create table if not exists (adapter-aware)
     */
    async createTableIfNotExists(tableName, columns) {
      const exists = await this.tableExists(tableName);
      if (exists) {
        console.log(`  ℹ️  ${tableName} table already exists, skipping creation`);
        return false;
      }
      
      // Build CREATE TABLE statement with adapter-specific syntax
      const columnDefs = columns.map(col => {
        if (col.type === 'AUTOINCREMENT') {
          return `id ${adapter.getSyntax('autoincrement')}`;
        }
        return `${col.name} ${col.type}${col.default ? ` DEFAULT ${col.default}` : ''}`;
      }).join(',\n    ');
      
      const sql = `CREATE TABLE ${tableName} (\n    ${columnDefs}\n  )`;
      
      await adapter.run(sql);
      console.log(`  ✓ Created ${tableName} table`);
      return true;
    },
    
    /**
     * Add column if not exists
     */
    async addColumnIfNotExists(tableName, columnName, columnType) {
      const exists = await this.columnExists(tableName, columnName);
      if (exists) {
        console.log(`  ℹ️  Column ${tableName}.${columnName} already exists, skipping`);
        return false;
      }
      
      const sql = `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`;
      await adapter.run(sql);
      console.log(`  ✓ Added column ${tableName}.${columnName}`);
      return true;
    },
    
    /**
     * Create index if not exists
     */
    async createIndexIfNotExists(indexName, tableName, columns) {
      const columnList = Array.isArray(columns) ? columns.join(', ') : columns;
      const sql = `${adapter.getSyntax('create_index')} ${indexName} ON ${tableName}(${columnList})`;
      await adapter.run(sql);
      return true;
    },
    
    /**
     * Drop table if exists
     */
    async dropTableIfExists(tableName) {
      const sql = `${adapter.getSyntax('drop_table')} ${tableName}`;
      await adapter.run(sql);
      return true;
    },
    
    /**
     * Drop index if exists
     */
    async dropIndexIfExists(indexName) {
      const sql = `DROP INDEX IF EXISTS ${indexName}`;
      await adapter.run(sql);
      return true;
    }
  };
};