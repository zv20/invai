/**
 * Product Controller
 * Business logic for product operations
 */

class ProductController {
  constructor(db, activityLogger) {
    this.db = db;
    this.activityLogger = activityLogger;
  }

  async getAllProducts() {
    const query = `
      SELECT p.*, c.name as category_name, c.color as category_color, c.icon as category_icon,
             s.name as supplier_name, s.contact_name as supplier_contact,
             COALESCE(SUM(ib.total_quantity), 0) as total_quantity,
             COUNT(ib.id) as batch_count,
             MIN(ib.expiry_date) as earliest_expiry
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN inventory_batches ib ON p.id = ib.product_id
      GROUP BY p.id
      ORDER BY p.name
    `;
    return await this.db.all(query, []);
  }

  async getProductById(id) {
    const query = `
      SELECT p.*, c.name as category_name, c.color as category_color, c.icon as category_icon,
             s.name as supplier_name, s.contact_name as supplier_contact,
             COALESCE(SUM(ib.total_quantity), 0) as total_quantity,
             COUNT(ib.id) as batch_count
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN inventory_batches ib ON p.id = ib.product_id
      WHERE p.id = ?
      GROUP BY p.id
    `;
    return await this.db.get(query, [id]);
  }

  async createProduct(productData, username) {
    const { name, inhouse_number, barcode, brand, supplier_id, items_per_case, cost_per_case, category_id, reorder_point, notes } = productData;
    
    const result = await this.db.run(
      `INSERT INTO products (name, inhouse_number, barcode, brand, supplier_id, items_per_case, cost_per_case, category_id, reorder_point, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, inhouse_number || null, barcode || null, brand || null, supplier_id || null, 
       items_per_case || 1, cost_per_case || 0, category_id || null, reorder_point || 0, notes || '']
    );

    await this.activityLogger.log('product', result.lastID, 'created', username, { name });
    return await this.getProductById(result.lastID);
  }

  async updateProduct(id, productData, username) {
    const { name, inhouse_number, barcode, brand, supplier_id, items_per_case, cost_per_case, category_id, reorder_point, notes } = productData;
    
    await this.db.run(
      `UPDATE products 
       SET name = ?, inhouse_number = ?, barcode = ?, brand = ?, supplier_id = ?, 
           items_per_case = ?, cost_per_case = ?, category_id = ?, reorder_point = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, inhouse_number || null, barcode || null, brand || null, supplier_id || null,
       items_per_case || 1, cost_per_case || 0, category_id || null, reorder_point || 0, notes || '', id]
    );

    await this.activityLogger.log('product', id, 'updated', username, { name });
    return await this.getProductById(id);
  }

  async deleteProduct(id, username) {
    const product = await this.getProductById(id);
    if (!product) return null;

    await this.db.run('DELETE FROM products WHERE id = ?', [id]);
    await this.activityLogger.log('product', id, 'deleted', username, { name: product.name });
    
    return product;
  }

  async searchProducts(searchTerm) {
    const query = `
      SELECT p.*, c.name as category_name, s.name as supplier_name,
             COALESCE(SUM(ib.total_quantity), 0) as total_quantity
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN inventory_batches ib ON p.id = ib.product_id
      WHERE p.name LIKE ? OR p.barcode LIKE ? OR p.brand LIKE ? OR s.name LIKE ? OR p.inhouse_number LIKE ?
      GROUP BY p.id
      ORDER BY p.name
    `;
    const term = `%${searchTerm}%`;
    return await this.db.all(query, [term, term, term, term, term]);
  }

  async bulkCreateProducts(productsData, username) {
    const results = [];
    
    for (const productData of productsData) {
      try {
        const product = await this.createProduct(productData, username);
        results.push({ success: true, product });
      } catch (error) {
        results.push({ success: false, error: error.message, data: productData });
      }
    }
    
    return results;
  }
}

module.exports = ProductController;
