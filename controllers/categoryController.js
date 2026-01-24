/**
 * Category Controller
 * Business logic for category operations
 */

class CategoryController {
  constructor(db, activityLogger) {
    this.db = db;
    this.activityLogger = activityLogger;
  }

  async getAllCategories() {
    const query = `
      SELECT c.*, COUNT(DISTINCT p.id) as product_count,
             COALESCE(SUM(ib.total_quantity), 0) as total_items
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      LEFT JOIN inventory_batches ib ON p.id = ib.product_id
      GROUP BY c.id
      ORDER BY c.sort_order, c.name
    `;
    return await this.db.all(query, []);
  }

  async getCategoryById(id) {
    const query = `
      SELECT c.*, COUNT(DISTINCT p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      WHERE c.id = ?
      GROUP BY c.id
    `;
    return await this.db.get(query, [id]);
  }

  async createCategory(categoryData, username) {
    const { name, description, color, icon, sort_order } = categoryData;
    
    const result = await this.db.run(
      `INSERT INTO categories (name, description, color, icon, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      [name, description || '', color || '#6366f1', icon || 'box', sort_order || 0]
    );

    await this.activityLogger.log('category', result.lastID, 'created', username, { name });
    return await this.getCategoryById(result.lastID);
  }

  async updateCategory(id, categoryData, username) {
    const { name, description, color, icon, sort_order } = categoryData;
    
    await this.db.run(
      `UPDATE categories 
       SET name = ?, description = ?, color = ?, icon = ?, sort_order = ?
       WHERE id = ?`,
      [name, description || '', color || '#6366f1', icon || 'box', sort_order || 0, id]
    );

    await this.activityLogger.log('category', id, 'updated', username, { name });
    return await this.getCategoryById(id);
  }

  async deleteCategory(id, username) {
    const category = await this.getCategoryById(id);
    if (!category) return null;

    if (category.product_count > 0) {
      throw new Error('Cannot delete category with associated products');
    }

    await this.db.run('DELETE FROM categories WHERE id = ?', [id]);
    await this.activityLogger.log('category', id, 'deleted', username, { name: category.name });
    
    return category;
  }

  async reorderCategories(categoryOrders, username) {
    for (const { id, sort_order } of categoryOrders) {
      await this.db.run(
        'UPDATE categories SET sort_order = ? WHERE id = ?',
        [sort_order, id]
      );
    }

    await this.activityLogger.log('category', 0, 'reordered', username, {
      count: categoryOrders.length
    });

    return await this.getAllCategories();
  }
}

module.exports = CategoryController;
