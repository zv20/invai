/**
 * Batch Controller
 * Business logic for inventory batch operations
 */

class BatchController {
  constructor(db, activityLogger) {
    this.db = db;
    this.activityLogger = activityLogger;
  }

  /**
   * Generate a unique batch number
   * Format: BATCH-YYYYMMDD-HHMMSS-XXXX
   */
  generateBatchNumber() {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const time = now.toISOString().slice(11, 19).replace(/:/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `BATCH-${date}-${time}-${random}`;
  }

  async getBatchesByProduct(productId) {
    const query = `
      SELECT ib.*, p.name as product_name, p.items_per_case,
             JULIANDAY(ib.expiry_date) - JULIANDAY('now') as days_until_expiry
      FROM inventory_batches ib
      JOIN products p ON ib.product_id = p.id
      WHERE ib.product_id = ?
      ORDER BY 
        CASE WHEN ib.expiry_date IS NULL THEN 1 ELSE 0 END,
        ib.expiry_date ASC,
        ib.received_date ASC
    `;
    return await this.db.all(query, [productId]);
  }

  async getBatchById(id) {
    const query = `
      SELECT ib.*, p.name as product_name, p.items_per_case
      FROM inventory_batches ib
      JOIN products p ON ib.product_id = p.id
      WHERE ib.id = ?
    `;
    return await this.db.get(query, [id]);
  }

  async createBatch(batchData, username) {
    const { product_id, case_quantity, total_quantity, expiry_date, location, notes, received_date } = batchData;
    
    // Auto-generate batch_number if not provided
    const batch_number = batchData.batch_number || this.generateBatchNumber();
    
    const result = await this.db.run(
      `INSERT INTO inventory_batches (product_id, batch_number, case_quantity, total_quantity, expiry_date, location, notes, received_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [product_id, batch_number, case_quantity, total_quantity || case_quantity, expiry_date || null, 
       location || '', notes || '', received_date || new Date().toISOString().split('T')[0]]
    );

    const product = await this.db.get('SELECT name FROM products WHERE id = ?', [product_id]);
    await this.activityLogger.log('batch', result.lastID, 'created', username, {
      product: product.name,
      quantity: total_quantity || case_quantity,
      batch_number
    });

    return await this.getBatchById(result.lastID);
  }

  async updateBatch(id, batchData, username) {
    const { case_quantity, total_quantity, expiry_date, location, notes } = batchData;
    
    await this.db.run(
      `UPDATE inventory_batches 
       SET case_quantity = ?, total_quantity = ?, expiry_date = ?, location = ?, notes = ?
       WHERE id = ?`,
      [case_quantity, total_quantity, expiry_date || null, location || '', notes || '', id]
    );

    const batch = await this.getBatchById(id);
    await this.activityLogger.log('batch', id, 'updated', username, {
      product: batch.product_name,
      quantity: total_quantity
    });

    return batch;
  }

  async deleteBatch(id, username) {
    const batch = await this.getBatchById(id);
    if (!batch) return null;

    await this.db.run('DELETE FROM inventory_batches WHERE id = ?', [id]);
    await this.activityLogger.log('batch', id, 'deleted', username, {
      product: batch.product_name,
      quantity: batch.total_quantity
    });

    return batch;
  }

  async adjustBatchQuantity(id, adjustment, reason, username) {
    const batch = await this.getBatchById(id);
    if (!batch) return null;

    const newQuantity = batch.total_quantity + adjustment;
    if (newQuantity < 0) {
      throw new Error('Adjustment would result in negative quantity');
    }

    await this.db.run(
      'UPDATE inventory_batches SET total_quantity = ? WHERE id = ?',
      [newQuantity, id]
    );

    await this.activityLogger.log('batch', id, 'adjusted', username, {
      product: batch.product_name,
      adjustment,
      reason,
      oldQuantity: batch.total_quantity,
      newQuantity
    });

    return await this.getBatchById(id);
  }

  async getExpiringBatches(daysThreshold = 30) {
    const query = `
      SELECT ib.*, p.name as product_name,
             JULIANDAY(ib.expiry_date) - JULIANDAY('now') as days_until_expiry
      FROM inventory_batches ib
      JOIN products p ON ib.product_id = p.id
      WHERE ib.expiry_date IS NOT NULL 
        AND JULIANDAY(ib.expiry_date) - JULIANDAY('now') <= ?
      ORDER BY ib.expiry_date ASC
    `;
    return await this.db.all(query, [daysThreshold]);
  }

  async bulkCreateBatches(batchesData, username) {
    const results = [];
    
    for (const batchData of batchesData) {
      try {
        const batch = await this.createBatch(batchData, username);
        results.push({ success: true, batch });
      } catch (error) {
        results.push({ success: false, error: error.message, data: batchData });
      }
    }
    
    return results;
  }
}

module.exports = BatchController;
