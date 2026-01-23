/**
 * Product Controller
 * Phase 2: Business logic separated from routes
 * Phase 1: Async/await throughout
 */

const { AppError } = require('../middleware/errorHandler');

class ProductController {
  constructor(db, activityLogger, cache) {
    this.db = db;
    this.activityLogger = activityLogger;
    this.cache = cache;
  }

  async getProducts(search) {
    let query = `
      SELECT p.*, c.name as category_name, c.color as category_color, c.icon as category_icon,
             s.name as supplier_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE 1=1
    `;
    const params = [];
    
    if (search) {
      query += ' AND (p.name LIKE ? OR p.barcode LIKE ? OR p.brand LIKE ? OR s.name LIKE ? OR p.inhouse_number LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    query += ' ORDER BY p.name';
    return await this.db.all(query, params);
  }

  async getProductById(id) {
    const product = await this.db.get(`
      SELECT p.*, c.name as category_name, c.color as category_color, c.icon as category_icon,
             s.name as supplier_name, s.phone as supplier_phone, s.email as supplier_email
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = ?
    `, [id]);
    
    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }
    
    return product;
  }

  async createProduct(data) {
    const { name, inhouse_number, barcode, brand, supplier_id, category_id, items_per_case, 
            cost_per_case, notes, product_image, allergen_info, nutritional_data, storage_temp } = data;
    
    if (!name) {
      throw new AppError('Product name is required', 400, 'VALIDATION_ERROR');
    }

    try {
      const result = await this.db.run(
        `INSERT INTO products (name, inhouse_number, barcode, brand, supplier_id, category_id, items_per_case, cost_per_case, notes,
                              product_image, allergen_info, nutritional_data, storage_temp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, inhouse_number || null, barcode || null, brand || null, supplier_id || null, category_id || null,
         items_per_case || null, cost_per_case || 0, notes || '', product_image || null, allergen_info || null,
         nutritional_data || null, storage_temp || null]
      );

      if (this.activityLogger) {
        await this.activityLogger.log('create', 'product', result.lastID, name, `Created product: ${name}`);
      }

      this.cache.invalidatePattern('products');
      return { id: result.lastID, message: 'Product added successfully' };
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint')) {
        throw new AppError('A product with this barcode already exists', 409, 'DUPLICATE_BARCODE');
      }
      throw err;
    }
  }

  async updateProduct(id, data) {
    const { name, inhouse_number, barcode, brand, supplier_id, category_id, items_per_case, cost_per_case, notes,
            product_image, allergen_info, nutritional_data, storage_temp } = data;

    const result = await this.db.run(
      `UPDATE products
       SET name = ?, inhouse_number = ?, barcode = ?, brand = ?, supplier_id = ?, category_id = ?,
           items_per_case = ?, cost_per_case = ?, notes = ?, product_image = ?, allergen_info = ?,
           nutritional_data = ?, storage_temp = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, inhouse_number || null, barcode || null, brand || null, supplier_id || null, category_id || null,
       items_per_case || null, cost_per_case || 0, notes || '', product_image || null, allergen_info || null,
       nutritional_data || null, storage_temp || null, id]
    );

    if (result.changes === 0) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    if (this.activityLogger) {
      await this.activityLogger.log('update', 'product', id, name, `Updated product: ${name}`);
    }

    this.cache.invalidatePattern('products');
    return { message: 'Product updated successfully' };
  }

  async deleteProduct(id) {
    const product = await this.db.get('SELECT name FROM products WHERE id = ?', [id]);
    const productName = product ? product.name : 'Unknown';

    const result = await this.db.run('DELETE FROM products WHERE id = ?', [id]);

    if (result.changes === 0) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    if (this.activityLogger) {
      await this.activityLogger.log('delete', 'product', id, productName, `Deleted product: ${productName}`);
    }

    this.cache.invalidatePattern('products');
    return { message: 'Product deleted successfully' };
  }

  async setFavorite(id, is_favorite) {
    const result = await this.db.run(
      'UPDATE products SET is_favorite = ? WHERE id = ?',
      [is_favorite ? 1 : 0, id]
    );

    if (result.changes === 0) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    if (this.activityLogger) {
      await this.activityLogger.log(
        'update',
        'product',
        id,
        'Product',
        is_favorite ? 'Added to favorites' : 'Removed from favorites'
      );
    }

    this.cache.invalidatePattern('products');
    return { success: true, is_favorite };
  }
}

module.exports = ProductController;
