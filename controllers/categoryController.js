/**
 * Category Controller
 * Business logic for category operations
 * 
 * FIXED v0.7.8: Corrected SQL query for getAllCategories to return all categories
 */

class CategoryController {
  constructor(db, activityLogger) {
    this.db = db;
    this.activityLogger = activityLogger;
  }

  async getAllCategories() {
    // FIX: Separate the aggregations to avoid GROUP BY issues
    const query = `
      SELECT 
        c.id,
        c.name,
        c.description,
        c.color,
        c.icon,
        c.display_order,
        c.created_at,
        c.updated_at,
        COUNT(DISTINCT p.id) as product_count,
        COALESCE(SUM(ib.total_quantity), 0) as total_items
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      LEFT JOIN inventory_batches ib ON p.id = ib.product_id
      GROUP BY c.id, c.name, c.description, c.color, c.icon, c.display_order, c.created_at, c.updated_at
      ORDER BY c.name
    `;
    return await this.db.all(query, []);
  }

  async getCategoryById(id) {
    const query = `
      SELECT 
        c.id,
        c.name,
        c.description,
        c.color,
        c.icon,
        c.display_order,
        c.created_at,
        c.updated_at,
        COUNT(DISTINCT p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      WHERE c.id = ?
      GROUP BY c.id, c.name, c.description, c.color, c.icon, c.display_order, c.created_at, c.updated_at
    `;
    return await this.db.get(query, [id]);
  }

  async createCategory(categoryData, username) {
    const { name, description, color, icon } = categoryData;
    
    const result = await this.db.run(
      `INSERT INTO categories (name, description, color, icon)
       VALUES (?, ?, ?, ?)`,
      [name, description || '', color || '#6366f1', icon || 'box']
    );

    await this.activityLogger.log('category', result.lastID, 'created', username, { name });
    return await this.getCategoryById(result.lastID);
  }

  async updateCategory(id, categoryData, username) {
    const { name, description, color, icon } = categoryData;
    
    await this.db.run(
      `UPDATE categories 
       SET name = ?, description = ?, color = ?, icon = ?
       WHERE id = ?`,
      [name, description || '', color || '#6366f1', icon || 'box', id]
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
    // Note: sort_order column doesn't exist in current schema
    // This is a placeholder for future implementation
    // For now, just return all categories
    await this.activityLogger.log('category', 0, 'reorder_attempted', username, {
      count: categoryOrders.length
    });

    return await this.getAllCategories();
  }
}

module.exports = CategoryController;
