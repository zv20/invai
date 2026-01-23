/**
 * Batch Controller with Transaction Support
 * Phase 1: Transactions prevent race conditions in bulk operations
 * Phase 2: Business logic separated from routes
 */

const { AppError } = require('../middleware/errorHandler');

class BatchController {
  constructor(db, activityLogger) {
    this.db = db;
    this.activityLogger = activityLogger;
  }

  async getBatchesByProduct(productId) {
    return await this.db.all(
      'SELECT * FROM inventory_batches WHERE product_id = ? ORDER BY expiry_date, received_date',
      [productId]
    );
  }

  async getBatchById(id) {
    const batch = await this.db.get('SELECT * FROM inventory_batches WHERE id = ?', [id]);
    if (!batch) {
      throw new AppError('Batch not found', 404, 'BATCH_NOT_FOUND');
    }
    return batch;
  }

  async createBatch(data) {
    const { product_id, case_quantity, expiry_date, location, notes } = data;
    
    if (!product_id || !case_quantity) {
      throw new AppError('Product ID and case quantity are required', 400, 'VALIDATION_ERROR');
    }

    const product = await this.db.get('SELECT items_per_case, name FROM products WHERE id = ?', [product_id]);
    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    const itemsPerCase = product.items_per_case || 1;
    const totalQuantity = case_quantity * itemsPerCase;

    const result = await this.db.run(
      `INSERT INTO inventory_batches (product_id, case_quantity, total_quantity, expiry_date, location, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [product_id, case_quantity, totalQuantity, expiry_date || null, location || '', notes || '']
    );

    if (this.activityLogger) {
      await this.activityLogger.log(
        'create',
        'batch',
        result.lastID,
        `Batch for ${product.name}`,
        `Added batch: ${case_quantity} cases (${totalQuantity} items)${expiry_date ? `, expires ${expiry_date}` : ''}`,
        null,
        { product_id, case_quantity, total_quantity: totalQuantity, expiry_date, location }
      );
    }

    return { id: result.lastID, total_quantity: totalQuantity, message: 'Batch added successfully' };
  }

  async updateBatch(id, data) {
    const { case_quantity, total_quantity, expiry_date, location, notes } = data;

    const result = await this.db.run(
      `UPDATE inventory_batches
       SET case_quantity = ?, total_quantity = ?, expiry_date = ?, location = ?, notes = ?
       WHERE id = ?`,
      [case_quantity, total_quantity, expiry_date || null, location || '', notes || '', id]
    );

    if (result.changes === 0) {
      throw new AppError('Batch not found', 404, 'BATCH_NOT_FOUND');
    }

    if (this.activityLogger) {
      await this.activityLogger.log('update', 'batch', id, `Batch #${id}`, `Updated batch details`);
    }

    return { message: 'Batch updated successfully' };
  }

  async deleteBatch(id) {
    const result = await this.db.run('DELETE FROM inventory_batches WHERE id = ?', [id]);

    if (result.changes === 0) {
      throw new AppError('Batch not found', 404, 'BATCH_NOT_FOUND');
    }

    if (this.activityLogger) {
      await this.activityLogger.log('delete', 'batch', id, `Batch #${id}`, `Deleted batch`);
    }

    return { message: 'Batch deleted successfully' };
  }

  // CRITICAL FIX: Bulk delete with transaction support
  async bulkDelete(batchIds) {
    if (!Array.isArray(batchIds) || batchIds.length === 0) {
      throw new AppError('Batch IDs array required', 400, 'VALIDATION_ERROR');
    }

    return await this.db.transaction(async () => {
      const placeholders = batchIds.map(() => '?').join(',');
      const result = await this.db.run(
        `DELETE FROM inventory_batches WHERE id IN (${placeholders})`,
        batchIds
      );

      if (this.activityLogger) {
        await this.activityLogger.log(
          'delete',
          'batch',
          0,
          'Multiple Batches',
          `Deleted ${result.changes} batch${result.changes !== 1 ? 'es' : ''}`
        );
      }

      return { 
        message: `Deleted ${result.changes} batch${result.changes !== 1 ? 'es' : ''}`, 
        count: result.changes 
      };
    });
  }

