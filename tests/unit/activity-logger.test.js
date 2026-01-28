/**
 * Unit Tests for Activity Logger
 * Tests activity logging and audit trail functionality
 */

const ActivityLogger = require('../../lib/activity-logger');
const sqlite3 = require('sqlite3').verbose();

describe('ActivityLogger', () => {
  let db;
  let logger;
  let dbClosed = false;

  beforeEach((done) => {
    dbClosed = false;
    // Create in-memory database for testing
    db = new sqlite3.Database(':memory:');
    
    // Create activity_log table
    db.run(`
      CREATE TABLE activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action_type TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        entity_name TEXT,
        description TEXT,
        old_value TEXT,
        new_value TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) done(err);
      else {
        logger = new ActivityLogger(db);
        done();
      }
    });
  });

  afterEach((done) => {
    if (db && !dbClosed) {
      db.close(done);
    } else {
      done();
    }
  });

  describe('Logging Operations', () => {
    test('should log product creation', async () => {
      const result = await logger.log(
        'create',
        'product',
        1,
        'Whole Milk',
        'Created new product: Whole Milk'
      );

      expect(result.logged).toBe(true);
      expect(result.id).toBeDefined();

      const logs = await logger.getRecent(10);
      expect(logs).toHaveLength(1);
      expect(logs[0].action_type).toBe('create');
      expect(logs[0].entity_type).toBe('product');
      expect(logs[0].entity_name).toBe('Whole Milk');
    });

    test('should log product update with old/new values', async () => {
      const oldValue = { name: 'Milk', price: 3.99 };
      const newValue = { name: 'Whole Milk', price: 4.99 };

      await logger.log(
        'update',
        'product',
        1,
        'Whole Milk',
        'Updated product name and price',
        oldValue,
        newValue
      );

      const logs = await logger.getRecent(10);
      expect(logs[0].old_value).toContain('Milk');
      expect(logs[0].old_value).toContain('3.99');
      expect(logs[0].new_value).toContain('Whole Milk');
      expect(logs[0].new_value).toContain('4.99');
    });

    test('should log batch quantity adjustment', async () => {
      await logger.log(
        'adjust',
        'batch',
        5,
        'Milk Batch #1',
        'Adjusted quantity -2 (expired items removed)'
      );

      const logs = await logger.getForEntity('batch', 5);
      expect(logs).toHaveLength(1);
      expect(logs[0].description).toContain('Adjusted quantity');
    });

    test('should log product deletion', async () => {
      await logger.log(
        'delete',
        'product',
        10,
        'Old Product',
        'Deleted discontinued product'
      );

      const logs = await logger.getRecent(10);
      expect(logs[0].action_type).toBe('delete');
      expect(logs[0].entity_id).toBe(10);
    });

    test('should handle logging errors gracefully', async () => {
      // Close main database and mark it
      await new Promise(resolve => db.close(resolve));
      dbClosed = true;

      const result = await logger.log(
        'create',
        'product',
        1,
        'Test',
        'This should fail'
      );

      expect(result.logged).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Retrieval Operations', () => {
    beforeEach(async () => {
      // Add multiple log entries - no delays needed with id-based ordering
      await logger.log('create', 'product', 1, 'Product 1', 'Created Product 1');
      await logger.log('update', 'product', 1, 'Product 1', 'Updated Product 1');
      await logger.log('create', 'product', 2, 'Product 2', 'Created Product 2');
      await logger.log('create', 'batch', 1, 'Batch 1', 'Created Batch 1');
      await logger.log('adjust', 'batch', 1, 'Batch 1', 'Adjusted Batch 1');
    });

    test('should get recent activity in reverse chronological order', async () => {
      const logs = await logger.getRecent(10);
      
      expect(logs).toHaveLength(5);
      // Most recent should be last inserted (highest ID)
      expect(logs[0].description).toBe('Adjusted Batch 1');
      // Oldest should be first inserted (lowest ID)
      expect(logs[4].description).toBe('Created Product 1');
    });

    test('should limit results correctly', async () => {
      const logs = await logger.getRecent(3);
      expect(logs).toHaveLength(3);
    });

    test('should get entity-specific history', async () => {
      const productLogs = await logger.getForEntity('product', 1);
      
      expect(productLogs).toHaveLength(2);
      // Most recent first (update has higher ID than create)
      expect(productLogs[0].action_type).toBe('update');
      expect(productLogs[1].action_type).toBe('create');
    });

    test('should return empty array for non-existent entity', async () => {
      const logs = await logger.getForEntity('product', 9999);
      expect(logs).toEqual([]);
    });

    test('should handle different entity types', async () => {
      const productLogs = await logger.getForEntity('product', 1);
      const batchLogs = await logger.getForEntity('batch', 1);
      
      expect(productLogs.length).toBeGreaterThan(0);
      expect(batchLogs.length).toBeGreaterThan(0);
      expect(productLogs[0].entity_type).toBe('product');
      expect(batchLogs[0].entity_type).toBe('batch');
    });
  });

  describe('Cleanup Operations', () => {
    test('should cleanup old logs keeping last 1000', async () => {
      // Add 1005 log entries
      for (let i = 1; i <= 1005; i++) {
        await logger.log('create', 'product', i, `Product ${i}`, `Log entry ${i}`);
      }

      const result = await logger.cleanup();
      
      expect(result.deleted).toBe(5);
      
      const remaining = await logger.getRecent(2000);
      expect(remaining).toHaveLength(1000);
    });

    test('should not delete anything if under 1000 logs', async () => {
      await logger.log('create', 'product', 1, 'Product 1', 'Test');
      await logger.log('create', 'product', 2, 'Product 2', 'Test');

      const result = await logger.cleanup();
      
      expect(result.deleted).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle null values in optional fields', async () => {
      const result = await logger.log(
        'create',
        'product',
        1,
        'Test Product',
        'Created product',
        null,
        null
      );

      expect(result.logged).toBe(true);
      
      const logs = await logger.getRecent(10);
      expect(logs[0].old_value).toBeNull();
      expect(logs[0].new_value).toBeNull();
    });

    test('should handle empty strings', async () => {
      await logger.log('create', 'product', 1, '', '');
      
      const logs = await logger.getRecent(10);
      expect(logs[0].entity_name).toBe('');
      expect(logs[0].description).toBe('');
    });

    test('should handle special characters in descriptions', async () => {
      await logger.log(
        'create',
        'product',
        1,
        'Product "Special"',
        'Description with <html> & special chars'
      );

      const logs = await logger.getRecent(10);
      expect(logs[0].entity_name).toContain('Special');
      expect(logs[0].description).toContain('special chars');
    });
  });
});
