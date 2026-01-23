/**
 * Supplier Controller
 * Phase 2: Business logic for supplier management
 */

const { AppError } = require('../middleware/errorHandler');

class SupplierController {
  constructor(db, activityLogger) {
    this.db = db;
    this.activityLogger = activityLogger;
  }

  async getSuppliers() {
    return await this.db.all('SELECT * FROM suppliers ORDER BY name', []);
  }

  async createSupplier(data) {
    const { name, contact_name, phone, email, address, notes, is_active } = data;
    
    if (!name || !name.trim()) {
      throw new AppError('Supplier name is required', 400, 'VALIDATION_ERROR');
    }

    try {
      const result = await this.db.run(
        `INSERT INTO suppliers (name, contact_name, phone, email, address, notes, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name.trim(), contact_name || '', phone || '', email || '', address || '', notes || '', is_active !== undefined ? is_active : 1]
      );

      if (this.activityLogger) {
        await this.activityLogger.log('create', 'supplier', result.lastID, name, `Created supplier: ${name}`);
      }

      return { id: result.lastID, message: 'Supplier created successfully' };
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint')) {
        throw new AppError('Supplier name already exists', 409, 'DUPLICATE_NAME');
      }
      throw err;
    }
  }

  async updateSupplier(id, data) {
    const { name, contact_name, phone, email, address, notes, is_active } = data;
    
    if (!name || !name.trim()) {
      throw new AppError('Supplier name is required', 400, 'VALIDATION_ERROR');
    }

    try {
      const result = await this.db.run(
        `UPDATE suppliers SET name = ?, contact_name = ?, phone = ?, email = ?, address = ?, notes = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [name.trim(), contact_name || '', phone || '', email || '', address || '', notes || '', is_active !== undefined ? is_active : 1, id]
      );

      if (result.changes === 0) {
        throw new AppError('Supplier not found', 404, 'SUPPLIER_NOT_FOUND');
      }

      if (this.activityLogger) {
        await this.activityLogger.log('update', 'supplier', id, name, `Updated supplier: ${name}`);
      }

      return { message: 'Supplier updated successfully' };
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint')) {
        throw new AppError('Supplier name already exists', 409, 'DUPLICATE_NAME');
      }
      throw err;
    }
  }

  async deleteSupplier(id) {
    // Check if any products use this supplier
    const check = await this.db.get('SELECT COUNT(*) as count FROM products WHERE supplier_id = ?', [id]);
    
    if (check.count > 0) {
      throw new AppError(
        `Cannot delete supplier. ${check.count} product(s) are using this supplier. Please reassign them first.`,
        400,
        'SUPPLIER_IN_USE'
      );
    }

    const supplier = await this.db.get('SELECT name FROM suppliers WHERE id = ?', [id]);
    const supplierName = supplier ? supplier.name : 'Unknown';

    const result = await this.db.run('DELETE FROM suppliers WHERE id = ?', [id]);

    if (result.changes === 0) {
      throw new AppError('Supplier not found', 404, 'SUPPLIER_NOT_FOUND');
    }

    if (this.activityLogger) {
      await this.activityLogger.log('delete', 'supplier', id, supplierName, `Deleted supplier: ${supplierName}`);
    }

    return { message: 'Supplier deleted successfully' };
  }
}

module.exports = SupplierController;
