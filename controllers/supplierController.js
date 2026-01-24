/**
 * Supplier Controller
 * Business logic for supplier operations
 */

class SupplierController {
  constructor(db, activityLogger) {
    this.db = db;
    this.activityLogger = activityLogger;
  }

  async getAllSuppliers() {
    const query = `
      SELECT s.*, COUNT(DISTINCT p.id) as product_count,
             COALESCE(SUM(ib.total_quantity), 0) as total_items
      FROM suppliers s
      LEFT JOIN products p ON s.id = p.supplier_id
      LEFT JOIN inventory_batches ib ON p.id = ib.product_id
      GROUP BY s.id
      ORDER BY s.name
    `;
    return await this.db.all(query, []);
  }

  async getActiveSuppliers() {
    const query = `
      SELECT s.*, COUNT(DISTINCT p.id) as product_count
      FROM suppliers s
      LEFT JOIN products p ON s.id = p.supplier_id
      WHERE s.is_active = 1
      GROUP BY s.id
      ORDER BY s.name
    `;
    return await this.db.all(query, []);
  }

  async getSupplierById(id) {
    const query = `
      SELECT s.*, COUNT(DISTINCT p.id) as product_count
      FROM suppliers s
      LEFT JOIN products p ON s.id = p.supplier_id
      WHERE s.id = ?
      GROUP BY s.id
    `;
    return await this.db.get(query, [id]);
  }

  async createSupplier(supplierData, username) {
    const { name, contact, email, phone, address, notes } = supplierData;
    
    const result = await this.db.run(
      `INSERT INTO suppliers (name, contact, email, phone, address, notes, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [name, contact || '', email || '', phone || '', address || '', notes || '']
    );

    await this.activityLogger.log('supplier', result.lastID, 'created', username, { name });
    return await this.getSupplierById(result.lastID);
  }

  async updateSupplier(id, supplierData, username) {
    const { name, contact, email, phone, address, notes, is_active } = supplierData;
    
    await this.db.run(
      `UPDATE suppliers 
       SET name = ?, contact = ?, email = ?, phone = ?, address = ?, notes = ?, is_active = ?
       WHERE id = ?`,
      [name, contact || '', email || '', phone || '', address || '', notes || '', 
       is_active !== undefined ? is_active : 1, id]
    );

    await this.activityLogger.log('supplier', id, 'updated', username, { name });
    return await this.getSupplierById(id);
  }

  async deleteSupplier(id, username) {
    const supplier = await this.getSupplierById(id);
    if (!supplier) return null;

    if (supplier.product_count > 0) {
      throw new Error('Cannot delete supplier with associated products');
    }

    await this.db.run('DELETE FROM suppliers WHERE id = ?', [id]);
    await this.activityLogger.log('supplier', id, 'deleted', username, { name: supplier.name });
    
    return supplier;
  }

  async toggleSupplierStatus(id, username) {
    const supplier = await this.getSupplierById(id);
    if (!supplier) return null;

    const newStatus = supplier.is_active ? 0 : 1;
    await this.db.run('UPDATE suppliers SET is_active = ? WHERE id = ?', [newStatus, id]);
    
    await this.activityLogger.log('supplier', id, newStatus ? 'activated' : 'deactivated', username, {
      name: supplier.name
    });

    return await this.getSupplierById(id);
  }
}

module.exports = SupplierController;
