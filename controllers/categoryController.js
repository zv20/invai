/**
 * Category Controller
 * Phase 2: Business logic for category management
 */

const { AppError } = require('../middleware/errorHandler');

class CategoryController {
  constructor(db, activityLogger) {
    this.db = db;
    this.activityLogger = activityLogger;
  }

  async getCategories() {
    return await this.db.all('SELECT * FROM categories ORDER BY display_order, name', []);
  }

  async createCategory(data) {
    const { name, description, color, icon } = data;
    
    if (!name || !name.trim()) {
      throw new AppError('Category name is required', 400, 'VALIDATION_ERROR');
    }

    try {
      const result = await this.db.run(
        `INSERT INTO categories (name, description, color, icon) VALUES (?, ?, ?, ?)`,
        [name.trim(), description || '', color || '#9333ea', icon || '📦']
      );

      if (this.activityLogger) {
        await this.activityLogger.log('create', 'category', result.lastID, name, `Created category: ${name}`);
      }

      return { id: result.lastID, message: 'Category created successfully' };
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint')) {
        throw new AppError('Category name already exists', 409, 'DUPLICATE_NAME');
      }
      throw err;
    }
  }

  async updateCategory(id, data) {
    const { name, description, color, icon, display_order } = data;
    
    if (!name || !name.trim()) {
      throw new AppError('Category name is required', 400, 'VALIDATION_ERROR');
    }

    try {
      const result = await this.db.run(
        `UPDATE categories SET name = ?, description = ?, color = ?, icon = ?, display_order = COALESCE(?, display_order), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [name.trim(), description || '', color || '#9333ea', icon || '📦', display_order, id]
      );

      if (result.changes === 0) {
        throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
      }

      if (this.activityLogger) {
        await this.activityLogger.log('update', 'category', id, name, `Updated category: ${name}`);
      }

      return { message: 'Category updated successfully' };
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint')) {
        throw new AppError('Category name already exists', 409, 'DUPLICATE_NAME');
      }
      throw err;
    }
  }

  async deleteCategory(id) {
    // Check if any products use this category
    const check = await this.db.get('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [id]);
    
    if (check.count > 0) {
      throw new AppError(
        `Cannot delete category. ${check.count} product(s) are using this category. Please reassign them first.`,
        400,
        'CATEGORY_IN_USE'
      );
    }

    const category = await this.db.get('SELECT name FROM categories WHERE id = ?', [id]);
    const categoryName = category ? category.name : 'Unknown';

    const result = await this.db.run('DELETE FROM categories WHERE id = ?', [id]);

    if (result.changes === 0) {
      throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
    }

    if (this.activityLogger) {
      await this.activityLogger.log('delete', 'category', id, categoryName, `Deleted category: ${categoryName}`);
    }

    return { message: 'Category deleted successfully' };
  }
}

module.exports = CategoryController;