  // CRITICAL FIX: Bulk location update with transaction support
  async bulkUpdateLocation(batchIds, location) {
    if (!Array.isArray(batchIds) || !location) {
      throw new AppError('Batch IDs and location required', 400, 'VALIDATION_ERROR');
    }

    return await this.db.transaction(async () => {
      const placeholders = batchIds.map(() => '?').join(',');
      const result = await this.db.run(
        `UPDATE inventory_batches SET location = ? WHERE id IN (${placeholders})`,
        [location, ...batchIds]
      );

      if (this.activityLogger) {
        await this.activityLogger.log(
          'update',
          'batch',
          0,
          'Multiple Batches',
          `Updated location to "${location}" for ${result.changes} batch${result.changes !== 1 ? 'es' : ''}`
        );
      }

      return { 
        message: `Updated ${result.changes} batch${result.changes !== 1 ? 'es' : ''}`, 
        count: result.changes 
      };
    });
  }

  // CRITICAL FIX: Bulk quantity adjust with transaction support
  async bulkAdjust(batchIds, adjustment) {
    if (!Array.isArray(batchIds) || adjustment === undefined) {
      throw new AppError('Batch IDs and adjustment value required', 400, 'VALIDATION_ERROR');
    }

    return await this.db.transaction(async () => {
      const placeholders = batchIds.map(() => '?').join(',');
      const result = await this.db.run(
        `UPDATE inventory_batches 
         SET total_quantity = MAX(0, total_quantity + ?)
         WHERE id IN (${placeholders})`,
        [adjustment, ...batchIds]
      );

      if (this.activityLogger) {
        await this.activityLogger.log(
          'update',
          'batch',
          0,
          'Multiple Batches',
          `Adjusted quantity by ${adjustment > 0 ? '+' : ''}${adjustment} for ${result.changes} batch${result.changes !== 1 ? 'es' : ''}`
        );
      }

      return { 
        message: `Adjusted ${result.changes} batch${result.changes !== 1 ? 'es' : ''}`, 
        count: result.changes 
      };
    });
  }

  // Quick adjust for single batch
  async adjustQuantity(id, adjustment, reason) {
    if (!adjustment || adjustment === 0) {
      throw new AppError('Adjustment value required', 400, 'VALIDATION_ERROR');
    }

    const batch = await this.getBatchById(id);
    const newQuantity = batch.total_quantity + adjustment;

    if (newQuantity < 0) {
      throw new AppError('Cannot reduce quantity below zero', 400, 'INVALID_QUANTITY');
    }

    const result = await this.db.run(
      'UPDATE inventory_batches SET total_quantity = ?, case_quantity = ? WHERE id = ?',
      [newQuantity, Math.ceil(newQuantity / (batch.total_quantity / batch.case_quantity || 1)), id]
    );

    if (this.activityLogger) {
      await this.activityLogger.log(
        'update',
        'batch',
        id,
        `Batch #${id}`,
        `Adjusted quantity by ${adjustment > 0 ? '+' : ''}${adjustment} (${reason || 'Manual adjustment'})`,
        { old_quantity: batch.total_quantity },
        { new_quantity: newQuantity }
      );
    }

    return { 
      message: 'Quantity adjusted', 
      newQuantity,
      adjustment,
      reason: reason || 'Manual adjustment'
    };
  }

  // Mark batch as empty
  async markEmpty(id) {
    const result = await this.db.run(
      'UPDATE inventory_batches SET total_quantity = 0, case_quantity = 0 WHERE id = ?',
      [id]
    );

    if (result.changes === 0) {
      throw new AppError('Batch not found', 404, 'BATCH_NOT_FOUND');
    }

    if (this.activityLogger) {
      await this.activityLogger.log(
        'update',
        'batch',
        id,
        `Batch #${id}`,
        'Marked batch as empty'
      );
    }

    return { message: 'Batch marked as empty' };
  }
}

module.exports = BatchController;
