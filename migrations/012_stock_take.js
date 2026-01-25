/**
 * Migration 012: Stock Take / Physical Inventory
 * 
 * Adds complete stock count workflow:
 * - Stock count sessions
 * - Individual count items
 * - Variance adjustments
 * - Audit trail
 * 
 * Created: 2026-01-25
 * Sprint 4 Phase 3
 */

const helper = require('./migration-helper');

module.exports = {
  version: 12,
  name: 'stock_take',
  description: 'Add stock take / physical inventory system',
  
  async up(adapter) {
    console.log('Running migration 012: Stock Take');
    const h = helper(adapter);
    
    try {
      // 1. Stock counts table (sessions)
      await h.createTableIfNotExists('stock_counts', [
        { type: 'AUTOINCREMENT' },
        { name: 'count_name', type: 'TEXT NOT NULL' },
        { name: 'location', type: 'TEXT' },
        { name: 'started_by', type: 'INTEGER NOT NULL' },
        { name: 'started_at', type: h.getSyntax('timestamp_default') },
        { name: 'completed_at', type: h.getSyntax('timestamp') },
        { name: 'status', type: 'TEXT DEFAULT \'in_progress\'' },
        { name: 'notes', type: 'TEXT' },
        { name: 'FOREIGN KEY (started_by) REFERENCES users(id)' }
      ]);
      
      // 2. Stock count items table
      await h.createTableIfNotExists('stock_count_items', [
        { type: 'AUTOINCREMENT' },
        { name: 'count_id', type: 'INTEGER NOT NULL' },
        { name: 'product_id', type: 'INTEGER NOT NULL' },
        { name: 'batch_id', type: 'INTEGER' },
        { name: 'expected_quantity', type: 'INTEGER NOT NULL' },
        { name: 'counted_quantity', type: 'INTEGER' },
        { name: 'variance', type: 'INTEGER DEFAULT 0' },
        { name: 'variance_cost', type: 'REAL DEFAULT 0' },
        { name: 'adjustment_reason', type: 'TEXT' },
        { name: 'adjustment_notes', type: 'TEXT' },
        { name: 'counted_at', type: h.getSyntax('timestamp') },
        { name: 'counted_by', type: 'INTEGER' },
        { name: 'FOREIGN KEY (count_id) REFERENCES stock_counts(id) ON DELETE CASCADE' },
        { name: 'FOREIGN KEY (product_id) REFERENCES products(id)' },
        { name: 'FOREIGN KEY (batch_id) REFERENCES inventory_batches(id)' },
        { name: 'FOREIGN KEY (counted_by) REFERENCES users(id)' }
      ]);
      
      // 3. Variance adjustments table (approved adjustments)
      await h.createTableIfNotExists('variance_adjustments', [
        { type: 'AUTOINCREMENT' },
        { name: 'count_item_id', type: 'INTEGER NOT NULL' },
        { name: 'product_id', type: 'INTEGER NOT NULL' },
        { name: 'batch_id', type: 'INTEGER' },
        { name: 'adjustment_quantity', type: 'INTEGER NOT NULL' },
        { name: 'adjustment_reason', type: 'TEXT NOT NULL' },
        { name: 'cost_impact', type: 'REAL DEFAULT 0' },
        { name: 'approved_by', type: 'INTEGER NOT NULL' },
        { name: 'approved_at', type: h.getSyntax('timestamp_default') },
        { name: 'notes', type: 'TEXT' },
        { name: 'FOREIGN KEY (count_item_id) REFERENCES stock_count_items(id)' },
        { name: 'FOREIGN KEY (product_id) REFERENCES products(id)' },
        { name: 'FOREIGN KEY (batch_id) REFERENCES inventory_batches(id)' },
        { name: 'FOREIGN KEY (approved_by) REFERENCES users(id)' }
      ]);
      
      // Create indexes
      await h.createIndexIfNotExists('idx_stock_counts_status', 'stock_counts', 'status');
      await h.createIndexIfNotExists('idx_stock_counts_started_by', 'stock_counts', 'started_by');
      await h.createIndexIfNotExists('idx_stock_count_items_count_id', 'stock_count_items', 'count_id');
      await h.createIndexIfNotExists('idx_stock_count_items_product_id', 'stock_count_items', 'product_id');
      await h.createIndexIfNotExists('idx_variance_adjustments_product_id', 'variance_adjustments', 'product_id');
      
      console.log('✅ Migration 012 completed successfully');
      
    } catch (error) {
      console.error('❌ Migration 012 failed:', error);
      throw error;
    }
  },
  
  async down(adapter) {
    console.log('Rolling back migration 012: Stock Take');
    const h = helper(adapter);
    
    try {
      await h.dropIndexIfExists('idx_variance_adjustments_product_id');
      await h.dropIndexIfExists('idx_stock_count_items_product_id');
      await h.dropIndexIfExists('idx_stock_count_items_count_id');
      await h.dropIndexIfExists('idx_stock_counts_started_by');
      await h.dropIndexIfExists('idx_stock_counts_status');
      
      await h.dropTableIfExists('variance_adjustments');
      await h.dropTableIfExists('stock_count_items');
      await h.dropTableIfExists('stock_counts');
      
      console.log('✅ Migration 012 rollback completed');
      
    } catch (error) {
      console.error('❌ Migration 012 rollback failed:', error);
      throw error;
    }
  }
};